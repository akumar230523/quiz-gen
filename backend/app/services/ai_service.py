"""
AI Service – All Gemini API interactions for QuizGen.
Handles question generation, answer evaluation, performance analysis,
personalized recommendations, and AI tutoring.

Quota / error handling:
  - Detects 429 quota-exceeded errors and shows a clear, honest message.
  - On quota exhaustion the call is retried on a fallback model
    (GEMINI_FALLBACK_MODEL, default: gemini-1.5-flash) before giving up.
  - Exponential back-off for transient rate-limit (429) errors.
  - All user-facing error strings now distinguish "no API key" from
    "quota exceeded" so the UI message is always accurate.
"""

import json
import re
import os
import time
from datetime import datetime
import google.generativeai as genai

from .question_bank import get_curated_mcq, get_curated_for_topic

# ── Cached model instances ────────────────────────────────────
_model = None
_model_fingerprint = ""
_fallback_model = None
_fallback_fingerprint = ""
_vertex_model = None
_vertex_fingerprint = ""


# ─────────────────────────────────────────────────────────────
# Config helpers
# ─────────────────────────────────────────────────────────────

def _gemini_model_name() -> str:
    return (os.getenv("GEMINI_MODEL") or "gemini-2.0-flash").strip()


def _gemini_fallback_name() -> str:
    """
    Secondary model tried when the primary quota is exhausted.
    gemini-1.5-flash has a separate (and often higher) free-tier quota.
    Override with GEMINI_FALLBACK_MODEL in .env if you prefer another model.
    """
    return (os.getenv("GEMINI_FALLBACK_MODEL") or "gemini-1.5-flash").strip()


def _vertex_model_name() -> str:
    return (
        os.getenv("GEMINI_VERTEX_MODEL")
        or os.getenv("GEMINI_MODEL")
        or "gemini-1.5-flash-001"
    ).strip()


def _ai_backend() -> str:
    if os.getenv("GEMINI_USE_VERTEX", "").lower() in ("1", "true", "yes"):
        return "vertex"
    if os.getenv("GEMINI_API_KEY", "").strip():
        return "api_key"
    project = os.getenv("GCLOUD_PROJECT_ID", "").strip()
    creds = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")
    if project and creds and os.path.isfile(creds):
        return "vertex"
    raise RuntimeError(
        "No AI credentials found. "
        "Set GEMINI_API_KEY (Google AI Studio) or "
        "GCLOUD_PROJECT_ID + GOOGLE_APPLICATION_CREDENTIALS (Vertex AI)."
    )


# ─────────────────────────────────────────────────────────────
# Quota / rate-limit detection
# ─────────────────────────────────────────────────────────────

def _is_quota_error(exc: Exception) -> bool:
    """Return True when the error is a 429 / quota-exceeded response."""
    msg = str(exc).lower()
    return (
        "429" in msg
        or "quota" in msg
        or "rate" in msg
        or "resource_exhausted" in msg
        or "exceeded" in msg
    )


def _quota_error_message() -> str:
    model = _gemini_model_name()
    fallback = _gemini_fallback_name()
    return (
        f"The Gemini free-tier quota for '{model}' has been exhausted for today. "
        f"The system tried the fallback model '{fallback}' automatically but it is "
        f"also over quota. Options: (1) wait until the quota resets tomorrow, "
        f"(2) set GEMINI_MODEL=gemini-1.5-pro in your .env and restart the server, "
        f"or (3) upgrade to a paid Google AI Studio plan at https://ai.google.dev/pricing."
    )


# ─────────────────────────────────────────────────────────────
# Model constructors
# ─────────────────────────────────────────────────────────────

def _get_api_key_model(model_name: str | None = None):
    """Google AI Studio / Generative Language API – primary model."""
    global _model, _model_fingerprint
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError(
            "GEMINI_API_KEY is not set. Add it to your backend .env file."
        )
    name = model_name or _gemini_model_name()
    fp = f"api:{api_key[:8]}:{name}"
    if _model is None or _model_fingerprint != fp:
        genai.configure(api_key=api_key)
        _model = genai.GenerativeModel(name)
        _model_fingerprint = fp
    return _model


def _get_fallback_model():
    """Secondary Google AI Studio model, used when primary is quota-exhausted."""
    global _fallback_model, _fallback_fingerprint
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not set.")
    name = _gemini_fallback_name()
    fp = f"api:{api_key[:8]}:fallback:{name}"
    if _fallback_model is None or _fallback_fingerprint != fp:
        genai.configure(api_key=api_key)
        _fallback_model = genai.GenerativeModel(name)
        _fallback_fingerprint = fp
    return _fallback_model


def _get_vertex_model():
    """Vertex AI Gemini using GOOGLE_APPLICATION_CREDENTIALS."""
    global _vertex_model, _vertex_fingerprint
    import vertexai
    from vertexai.generative_models import GenerativeModel

    project = os.getenv("GCLOUD_PROJECT_ID", "").strip()
    location = os.getenv("GEMINI_LOCATION", "us-central1").strip()
    creds = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")
    name = _vertex_model_name()
    fp = f"vertex:{project}:{location}:{name}:{creds}"
    if _vertex_model is None or _vertex_fingerprint != fp:
        if not project or not creds or not os.path.isfile(creds):
            raise RuntimeError(
                "Vertex AI requires GCLOUD_PROJECT_ID and a valid "
                "GOOGLE_APPLICATION_CREDENTIALS file."
            )
        vertexai.init(project=project, location=location)
        _vertex_model = GenerativeModel(name)
        _vertex_fingerprint = fp
    return _vertex_model


# ─────────────────────────────────────────────────────────────
# JSON generation config
# ─────────────────────────────────────────────────────────────

def _gen_config_json_genai():
    try:
        return genai.types.GenerationConfig(
            response_mime_type="application/json",
            temperature=0.65,
        )
    except Exception:
        return None


def _gen_config_json_vertex():
    try:
        from vertexai.generative_models import GenerationConfig
        return GenerationConfig(response_mime_type="application/json", temperature=0.65)
    except Exception:
        return None


# ─────────────────────────────────────────────────────────────
# Core call helpers with retry + fallback
# ─────────────────────────────────────────────────────────────

def _call_model_once(model, prompt: str, gen_cfg) -> str:
    """Fire a single generate_content call; return stripped text or raise."""
    kwargs = {}
    if gen_cfg is not None:
        kwargs["generation_config"] = gen_cfg
    resp = model.generate_content(prompt, **kwargs)
    text = getattr(resp, "text", None)
    if text:
        return text.strip()
    raise RuntimeError("Empty or blocked response from Gemini (no text parts)")


def _api_key_generate(prompt: str) -> str:
    """
    Try primary model with up to 2 retries (exponential back-off),
    then fall back to the secondary model once.
    Raises a clear RuntimeError on permanent failure.
    """
    cfg = _gen_config_json_genai()

    # ── Primary model: up to 3 attempts ─────────────────────
    primary = _get_api_key_model()
    last_err = None
    for attempt in range(3):
        try:
            return _call_model_once(primary, prompt, cfg)
        except Exception as e:
            last_err = e
            if _is_quota_error(e):
                if attempt < 2:
                    wait = 2 ** attempt  # 1 s, 2 s
                    print(f"[AI] Quota hit on primary (attempt {attempt+1}/3), "
                          f"waiting {wait}s … {e}")
                    time.sleep(wait)
                else:
                    print(f"[AI] Primary model quota exhausted after 3 attempts. "
                          f"Trying fallback model …")
                    break   # move to fallback
            else:
                # Non-quota error: no point retrying with same model
                print(f"[AI] Primary model error (non-quota): {e}")
                break

    # ── Fallback model: one attempt ──────────────────────────
    if last_err is not None and _is_quota_error(last_err):
        fallback_name = _gemini_fallback_name()
        primary_name  = _gemini_model_name()
        if fallback_name != primary_name:
            try:
                fb_model = _get_fallback_model()
                print(f"[AI] Trying fallback model: {fallback_name}")
                return _call_model_once(fb_model, prompt, cfg)
            except Exception as fb_err:
                if _is_quota_error(fb_err):
                    raise RuntimeError(_quota_error_message()) from fb_err
                raise fb_err

    raise last_err or RuntimeError("Gemini request failed")


def _vertex_generate(prompt: str) -> str:
    model = _get_vertex_model()
    cfg = _gen_config_json_vertex()
    last_err = None
    for attempt in range(3):
        try:
            return _call_model_once(model, prompt, cfg)
        except Exception as e:
            last_err = e
            if _is_quota_error(e) and attempt < 2:
                time.sleep(2 ** attempt)
                continue
            break
    raise last_err or RuntimeError("Vertex Gemini request failed")


def _call(prompt: str) -> str:
    backend = _ai_backend()
    if backend == "vertex":
        return _vertex_generate(prompt)
    return _api_key_generate(prompt)


# ─────────────────────────────────────────────────────────────
# JSON parsing
# ─────────────────────────────────────────────────────────────

def _parse_json(raw: str) -> dict | list:
    """Strip markdown fences, extract first JSON array/object, parse."""
    if not raw or not str(raw).strip():
        raise ValueError("Empty model response")
    clean = re.sub(r"```(?:json)?\s*", "", str(raw)).replace("```", "").strip()
    try:
        return json.loads(clean)
    except json.JSONDecodeError:
        pass
    for open_ch, close_ch in [("[", "]"), ("{", "}")]:
        start = clean.find(open_ch)
        if start == -1:
            continue
        depth = 0
        for i in range(start, len(clean)):
            c = clean[i]
            if c == open_ch:
                depth += 1
            elif c == close_ch:
                depth -= 1
                if depth == 0:
                    return json.loads(clean[start: i + 1])
    raise ValueError("Could not parse JSON from model output")


def _try_json(obj):
    try:
        return json.dumps(obj, indent=2)
    except Exception:
        return str(obj)


# ─────────────────────────────────────────────────────────────
# Shared user-facing error message builder
# ─────────────────────────────────────────────────────────────

def _ai_unavailable_msg(exc: Exception, feature: str = "AI") -> str:
    """
    Return a honest, user-friendly message depending on error type.
    Never says 'invalid key' when the real problem is quota exhaustion.
    """
    if _is_quota_error(exc):
        model = _gemini_model_name()
        return (
            f"The AI service has hit its daily free-tier request limit for '{model}'. "
            "This resets at midnight Pacific time. "
            "In the meantime the platform will use built-in content where possible. "
            "To remove this limit, upgrade your Google AI Studio plan at "
            "https://ai.google.dev/pricing or set GEMINI_MODEL=gemini-1.5-pro in your .env."
        )
    msg = str(exc)
    if "GEMINI_API_KEY" in msg or "not set" in msg.lower() or "not configured" in msg.lower():
        return (
            f"The {feature} service is unavailable because GEMINI_API_KEY is missing. "
            "Ask your administrator to add it to the server .env file."
        )
    return (
        f"The {feature} service is temporarily unavailable ({type(exc).__name__}). "
        "Please try again in a few minutes."
    )


# ─────────────────────────────────────────────────────────────
# 1. Question Generation
# ─────────────────────────────────────────────────────────────

def _sanitize_questions(questions: list, topic: str, q_type: str) -> list[dict]:
    out = []
    for i, q in enumerate(questions):
        if not isinstance(q, dict):
            continue
        q.setdefault("id", f"q_{i}_{datetime.utcnow().timestamp():.0f}")
        q.setdefault("marks", 1)
        q.setdefault("explanation", "")
        q.setdefault("topic", topic)
        if q_type == "mcq":
            if not isinstance(q.get("options"), list) or len(q["options"]) < 2:
                q["options"] = ["Option A", "Option B", "Option C", "Option D"]
            ca = q.get("correctAnswer", 0)
            if not isinstance(ca, int) or ca >= len(q["options"]):
                q["correctAnswer"] = 0
        else:
            q["options"] = []
            q["correctAnswer"] = None
        out.append(q)
    return out


def generate_questions(
    topic: str,
    q_type: str = "mcq",
    difficulty: str = "medium",
    count: int = 10,
    extra_instructions: str = "",
) -> list[dict]:
    """Generate exam questions using Gemini AI; falls back to curated bank if AI fails."""
    prompt = f"""
You are a professional exam paper setter for competitive and academic exams.

Generate {count} high-quality {q_type.upper()} questions about:
Topic / Exam: {topic}
Difficulty: {difficulty}
Extra Instructions: {extra_instructions}

Return ONLY valid JSON array, no markdown, no extra text:
[
  {{
    "id": "unique-string",
    "type": "{q_type}",
    "text": "Full question text here",
    "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
    "correctAnswer": 0,
    "explanation": "Why the correct answer is correct",
    "topic": "Sub-topic name",
    "difficulty": "{difficulty}",
    "marks": 1
  }}
]

Rules:
- For MCQ: options array has exactly 4 items, correctAnswer is 0-based index
- For descriptive: options=[], correctAnswer=null
- Questions must be factually accurate and exam-appropriate
- Vary cognitive levels (recall, application, analysis)
"""
    try:
        raw = _call(prompt)
        questions = _parse_json(raw)
        if not isinstance(questions, list):
            raise ValueError("Expected JSON array of questions")
        questions = _sanitize_questions(questions, topic, q_type)
        if not questions:
            raise ValueError("Model returned no usable questions")
        return questions
    except Exception as e:
        print(f"[AI] Question generation failed: {e}")
        if q_type != "mcq":
            return []
        return get_curated_for_topic(topic, difficulty, count)


def generate_questions_for_exam(
    exam: dict,
    country_name: str = "",
    q_type: str = "mcq",
    difficulty: str = "medium",
    count: int = 10,
) -> dict:
    """Exam-aware generation with syllabus-style prompt."""
    name = (exam or {}).get("name") or "Practice Exam"
    desc = (exam or {}).get("description") or ""
    dur = (exam or {}).get("duration") or 60
    exam_diff = (exam or {}).get("difficulty") or difficulty

    prompt = f"""
You are an expert test designer for real high-stakes exams.

Create {count} original {q_type.upper()} questions aligned with this specific exam:
- Exam title: {name}
- Region / country context: {country_name or "International candidates"}
- How this exam is described officially: {desc}
- Typical session length (minutes): {dur}
- Exam baseline difficulty: {exam_diff}
- Requested difficulty for this session: {difficulty}

Requirements:
- Questions must look like authentic items students would see on "{name}".
- Cover multiple subtopics that this exam is known for.
- For MCQ: exactly 4 distinct options, one clearly correct, plausible distractors.
- Return ONLY a JSON array (no markdown), same schema as in generate_questions.
[
  {{
    "id": "q1",
    "type": "{q_type}",
    "text": "...",
    "options": ["...", "...", "...", "..."],
    "correctAnswer": 0,
    "explanation": "...",
    "topic": "subtopic",
    "difficulty": "{difficulty}",
    "marks": 1
  }}
]
"""
    try:
        raw = _call(prompt)
        questions = _parse_json(raw)
        if not isinstance(questions, list):
            raise ValueError("Expected JSON array")
        questions = _sanitize_questions(questions, name, q_type)
        if not questions:
            raise ValueError("No questions parsed")
        return {"questions": questions[:count], "source": "gemini", "ai_error": None}
    except Exception as e:
        err = str(e)
        print(f"[AI] Exam-specific question generation failed: {err}")
        if q_type != "mcq":
            return {"questions": [], "source": "none", "ai_error": err}
        bank = get_curated_mcq(name, difficulty, count)
        return {"questions": bank, "source": "bank", "ai_error": err}


# ─────────────────────────────────────────────────────────────
# 2. Online Test Generation (MCQ + Descriptive)
# ─────────────────────────────────────────────────────────────

def generate_full_test(exam_name: str, duration: int = 60) -> dict:
    """Generate a complete online test with MCQ and descriptive sections."""
    prompt = f"""
Create a comprehensive online examination for: {exam_name}
Duration: {duration} minutes

Return ONLY valid JSON:
{{
  "metadata": {{
    "exam_name": "{exam_name}",
    "total_questions": 15,
    "mcq_count": 10,
    "descriptive_count": 5,
    "total_marks": 50
  }},
  "sections": [
    {{
      "title": "Section A – Multiple Choice Questions",
      "type": "mcq",
      "marks_per_question": 2,
      "questions": [
        {{
          "id": "mcq_1",
          "text": "Question text",
          "options": ["A. Option", "B. Option", "C. Option", "D. Option"],
          "correctAnswer": 0,
          "explanation": "Explanation",
          "topic": "topic name",
          "difficulty": "medium",
          "marks": 2
        }}
      ]
    }},
    {{
      "title": "Section B – Descriptive Questions",
      "type": "descriptive",
      "marks_per_question": 6,
      "questions": [
        {{
          "id": "desc_1",
          "text": "Descriptive question text",
          "expected_answer": "Key points expected",
          "word_limit": 200,
          "topic": "topic name",
          "marks": 6
        }}
      ]
    }}
  ]
}}
"""
    try:
        raw = _call(prompt)
        return _parse_json(raw)
    except Exception as e:
        print(f"[AI] Full test generation failed: {e}")
        return {"error": str(e), "metadata": {"exam_name": exam_name}}


# ─────────────────────────────────────────────────────────────
# 3. Descriptive Answer Evaluation
# ─────────────────────────────────────────────────────────────

def evaluate_descriptive_answer(question: str, answer: str, max_marks: int = 10) -> dict:
    """Score a student's descriptive/essay answer."""
    prompt = f"""
You are an expert exam evaluator. Assess this student response fairly and constructively.

Question: {question}
Student Answer: {answer}
Maximum Marks: {max_marks}

Return ONLY valid JSON:
{{
  "score": <number 0-{max_marks}>,
  "percentage": <0-100>,
  "feedback": "Detailed constructive feedback (2-3 sentences)",
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["improvement 1", "improvement 2"],
  "key_concepts_covered": ["concept1", "concept2"],
  "missing_concepts": ["missing1"]
}}

Evaluation criteria:
- Accuracy and factual correctness
- Depth and completeness of answer
- Clarity of expression
- Relevance to the question
Be generous but fair. If answer is blank, score=0.
"""
    try:
        raw = _call(prompt)
        result = _parse_json(raw)
        result["score"] = min(max(float(result.get("score", 0)), 0), max_marks)
        return result
    except Exception as e:
        print(f"[AI] Descriptive evaluation failed: {e}")
        if not answer or len(answer.strip()) < 10:
            return {"score": 0, "percentage": 0, "feedback": "No answer provided.",
                    "strengths": [], "improvements": []}
        return {"score": round(max_marks * 0.5, 1), "percentage": 50,
                "feedback": "Answer evaluated automatically.", "strengths": [], "improvements": []}


# ─────────────────────────────────────────────────────────────
# 4. Comprehensive Exam Report
# ─────────────────────────────────────────────────────────────

def generate_exam_report_insights(
    exam_name: str,
    performance_data: dict,
    question_analysis: list,
) -> dict:
    """Generate AI-powered insights for an exam report."""
    prompt = f"""
You are an educational assessment expert. Analyse this student's exam performance.

Exam: {exam_name}
Performance Summary:
- Score: {performance_data.get('marks_percentage', 0):.1f}%
- Correct: {performance_data.get('correct_answers', 0)}/{performance_data.get('total_questions', 0)}
- Grade: {performance_data.get('grade', 'N/A')}
- Time efficiency: {performance_data.get('time_efficiency', 0):.0f}%

Question Analysis (first 5):
{json.dumps(question_analysis[:5], indent=2)}

Return ONLY valid JSON:
{{
  "performance_level": "Excellent|Very Good|Good|Satisfactory|Needs Improvement",
  "summary": "2-sentence overall assessment",
  "strengths": ["strength1", "strength2", "strength3"],
  "weaknesses": ["weakness1", "weakness2"],
  "topic_performance": [{{"topic": "X", "mastery": "high|medium|low"}}],
  "insights": [
    "Key insight about performance pattern 1",
    "Key insight about performance pattern 2",
    "Key insight about performance pattern 3"
  ],
  "recommendations": [
    "Specific actionable recommendation 1",
    "Specific actionable recommendation 2",
    "Specific actionable recommendation 3",
    "Specific actionable recommendation 4"
  ],
  "study_plan": {{
    "immediate": "What to do today",
    "short_term": "This week focus",
    "long_term": "Monthly strategy"
  }},
  "predicted_improvement": "If recommendations followed, expected score improvement range"
}}
"""
    try:
        raw = _call(prompt)
        return _parse_json(raw)
    except Exception as e:
        print(f"[AI] Report insights failed: {e}")
        pct = performance_data.get("marks_percentage", 0)
        level = "Excellent" if pct >= 85 else "Good" if pct >= 65 else "Needs Improvement"
        return {
            "performance_level": level,
            "summary": f"Student scored {pct:.1f}% on {exam_name}.",
            "strengths": [], "weaknesses": [],
            "insights": ["Review incorrect answers", "Practice similar questions"],
            "recommendations": ["Study the topics you missed", "Take practice tests"],
            "study_plan": {"immediate": "Review mistakes", "short_term": "Practice daily",
                           "long_term": "Consistent revision"},
        }


# ─────────────────────────────────────────────────────────────
# 5. Personalised Practice Generation
# ─────────────────────────────────────────────────────────────

def generate_personalised_practice(
    country: str,
    exam_type: str,
    weak_areas: list[str],
    strong_areas: list[str],
    target_score: int = 80,
    has_history: bool = False,
) -> dict:
    """Generate an AI-personalised practice session."""
    context = (
        f"Student's weak areas: {', '.join(weak_areas) if weak_areas else 'General'}\n"
        f"Student's strong areas: {', '.join(strong_areas) if strong_areas else 'General'}\n"
        f"Target score: {target_score}%\n"
        f"Has exam history: {has_history}"
    ) if has_history else "New student – create a comprehensive diagnostic session."

    prompt = f"""
You are an adaptive learning AI for {exam_type} exam preparation ({country}).
{context}

Create a personalised practice session (10-12 questions) that:
- Focuses 60% on weak areas for improvement
- Includes 30% moderate areas for consolidation
- Uses 10% strong areas for confidence building
- Progressively increases difficulty

Return ONLY valid JSON:
{{
  "session_title": "Personalised Practice – {exam_type}",
  "session_type": "adaptive",
  "personalization_note": "How this session is tailored to this student",
  "message": "Encouraging message to student",
  "total_questions": 10,
  "estimated_minutes": 20,
  "focus_topics": ["topic1", "topic2"],
  "questions": [
    {{
      "question_number": 1,
      "question_text": "Full question here",
      "topic": "Topic name",
      "difficulty": "Easy|Medium|Hard",
      "focus_area": "weakness|strength|consolidation",
      "learning_objective": "What this tests",
      "max_score": 5,
      "hints": ["Hint 1 if student gets stuck"]
    }}
  ]
}}
"""
    try:
        raw = _call(prompt)
        return _parse_json(raw)
    except Exception as e:
        print(f"[AI] Practice generation failed: {e}")
        return {"error": str(e), "session_title": f"Practice – {exam_type}", "questions": []}


# ─────────────────────────────────────────────────────────────
# 6. AI Tutor – Explain Concepts
# ─────────────────────────────────────────────────────────────

def explain_concept(concept: str, level: str = "intermediate") -> dict:
    """AI tutor explains a concept with examples."""
    prompt = f"""
You are a friendly AI tutor. Explain this concept clearly:

Concept: {concept}
Student Level: {level}

Return ONLY valid JSON:
{{
  "concept": "{concept}",
  "simple_explanation": "ELI5 explanation in 2-3 sentences",
  "detailed_explanation": "Comprehensive explanation with context",
  "key_points": ["point1", "point2", "point3"],
  "examples": ["Real-world example 1", "Example 2"],
  "common_mistakes": ["Mistake students often make 1"],
  "memory_tip": "Mnemonic or memory aid",
  "related_concepts": ["related1", "related2"],
  "practice_question": "A practice question to test understanding"
}}
"""
    try:
        raw = _call(prompt)
        return _parse_json(raw)
    except Exception as e:
        print(f"[AI] explain_concept failed: {e}")
        return {
            "concept": concept,
            "simple_explanation": _ai_unavailable_msg(e, "AI tutor"),
            "detailed_explanation": "",
            "key_points": [],
            "examples": [],
            "common_mistakes": [],
            "memory_tip": "",
            "related_concepts": [],
            "practice_question": "",
            "error": str(e),
            "ai_error": str(e),
            "quota_exceeded": _is_quota_error(e),
        }


# ─────────────────────────────────────────────────────────────
# 7. Performance Analytics
# ─────────────────────────────────────────────────────────────

def analyse_performance_trends(results: list[dict]) -> dict:
    """Analyse a student's historical performance for trends."""
    if not results:
        return {"trend": "no_data", "insights": [], "recommendations": []}

    summary = [{
        "exam":  r.get("exam_name", "Unknown"),
        "score": r.get("score", 0),
        "date":  r.get("submitted_at", ""),
    } for r in results[-10:]]

    prompt = f"""
Analyse this student's exam performance history:
{json.dumps(summary, indent=2)}

Return ONLY valid JSON:
{{
  "trend": "improving|declining|stable|inconsistent",
  "trend_description": "Human-readable description of trend",
  "average_score": <number>,
  "best_score": <number>,
  "consistency_score": <0-100, how consistent performance is>,
  "insights": ["Insight 1", "Insight 2", "Insight 3"],
  "recommendations": ["Action 1", "Action 2"],
  "risk_alert": null or "Warning message if student is at risk",
  "predicted_next_score": <number or null>
}}
"""
    try:
        raw = _call(prompt)
        return _parse_json(raw)
    except Exception as e:
        scores = [r.get("score", 0) for r in results]
        avg = sum(scores) / len(scores) if scores else 0
        return {
            "trend": "stable",
            "average_score": round(avg, 1),
            "insights": [f"Average score: {avg:.1f}%"],
            "recommendations": ["Continue practising regularly"],
        }


# ─────────────────────────────────────────────────────────────
# 8. AI Tutor — Multi-turn Chat
# ─────────────────────────────────────────────────────────────

def ai_tutor_chat(messages: list[dict], subject: str = "General") -> dict:
    """
    Multi-turn AI tutoring conversation.
    messages = [{"role": "user"|"assistant", "content": "..."}]
    """
    history_text = "\n".join(
        f"{'Student' if m['role'] == 'user' else 'Tutor'}: {m['content']}"
        for m in messages[-10:]
    )
    prompt = f"""
You are an expert, friendly AI tutor specialising in {subject}.
Your teaching style: Socratic questioning, step-by-step explanations,
real-world examples, encouraging but honest feedback.

Conversation so far:
{history_text}

Respond ONLY as the Tutor in the next turn. Be concise (max 4 sentences)
unless a detailed explanation is specifically needed.
Return ONLY valid JSON:
{{
  "reply": "Your tutor response here",
  "follow_up_question": "A Socratic follow-up to deepen understanding (or null)",
  "key_concept": "The main concept being discussed (or null)",
  "confidence_check": "Quick question to verify student understands (or null)"
}}
"""
    try:
        raw = _call(prompt)
        return _parse_json(raw)
    except Exception as e:
        print(f"[AI] Tutor chat failed: {e}")
        return {
            "reply": _ai_unavailable_msg(e, "AI tutor"),
            "follow_up_question": None,
            "key_concept": None,
            "confidence_check": None,
            "ai_error": str(e),
            "quota_exceeded": _is_quota_error(e),
        }


# ─────────────────────────────────────────────────────────────
# 9. Smart Content Recommendations
# ─────────────────────────────────────────────────────────────

def generate_smart_recommendations(
    weak_topics: list[str],
    strong_topics: list[str],
    exam_type: str,
    avg_score: float,
    learning_style: str = "visual",
) -> dict:
    """Generate personalised study resource recommendations."""
    prompt = f"""
You are an expert educational content curator.

Student Profile:
- Exam: {exam_type}
- Average Score: {avg_score:.1f}%
- Weak Topics: {', '.join(weak_topics) if weak_topics else 'General fundamentals'}
- Strong Topics: {', '.join(strong_topics) if strong_topics else 'N/A'}
- Learning Style Preference: {learning_style}

Generate a comprehensive set of personalised recommendations.
Return ONLY valid JSON:
{{
  "priority_topics": ["topic1", "topic2", "topic3"],
  "study_strategies": [
    {{
      "strategy": "Spaced Repetition",
      "description": "Review weak topics after 1 day, 3 days, 7 days, 21 days",
      "time_required": "15 min/day",
      "effectiveness": "high"
    }}
  ],
  "resources": [
    {{
      "type": "video|article|flashcard|exercise|mock_test",
      "title": "Resource title",
      "topic": "Topic it covers",
      "estimated_time": "20 min",
      "why_recommended": "Because this topic appears in 40% of exam questions",
      "difficulty": "beginner|intermediate|advanced"
    }}
  ],
  "weekly_plan": [
    {{"day": "Monday",    "focus": "Topic X – 30 min", "activity": "Flashcards + practice questions"}},
    {{"day": "Tuesday",   "focus": "Topic Y – 45 min", "activity": "Video + summary notes"}},
    {{"day": "Wednesday", "focus": "Topic Z – 30 min", "activity": "Mock test questions"}},
    {{"day": "Thursday",  "focus": "Review – 20 min",  "activity": "Spaced repetition"}},
    {{"day": "Friday",    "focus": "Topic X – 40 min", "activity": "Practice exam"}},
    {{"day": "Saturday",  "focus": "Mixed – 60 min",   "activity": "Full practice session"}},
    {{"day": "Sunday",    "focus": "Rest / light review – 15 min", "activity": "Mental recap"}}
  ],
  "milestone": "Achievable goal for the next 2 weeks",
  "motivational_message": "Personalised encouraging message based on their performance"
}}
"""
    try:
        raw = _call(prompt)
        return _parse_json(raw)
    except Exception as e:
        print(f"[AI] Recommendations failed: {e}")
        return {
            "priority_topics": weak_topics[:3] if weak_topics else ["Core Concepts"],
            "study_strategies": [
                {"strategy": "Spaced Repetition",
                 "description": "Review topics at increasing intervals",
                 "time_required": "15 min/day", "effectiveness": "high"},
                {"strategy": "Active Recall",
                 "description": "Test yourself instead of re-reading",
                 "time_required": "20 min/day", "effectiveness": "high"},
            ],
            "resources": [],
            "weekly_plan": [],
            "milestone": "Improve average score by 10% in 2 weeks",
            "motivational_message": "Every expert was once a beginner. Keep going!",
        }


# ─────────────────────────────────────────────────────────────
# 10. Predictive Risk Analysis
# ─────────────────────────────────────────────────────────────

def predict_performance_risk(results: list[dict], upcoming_exam: str = "") -> dict:
    """Predict risk areas and likelihood of passing upcoming exams."""
    if not results:
        return {"risk_level": "unknown", "alerts": [], "predictions": []}

    summary = [{
        "exam":    r.get("exam_name", "Unknown"),
        "score":   r.get("score", 0),
        "correct": r.get("correct_answers", 0),
        "total":   r.get("total_questions", 0),
    } for r in results[-15:]]

    prompt = f"""
You are an educational risk assessment AI.

Recent Performance History:
{_try_json(summary)}

Upcoming Exam: {upcoming_exam or "General assessment"}

Analyse trends and provide predictive insights.
Return ONLY valid JSON:
{{
  "risk_level": "low|medium|high|critical",
  "pass_probability": <0-100 number>,
  "trend": "improving|declining|stable|inconsistent",
  "risk_factors": [
    {{"factor": "Description", "severity": "low|medium|high", "action": "What to do"}}
  ],
  "alerts": [
    {{"type": "warning|info|danger", "message": "Alert message", "topic": "Topic if applicable"}}
  ],
  "predictions": [
    {{"scenario": "If current trend continues", "expected_score": 65, "timeline": "2 weeks"}}
  ],
  "intervention_plan": "Specific 3-step action plan to reduce risk"
}}
"""
    try:
        raw = _call(prompt)
        return _parse_json(raw)
    except Exception as e:
        scores = [r.get("score", 0) for r in results]
        avg = sum(scores) / len(scores) if scores else 0
        risk = "low" if avg >= 70 else "medium" if avg >= 50 else "high"
        return {
            "risk_level": risk,
            "pass_probability": min(95, max(5, avg + 10)),
            "trend": "stable",
            "risk_factors": [],
            "alerts": [{"type": "info", "message": f"Current average: {avg:.1f}%",
                        "topic": "Overall"}],
            "predictions": [],
            "intervention_plan": "Review weak areas daily and take mock tests weekly.",
        }


# ─────────────────────────────────────────────────────────────
# 11. Adaptive Difficulty Engine
# ─────────────────────────────────────────────────────────────

def get_adaptive_difficulty(recent_accuracy: float, current_difficulty: str) -> str:
    """Determine next question difficulty based on performance."""
    if recent_accuracy >= 0.85 and current_difficulty != "hard":
        return "hard" if current_difficulty == "medium" else "medium"
    elif recent_accuracy < 0.5 and current_difficulty != "easy":
        return "easy" if current_difficulty == "medium" else "medium"
    return current_difficulty


def generate_adaptive_questions(
    topic: str,
    answered: list[dict],
    target_count: int = 5,
) -> list[dict]:
    """Generate questions that adapt to the student's current performance level."""
    correct   = sum(1 for a in answered if a.get("correct"))
    total     = len(answered) or 1
    accuracy  = correct / total
    last_diff = answered[-1].get("difficulty", "medium") if answered else "medium"
    next_diff = get_adaptive_difficulty(accuracy, last_diff)

    weak_areas = [a.get("topic", topic) for a in answered if not a.get("correct")]
    focus = weak_areas[-2:] if weak_areas else [topic]

    return generate_questions(
        topic=f"{topic} — focus on: {', '.join(focus)}",
        q_type="mcq",
        difficulty=next_diff,
        count=target_count,
        extra_instructions=(
            f"Student accuracy so far: {accuracy * 100:.0f}%. "
            f"Adapt difficulty to {next_diff}. "
            f"Focus on these weak areas: {', '.join(focus)}."
        ),
    )


# ─────────────────────────────────────────────────────────────
# 12. Leaderboard & Class Comparison
# ─────────────────────────────────────────────────────────────

def generate_class_insights(student_results: list[dict]) -> dict:
    """Generate class-level insights for teachers/institutes."""
    if not student_results:
        return {}
    prompt = f"""
Analyse this class exam performance data and generate teacher insights.

Class Results (top 10 students):
{json.dumps(student_results[:10], indent=2)}

Total students: {len(student_results)}

Return ONLY valid JSON:
{{
  "class_health": "excellent|good|needs_attention|critical",
  "top_performers": ["student_id1", "student_id2"],
  "at_risk_students": ["student_id3"],
  "common_weak_topics": ["topic1", "topic2"],
  "teaching_suggestions": [
    "Suggestion for the teacher based on class performance"
  ],
  "intervention_groups": [
    {{"group_name": "Needs Immediate Help", "criteria": "Score < 40%",
      "suggested_action": "One-on-one sessions"}}
  ],
  "class_summary": "Brief 2-sentence summary of class performance"
}}
"""
    try:
        raw = _call(prompt)
        return _parse_json(raw)
    except Exception as e:
        return {
            "class_health": "unknown",
            "teaching_suggestions": [],
            "class_summary": "Analysis not available.",
            "ai_error": str(e),
        }