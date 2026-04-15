"""
QuizGen Platform — AI Service
FILE : app/services/ai_service.py

Single source of truth for ALL OpenRouter API calls.

Design rules:
  1. Every public function catches ALL exceptions and returns a safe fallback.
     The app must NEVER crash due to an AI failure.
  2. _call() is the only function that talks to the network.
  3. All prompts request strict JSON output — no markdown, no preamble.
  4. _parse_json() handles messy AI responses robustly.

Public API:
  generate_questions()            →  generic topic questions
  generate_questions_for_exam()   →  exam-profile-aware questions
  generate_full_test()            →  full multi-section test
  evaluate_descriptive_answer()   →  AI grades a free-text answer
  generate_exam_report_insights() →  post-exam AI analysis
  explain_concept()               →  AI tutors a concept
  ai_tutor_chat()                 →  multi-turn tutor conversation
  generate_personalised_practice()→  adaptive practice session
  generate_smart_recommendations()→  study plan generator
  analyse_performance_trends()    →  trend analysis over results
  predict_performance_risk()      →  risk score for upcoming exam
  generate_adaptive_questions()   →  difficulty-adjusted follow-ups
  get_adaptive_difficulty()       →  compute next difficulty level
  generate_class_insights()       →  class-level analytics for teachers
  clean_raw()                     →  strip markdown fences from AI text (public)
"""

import json
import logging
import os
import re
import time
from datetime import datetime, timezone

import requests

from .question_bank import get_curated_mcq, get_curated_for_topic

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Exam profiles — give the AI real context about each exam's style/level
# ─────────────────────────────────────────────────────────────────────────────

EXAM_PROFILES = {
    # ── India ─────────────────────────────────────────────────────────────────
    "JEE Main": {
        "subjects": ["Physics", "Chemistry", "Mathematics"],
        "style":    "NTA JEE Main pattern",
        "instructions": (
            "Generate questions exactly like NTA JEE Main. "
            "Physics: mechanics, electromagnetism, optics, modern physics — require numerical solving. "
            "Chemistry: NCERT organic reactions, physical chemistry numericals, inorganic facts. "
            "Math: calculus, coordinate geometry, algebra, probability. "
            "Single correct MCQ (4 options). Marks: +4 correct, -1 wrong. "
            "Avoid definition questions — JEE tests application and analysis."
        ),
    },
    "JEE Advanced": {
        "subjects": ["Physics", "Chemistry", "Mathematics"],
        "style":    "IIT JEE Advanced pattern",
        "instructions": (
            "Generate IIT JEE Advanced level questions. "
            "Include: single correct, multiple correct, integer type. "
            "Make options very close to each other to test precision. "
            "Questions must require high analytical thinking — top 1% students."
        ),
    },
    "NEET": {
        "subjects": ["Physics", "Chemistry", "Biology"],
        "style":    "NTA NEET UG pattern",
        "instructions": (
            "Generate questions exactly like NTA NEET UG. "
            "Biology (Botany + Zoology): 50% weightage — NCERT diagrams, cell biology, genetics, ecology. "
            "Physics & Chemistry: strictly NCERT syllabus aligned. "
            "Single correct MCQ. Marks: +4 correct, -1 wrong."
        ),
    },
    "UPSC CSE": {
        "subjects": ["General Studies", "CSAT", "Current Affairs"],
        "style":    "UPSC Civil Services pattern",
        "instructions": (
            "Generate questions like UPSC Civil Services Preliminary. "
            "Include statement-based questions, match-the-column, chronological ordering. "
            "Topics: Indian polity, history, geography, economy, environment, science & tech, current affairs. "
            "UPSC tests nuanced understanding. Negative marking: -0.66 per wrong answer."
        ),
    },
    "CAT": {
        "subjects": ["Verbal Ability", "Data Interpretation", "Quantitative Aptitude"],
        "style":    "IIM CAT pattern",
        "instructions": (
            "Generate questions like IIM CAT. "
            "VARC: RC passages, para-jumbles, odd sentence, para summary. "
            "DILR: data sets with charts and tables requiring 4-5 step deduction. "
            "QA: arithmetic, algebra, number theory, geometry — elegant shortcuts exist."
        ),
    },
    "GATE": {
        "subjects": ["Technical", "Engineering Mathematics", "General Aptitude"],
        "style":    "GATE pattern",
        "instructions": (
            "Generate GATE exam questions. Include MCQ and Numerical Answer Type (NAT). "
            "Engineering Mathematics: linear algebra, calculus, probability. "
            "General Aptitude: verbal ability, numerical ability. "
            "NAT questions must have precise numerical answers."
        ),
    },
    "SSC CGL": {
        "subjects": ["General Intelligence", "General Awareness", "Quantitative Aptitude", "English"],
        "style":    "SSC CGL Tier 1 pattern",
        "instructions": (
            "Generate SSC CGL Tier 1 questions. "
            "Reasoning: analogy, series, coding-decoding, blood relations. "
            "Quant: percentage, profit-loss, SI/CI, geometry, trigonometry. "
            "GA: Indian history, polity, geography, economy, science, current affairs. "
            "English: fill-in-the-blanks, error spotting, synonyms/antonyms. Marks: +2, no negative."
        ),
    },
    "IBPS PO": {
        "subjects": ["Reasoning", "Quantitative Aptitude", "English", "Banking Awareness"],
        "style":    "IBPS PO pattern",
        "instructions": (
            "Generate IBPS PO bank exam questions. "
            "Reasoning: puzzles, seating arrangements, syllogisms, inequalities. "
            "Quant: data interpretation, number series, quadratic equations. "
            "English: reading comprehension, cloze test, error detection. "
            "Banking Awareness: RBI policies, banking terms, financial awareness."
        ),
    },
    # ── USA ───────────────────────────────────────────────────────────────────
    "SAT": {
        "subjects": ["Evidence-Based Reading", "Writing", "Math"],
        "style":    "College Board SAT pattern",
        "instructions": (
            "Generate College Board SAT questions. "
            "Reading: passage-based with command-of-evidence questions. "
            "Writing: expression of ideas, standard English conventions. "
            "Math: heart of algebra, advanced math, data analysis, grid-in questions."
        ),
    },
    "GRE": {
        "subjects": ["Verbal Reasoning", "Quantitative Reasoning"],
        "style":    "ETS GRE General Test pattern",
        "instructions": (
            "Generate ETS GRE questions. "
            "Verbal: text completion (1/2/3 blanks), sentence equivalence, reading comprehension. "
            "Use advanced GRE vocabulary in context. "
            "Quant: arithmetic, algebra, geometry, data analysis — include quantitative comparison."
        ),
    },
    "GMAT": {
        "subjects": ["Verbal", "Quantitative", "Integrated Reasoning"],
        "style":    "GMAC GMAT pattern",
        "instructions": (
            "Generate GMAT questions. "
            "Critical Reasoning: strengthen/weaken/assumption/flaw. "
            "Data Sufficiency: unique DS format with Statement (1) and (2). "
            "IR: multi-source reasoning, table analysis, two-part analysis."
        ),
    },
    "MCAT": {
        "subjects": ["Biology/Biochemistry", "Chemistry/Physics", "Psychology/Sociology"],
        "style":    "AAMC MCAT pattern",
        "instructions": (
            "Generate AAMC MCAT questions. "
            "Use passage-based format heavily — questions test application not memorization. "
            "Include experimental data interpretation. Difficulty: very high."
        ),
    },
    # ── UK ────────────────────────────────────────────────────────────────────
    "A-Levels": {
        "subjects": ["Mathematics", "Sciences", "Humanities"],
        "style":    "UK A-Level exam board pattern (AQA/Edexcel/OCR)",
        "instructions": (
            "Generate UK A-Level questions. Include structured questions with parts (a, b, c). "
            "Sciences: experimental design, data analysis, graph interpretation. "
            "Math: pure maths (calculus, algebra, trigonometry), statistics, mechanics. "
            "Test AO1 (knowledge), AO2 (application), AO3 (analysis)."
        ),
    },
    "UCAT": {
        "subjects": ["Verbal Reasoning", "Decision Making", "Quantitative Reasoning", "Abstract Reasoning"],
        "style":    "UCAT UK medical/dental admission pattern",
        "instructions": (
            "Generate UCAT questions. "
            "Verbal: True/False/Can't Tell from passages. "
            "Decision Making: syllogisms, Venn diagrams, statistical reasoning. "
            "Abstract Reasoning: shape pattern recognition. "
            "Time pressure is key — questions must be answerable in 30-90 seconds."
        ),
    },
    # ── Default ───────────────────────────────────────────────────────────────
    "DEFAULT": {
        "subjects": ["General Knowledge", "Reasoning", "Aptitude"],
        "style":    "competitive exam pattern",
        "instructions": (
            "Generate high-quality competitive exam questions. "
            "Mix analytical, factual, and application-based questions. "
            "Make all 4 MCQ options plausible — avoid obviously wrong answers."
        ),
    },
}


def _get_exam_profile(exam_name: str) -> dict:
    """
    Return the AI instruction profile for an exam.
    Tries exact match → partial match → DEFAULT.
    """
    if not exam_name:
        return EXAM_PROFILES["DEFAULT"]
    if exam_name in EXAM_PROFILES:
        return EXAM_PROFILES[exam_name]
    name_lower = exam_name.lower()
    for key in EXAM_PROFILES:
        if key.lower() in name_lower or name_lower in key.lower():
            return EXAM_PROFILES[key]
    return EXAM_PROFILES["DEFAULT"]


# ─────────────────────────────────────────────────────────────────────────────
# Network helpers
# ─────────────────────────────────────────────────────────────────────────────

def _api_key() -> str:
    return os.getenv("OPENROUTER_API_KEY", "").strip()


def _model() -> str:
    return (os.getenv("OPENROUTER_MODEL") or "openai/gpt-4o-mini").strip()


def _is_auth_error(exc: Exception) -> bool:
    return "401" in str(exc) or "unauthorized" in str(exc).lower()


def _is_rate_limit(exc: Exception) -> bool:
    if _is_auth_error(exc):
        return False
    msg = str(exc).lower()
    return "429" in msg or "quota" in msg or "rate_limit" in msg or "too many requests" in msg


def _call(prompt: str) -> str:
    """
    Send a prompt to OpenRouter and return the text response.

    Retries up to 3 times on rate limit (429) with exponential back-off.
    Raises immediately on auth errors (401).
    """
    key = _api_key()
    if not key:
        raise RuntimeError("OPENROUTER_API_KEY is not set")

    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type":  "application/json",
        "HTTP-Referer":  os.getenv("FRONTEND_URL", "http://localhost:3000"),
        "X-Title":       "QuizGen",
    }
    payload = {
        "model":       _model(),
        "messages":    [{"role": "user", "content": prompt}],
        "temperature": 0.6,
        "max_tokens":  4096,
    }

    last_err = None
    for attempt in range(3):
        try:
            resp = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=headers, json=payload, timeout=90,
            )
            if resp.status_code == 401:
                raise RuntimeError("401 Unauthorized — check OPENROUTER_API_KEY")
            if resp.status_code == 429:
                raise RuntimeError(f"429 Rate limit exceeded: {resp.text}")
            if not resp.ok:
                raise RuntimeError(f"OpenRouter {resp.status_code}: {resp.text[:200]}")

            text = resp.json()["choices"][0]["message"]["content"]
            if text:
                return text.strip()
            raise RuntimeError("Empty response from OpenRouter")

        except RuntimeError as exc:
            last_err = exc
            if _is_auth_error(exc):
                raise
            if _is_rate_limit(exc) and attempt < 2:
                wait = 2 ** attempt
                logger.warning("Rate limit hit (attempt %d/3), retrying in %ds…", attempt + 1, wait)
                time.sleep(wait)
                continue
            raise

        except requests.RequestException as exc:
            last_err = RuntimeError(f"Network error: {exc}")
            if attempt < 2:
                time.sleep(2 ** attempt)
                continue
            raise last_err

    raise last_err or RuntimeError("OpenRouter request failed after retries")


# ─────────────────────────────────────────────────────────────────────────────
# Robust JSON parsing
# ─────────────────────────────────────────────────────────────────────────────

def clean_raw(text: str) -> str:
    """
    Remove markdown code fences that some models add around JSON.
    Public so offline_routes.py can import this without reaching into a
    private symbol (prefixed _ functions are considered private in Python).
    """
    text = text.strip()
    text = re.sub(r"```(?:json)?\s*", "", text)
    text = text.replace("```", "").strip()
    return text

# Keep the private alias for backwards compatibility within this module
_clean_raw = clean_raw


def _extract_json_array(text: str) -> str:
    """Extract the outermost JSON array from a string using bracket depth counting."""
    start = text.find("[")
    if start == -1:
        raise ValueError("No JSON array found in response")

    depth, in_string, escape_next = 0, False, False
    for i in range(start, len(text)):
        ch = text[i]
        if escape_next:
            escape_next = False
            continue
        if ch == "\\" and in_string:
            escape_next = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch == "[":
            depth += 1
        elif ch == "]":
            depth -= 1
            if depth == 0:
                return text[start: i + 1]
    raise ValueError("Incomplete JSON array in response")


def _parse_json(raw: str):
    """
    Parse JSON from an AI response.
    Tries multiple strategies to handle common AI formatting quirks.
    """
    if not raw or not raw.strip():
        raise ValueError("Empty response")

    clean = clean_raw(raw)

    # Strategy 1: direct parse
    try:
        return json.loads(clean)
    except json.JSONDecodeError:
        pass

    # Strategy 2: extract first complete JSON object or array
    for open_ch, close_ch in [("[", "]"), ("{", "}")]:
        start = clean.find(open_ch)
        if start == -1:
            continue
        depth, in_str, esc = 0, False, False
        for i in range(start, len(clean)):
            ch = clean[i]
            if esc:
                esc = False
                continue
            if ch == "\\" and in_str:
                esc = True
                continue
            if ch == '"':
                in_str = not in_str
                continue
            if in_str:
                continue
            if ch == open_ch:
                depth += 1
            elif ch == close_ch:
                depth -= 1
                if depth == 0:
                    try:
                        return json.loads(clean[start: i + 1])
                    except json.JSONDecodeError:
                        break
    raise ValueError(f"Could not parse JSON from response: {clean[:200]}")


# ─────────────────────────────────────────────────────────────────────────────
# Question normalisation
# ─────────────────────────────────────────────────────────────────────────────

def _normalise_questions(questions: list, topic: str, q_type: str) -> list[dict]:
    """
    Normalise field names so both `text` and `question_text` always exist.
    Adds default values for any missing optional fields.
    """
    out = []
    ts  = int(datetime.now(timezone.utc).timestamp())

    for idx, q in enumerate(questions):
        if not isinstance(q, dict):
            continue

        raw_text = q.get("text") or q.get("question_text") or q.get("question") or ""
        q["text"]          = raw_text
        q["question_text"] = raw_text

        q.setdefault("id",          f"q_{idx}_{ts}")
        q.setdefault("marks",       1)
        q.setdefault("explanation", "")
        q.setdefault("topic",       topic)
        q.setdefault("difficulty",  "medium")

        if q_type.lower() == "mcq":
            if not isinstance(q.get("options"), list) or len(q["options"]) < 2:
                q["options"] = ["Option A", "Option B", "Option C", "Option D"]
            ca = q.get("correctAnswer", 0)
            if not isinstance(ca, int) or ca >= len(q["options"]):
                q["correctAnswer"] = 0
        else:
            q.setdefault("options",       [])
            q.setdefault("correctAnswer", None)

        out.append(q)
    return out


# ─────────────────────────────────────────────────────────────────────────────
# 1. Generic question generation
# ─────────────────────────────────────────────────────────────────────────────

def generate_questions(
    topic: str,
    q_type: str = "mcq",
    difficulty: str = "medium",
    count: int = 10,
    extra_instructions: str = "",
) -> list[dict]:
    """
    Generate questions about any topic.
    Falls back to the curated question bank on failure.
    """
    prompt = f"""
You are a professional exam paper setter.

Generate exactly {count} {q_type.upper()} questions about: {topic}
Difficulty: {difficulty}
{extra_instructions}

Return ONLY a valid JSON array — no markdown, no explanatory text:
[
  {{
    "id": "unique-string",
    "type": "{q_type}",
    "text": "Full question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Why this answer is correct",
    "topic": "Sub-topic name",
    "difficulty": "{difficulty}",
    "marks": 1
  }}
]
"""
    try:
        raw       = _call(prompt)
        questions = _parse_json(raw)
        if not isinstance(questions, list):
            raise ValueError("Expected a JSON array")
        return _normalise_questions(questions, topic, q_type)
    except Exception as exc:
        logger.warning("generate_questions failed for topic '%s': %s", topic, exc)
        return get_curated_for_topic(topic, difficulty, count) if q_type == "mcq" else []


# ─────────────────────────────────────────────────────────────────────────────
# 2. Exam-specific question generation
# ─────────────────────────────────────────────────────────────────────────────

def generate_questions_for_exam(
    exam: dict,
    country_name: str = "",
    q_type: str = "mcq",
    difficulty: str = "medium",
    count: int = 10,
) -> dict:
    """
    Generate questions that match the real style and difficulty of a named exam.
    Returns: {"questions": [...], "source": "openrouter"|"fallback", "ai_error": None|str}
    """
    name = (exam or {}).get("name") or "Practice Exam"
    desc = (exam or {}).get("description") or ""

    safe_count   = min(count, 10)
    profile      = _get_exam_profile(name)
    subjects     = ", ".join(profile["subjects"])
    style        = profile["style"]
    instructions = profile["instructions"]

    difficulty_context = {
        "easy":   "foundational questions from the syllabus",
        "medium": "standard questions matching average exam difficulty",
        "hard":   "challenging questions matching the hardest exam questions",
    }.get(difficulty.lower(), "standard difficulty")

    prompt = f"""
You are an expert question setter who creates official papers for {name}.

EXAM: {name}
DESCRIPTION: {desc}
STYLE: {style}
SUBJECTS: {subjects}
QUESTION TYPE: {q_type.upper()}
DIFFICULTY: {difficulty} ({difficulty_context})
COUNT: exactly {safe_count} questions

EXAM-SPECIFIC INSTRUCTIONS:
{instructions}

CRITICAL RULES:
1. Questions MUST match the real {name} exam standard — NOT generic questions
2. Use proper subject terminology and notation
3. All 4 MCQ options must be plausible (no obviously wrong options)
4. Include the correct answer as a 0-based index
5. Write a clear explanation for the correct answer
6. Distribute questions across different topics
7. Return ONLY valid JSON — nothing before or after the array
8. Complete ALL {safe_count} questions — do not stop early

JSON FORMAT (return exactly this structure):
[
  {{
    "id": "q1",
    "type": "{q_type}",
    "text": "Complete question text with all necessary context",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Brief explanation of why this answer is correct",
    "topic": "Specific topic within {name} syllabus",
    "subject": "Subject name",
    "difficulty": "{difficulty}",
    "marks": 4
  }}
]
"""
    try:
        raw       = _call(prompt)
        json_text = _extract_json_array(clean_raw(raw))
        questions = json.loads(json_text)

        if not isinstance(questions, list) or len(questions) == 0:
            raise ValueError("Empty questions list from AI")

        questions = _normalise_questions(questions, name, q_type)
        logger.info("Generated %d questions for '%s' via OpenRouter", len(questions), name)

        return {"questions": questions[:safe_count], "source": "openrouter", "ai_error": None}

    except Exception as exc:
        logger.warning("AI question generation failed for '%s': %s", name, exc)
        fallback = get_curated_mcq(name, difficulty, safe_count)
        return {"questions": fallback, "source": "fallback", "ai_error": str(exc)}


# ─────────────────────────────────────────────────────────────────────────────
# 3. Full multi-section online test
# ─────────────────────────────────────────────────────────────────────────────

def generate_full_test(exam_name: str, duration: int = 60) -> dict:
    """Generate a full structured test with MCQ and descriptive sections."""
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
      "title": "Section A – Multiple Choice",
      "type": "mcq",
      "marks_per_question": 2,
      "questions": [
        {{
          "id": "mcq_1",
          "text": "Question text",
          "options": ["A", "B", "C", "D"],
          "correctAnswer": 0,
          "explanation": "Explanation",
          "topic": "topic",
          "difficulty": "medium",
          "marks": 2
        }}
      ]
    }},
    {{
      "title": "Section B – Descriptive",
      "type": "descriptive",
      "marks_per_question": 5,
      "questions": [
        {{
          "id": "desc_1",
          "text": "Descriptive question text",
          "expected_length": "100-150 words",
          "topic": "topic",
          "marks": 5
        }}
      ]
    }}
  ]
}}
"""
    try:
        return _parse_json(_call(prompt))
    except Exception as exc:
        logger.error("generate_full_test failed for '%s': %s", exam_name, exc)
        return {"error": str(exc), "metadata": {"exam_name": exam_name}}


# ─────────────────────────────────────────────────────────────────────────────
# 4. Descriptive answer evaluation
# ─────────────────────────────────────────────────────────────────────────────

def evaluate_descriptive_answer(question: str, answer: str, max_marks: int = 10) -> dict:
    """
    Use AI to grade a free-text answer.
    Falls back to 50% score if AI fails.
    """
    if not answer or len(answer.strip()) < 5:
        return {
            "score":      0,
            "percentage": 0,
            "feedback":   "No answer was provided.",
            "strengths":  [],
            "improvements": [],
        }

    prompt = f"""
You are an expert exam evaluator.

Question: {question}
Student Answer: {answer}
Maximum Marks: {max_marks}

Evaluate the answer and return ONLY valid JSON:
{{
  "score": <integer 0 to {max_marks}>,
  "percentage": <0 to 100>,
  "feedback": "Constructive 2-sentence feedback",
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["area to improve 1"],
  "key_concepts_covered": ["concept1"],
  "missing_concepts": ["missing concept1"]
}}
"""
    try:
        result = _parse_json(_call(prompt))
        result["score"] = max(0, min(float(result.get("score", 0)), max_marks))
        return result
    except Exception as exc:
        logger.warning("evaluate_descriptive_answer failed: %s", exc)
        return {
            "score":      round(max_marks * 0.5, 1),
            "percentage": 50,
            "feedback":   "Auto-evaluated due to service unavailability.",
            "strengths":  [],
            "improvements": [],
        }


# ─────────────────────────────────────────────────────────────────────────────
# 5. Post-exam report insights
# ─────────────────────────────────────────────────────────────────────────────

def generate_exam_report_insights(
    exam_name: str,
    performance_data: dict,
    question_analysis: list,
) -> dict:
    """Generate an AI analysis report after a student completes an exam."""
    pct     = performance_data.get("marks_percentage", 0)
    correct = performance_data.get("correct_answers", 0)
    total   = performance_data.get("total_questions", 0)

    prompt = f"""
Analyse this student's exam performance for {exam_name}.
Score: {pct:.1f}%
Correct answers: {correct} out of {total}
Grade: {performance_data.get("grade", "N/A")}

Return ONLY valid JSON:
{{
  "performance_level": "Excellent|Very Good|Good|Satisfactory|Needs Improvement",
  "summary": "2-sentence assessment of the student's performance",
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "insights": ["actionable insight 1", "insight 2", "insight 3"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "study_plan": {{
    "immediate": "What to do today",
    "short_term": "What to do this week",
    "long_term": "What to do this month"
  }}
}}
"""
    try:
        return _parse_json(_call(prompt))
    except Exception as exc:
        logger.warning("generate_exam_report_insights failed: %s", exc)
        return {
            "performance_level": "Excellent" if pct >= 85 else "Good" if pct >= 65 else "Needs Improvement",
            "summary":           f"Scored {pct:.1f}% on {exam_name}.",
            "strengths":         [],
            "weaknesses":        [],
            "insights":          ["Review incorrect answers carefully."],
            "recommendations":   ["Practice regularly with timed sessions."],
            "study_plan": {
                "immediate":  "Review all incorrect answers today.",
                "short_term": "Practice 20 questions daily.",
                "long_term":  "Take 2 full mock tests per week.",
            },
        }


# ─────────────────────────────────────────────────────────────────────────────
# 6. Concept explanation
# ─────────────────────────────────────────────────────────────────────────────

def explain_concept(concept: str, level: str = "intermediate") -> dict:
    """Ask the AI to explain a concept with examples, memory tips, and a practice question."""
    prompt = f"""
You are a friendly, expert AI tutor. Explain this concept clearly.

Concept: {concept}
Student Level: {level}

Return ONLY valid JSON:
{{
  "concept": "{concept}",
  "simple_explanation": "ELI5 explanation in 2-3 sentences",
  "detailed_explanation": "Comprehensive explanation with context (4-6 sentences)",
  "key_points": ["key point 1", "key point 2", "key point 3"],
  "examples": ["Real-world example 1", "Example 2"],
  "common_mistakes": ["Common mistake students make"],
  "memory_tip": "A mnemonic or memory trick",
  "related_concepts": ["related concept 1", "related concept 2"],
  "practice_question": "A practice question to test understanding"
}}
"""
    try:
        return _parse_json(_call(prompt))
    except Exception as exc:
        logger.warning("explain_concept failed for '%s': %s", concept, exc)
        return {
            "concept":              concept,
            "simple_explanation":   "AI tutor is temporarily unavailable.",
            "detailed_explanation": "",
            "key_points":           [],
            "examples":             [],
            "common_mistakes":      [],
            "memory_tip":           "",
            "related_concepts":     [],
            "practice_question":    "",
            "ai_error":             str(exc),
        }


# ─────────────────────────────────────────────────────────────────────────────
# 7. AI tutor conversation
# ─────────────────────────────────────────────────────────────────────────────

def ai_tutor_chat(messages: list[dict], subject: str = "General") -> dict:
    """Continue a multi-turn tutoring conversation."""
    history = "\n".join(
        f"{'Student' if m['role'] == 'user' else 'Tutor'}: {m['content']}"
        for m in messages[-10:]
    )
    prompt = f"""
You are an expert, encouraging AI tutor for {subject}.
Conversation so far:
{history}

Respond to the student's last message.
Return ONLY valid JSON:
{{
  "reply": "Your helpful tutoring response",
  "follow_up_question": "Optional follow-up question to check understanding (or null)",
  "key_concept": "The main concept discussed (or null)",
  "confidence_check": "A quick check question (or null)"
}}
"""
    try:
        return _parse_json(_call(prompt))
    except Exception as exc:
        logger.warning("ai_tutor_chat failed: %s", exc)
        return {
            "reply":              "I'm having trouble connecting right now. Please try again shortly.",
            "follow_up_question": None,
            "key_concept":        None,
            "confidence_check":   None,
            "ai_error":           str(exc),
        }


# ─────────────────────────────────────────────────────────────────────────────
# 8. Personalised practice session
# ─────────────────────────────────────────────────────────────────────────────

def generate_personalised_practice(
    country: str,
    exam_type: str,
    weak_areas: list,
    strong_areas: list,
    target_score: int = 80,
    has_history: bool = False,
) -> dict:
    """Generate an adaptive practice session tailored to the student's weak areas."""
    if has_history:
        context = (
            f"Weak areas: {', '.join(weak_areas) or 'General'}\n"
            f"Strong areas: {', '.join(strong_areas) or 'General'}\n"
            f"Target score: {target_score}%"
        )
    else:
        context = "New student — create a diagnostic session to assess their baseline."

    prompt = f"""
You are an adaptive AI tutor for {exam_type} preparation ({country}).
{context}

Create a personalised practice session with 10-12 questions.
Return ONLY valid JSON:
{{
  "session_title": "Personalised Practice – {exam_type}",
  "session_type": "adaptive",
  "message": "Encouraging personalised message to the student",
  "total_questions": 10,
  "estimated_minutes": 20,
  "focus_topics": ["topic1", "topic2"],
  "questions": [
    {{
      "question_number": 1,
      "text": "Full question text",
      "question_text": "Full question text",
      "type": "mcq",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "topic": "Topic",
      "difficulty": "Easy|Medium|Hard",
      "learning_objective": "What this question tests",
      "marks": 1,
      "explanation": "Why this answer is correct"
    }}
  ]
}}
"""
    try:
        data = _parse_json(_call(prompt))
        if not isinstance(data, dict) or not data.get("questions"):
            raise ValueError("No questions in response")
        data["questions"] = _normalise_questions(data["questions"], exam_type, "mcq")
        return data
    except Exception as exc:
        logger.warning("generate_personalised_practice failed: %s", exc)
        fallback_qs = get_curated_mcq(exam_type, "medium", 10)
        return {
            "session_title":     f"Practice – {exam_type}",
            "session_type":      "fallback",
            "message":           "Here are some practice questions to get you started!",
            "total_questions":   len(fallback_qs),
            "estimated_minutes": 20,
            "focus_topics":      [exam_type],
            "questions": [
                {**q, "question_number": i + 1, "learning_objective": "Core concept practice"}
                for i, q in enumerate(fallback_qs)
            ],
        }


# ─────────────────────────────────────────────────────────────────────────────
# 9. Performance trend analysis
# ─────────────────────────────────────────────────────────────────────────────

def analyse_performance_trends(results: list[dict]) -> dict:
    """Analyse a student's last 10 results for trends."""
    if not results:
        return {"trend": "no_data", "insights": [], "recommendations": []}

    summary = [
        {"exam": r.get("exam_name"), "score": r.get("score", 0)}
        for r in results[-10:]
    ]
    prompt = f"""
Analyse this student's recent performance: {json.dumps(summary)}

Return ONLY valid JSON:
{{
  "trend": "improving|declining|stable|inconsistent",
  "average_score": <number>,
  "insights": ["insight 1", "insight 2"],
  "recommendations": ["recommendation 1", "recommendation 2"]
}}
"""
    try:
        return _parse_json(_call(prompt))
    except Exception:
        scores = [r.get("score", 0) for r in results]
        avg    = round(sum(scores) / len(scores), 1) if scores else 0
        return {
            "trend":           "stable",
            "average_score":   avg,
            "insights":        [f"Average score: {avg:.1f}%"],
            "recommendations": ["Keep practising consistently."],
        }


# ─────────────────────────────────────────────────────────────────────────────
# 10. Smart study recommendations
# ─────────────────────────────────────────────────────────────────────────────

def generate_smart_recommendations(
    weak_topics: list,
    strong_topics: list,
    exam_type: str,
    avg_score: float,
    learning_style: str = "visual",
) -> dict:
    """Generate a personalised study plan with resources, strategies, and a weekly plan."""
    prompt = f"""
Student profile:
- Exam: {exam_type}
- Average score: {avg_score:.1f}%
- Weak topics: {', '.join(weak_topics) or 'None identified yet'}
- Strong topics: {', '.join(strong_topics) or 'None identified yet'}
- Learning style: {learning_style}

Generate personalised study recommendations.
Return ONLY valid JSON:
{{
  "priority_topics": ["topic1", "topic2"],
  "study_strategies": [
    {{
      "strategy": "Strategy Name",
      "description": "How to apply this strategy",
      "time_required": "15 min/day",
      "effectiveness": "high|medium|low"
    }}
  ],
  "resources": [
    {{
      "type": "video|book|practice|flashcard",
      "title": "Resource title",
      "description": "How this helps"
    }}
  ],
  "weekly_plan": [
    {{
      "day": "Monday",
      "focus": "Topic to study",
      "activity": "What to do",
      "duration_minutes": 60
    }}
  ],
  "milestone": "Goal to achieve in 2 weeks",
  "motivational_message": "Personalised motivational message"
}}
"""
    try:
        return _parse_json(_call(prompt))
    except Exception as exc:
        logger.warning("generate_smart_recommendations failed: %s", exc)
        return {
            "priority_topics": weak_topics[:3] or ["Core Concepts"],
            "study_strategies": [{
                "strategy":     "Spaced Repetition",
                "description":  "Review material at increasing intervals for long-term retention.",
                "time_required":"15 min/day",
                "effectiveness":"high",
            }],
            "resources":   [],
            "weekly_plan": [],
            "milestone":   "Improve average score by 10% in 2 weeks",
            "motivational_message": "Every expert was once a beginner. Keep going!",
        }


# ─────────────────────────────────────────────────────────────────────────────
# 11. Performance risk prediction
# ─────────────────────────────────────────────────────────────────────────────

def predict_performance_risk(results: list[dict], upcoming_exam: str = "") -> dict:
    """
    Predict the student's risk level for an upcoming exam.
    Uses rule-based logic (fast, reliable) rather than AI to avoid latency.
    """
    if not results:
        return {
            "risk_level":        "unknown",
            "pass_probability":  50,
            "trend":             "no_data",
            "alerts":            [],
            "predictions":       [],
            "intervention_plan": "Start practising regularly to build a baseline.",
        }

    scores = [r.get("score", 0) for r in results]
    avg    = sum(scores) / len(scores)

    risk     = "low" if avg >= 70 else "medium" if avg >= 50 else "high"
    pass_prob = min(95, max(5, round(avg + 10)))

    alerts = []
    if avg < 50:
        alerts.append({
            "type":    "warning",
            "message": f"Current average ({avg:.1f}%) is below passing threshold.",
            "topic":   "Overall Performance",
        })
    if len(results) >= 3:
        recent_avg = sum(r.get("score", 0) for r in results[:3]) / 3
        if recent_avg < avg - 10:
            alerts.append({
                "type":    "warning",
                "message": "Performance has been declining in recent sessions.",
                "topic":   "Trend Analysis",
            })

    return {
        "risk_level":        risk,
        "pass_probability":  pass_prob,
        "current_average":   round(avg, 1),
        "trend":             "stable",
        "alerts":            alerts,
        "predictions":       [],
        "intervention_plan": (
            "Focus daily on weak topics and take one mock test per week."
            if risk == "high" else
            "Maintain your current pace and review weak areas."
        ),
    }


# ─────────────────────────────────────────────────────────────────────────────
# 12. Adaptive difficulty
# ─────────────────────────────────────────────────────────────────────────────

def get_adaptive_difficulty(recent_accuracy: float, current_difficulty: str) -> str:
    """
    Auto-adjust question difficulty based on the student's recent accuracy.
    - accuracy >= 85% → step up
    - accuracy < 50%  → step down
    """
    levels = ["easy", "medium", "hard"]
    idx    = levels.index(current_difficulty) if current_difficulty in levels else 1

    if recent_accuracy >= 0.85 and idx < 2:
        return levels[idx + 1]
    elif recent_accuracy < 0.50 and idx > 0:
        return levels[idx - 1]
    return current_difficulty


def generate_adaptive_questions(
    topic: str,
    answered: list[dict],
    target_count: int = 5,
) -> list[dict]:
    """Generate new questions with auto-adjusted difficulty focused on weak areas."""
    correct   = sum(1 for a in answered if a.get("correct"))
    total     = len(answered) or 1
    accuracy  = correct / total
    last_diff = answered[-1].get("difficulty", "medium") if answered else "medium"
    next_diff = get_adaptive_difficulty(accuracy, last_diff)

    weak_topics = [a.get("topic", topic) for a in answered if not a.get("correct")]
    focus       = weak_topics[-2:] if weak_topics else [topic]

    return generate_questions(
        topic              = f"{topic} — focus areas: {', '.join(focus)}",
        q_type             = "mcq",
        difficulty         = next_diff,
        count              = target_count,
        extra_instructions = (
            f"Student recent accuracy: {accuracy * 100:.0f}%. "
            f"Emphasise these weak areas: {', '.join(focus)}."
        ),
    )


# ─────────────────────────────────────────────────────────────────────────────
# 13. Class-level insights for teachers
# ─────────────────────────────────────────────────────────────────────────────

def generate_class_insights(student_results: list[dict]) -> dict:
    """Analyse class performance to help teachers identify struggling groups."""
    if not student_results:
        return {
            "class_health":        "unknown",
            "common_weak_topics":  [],
            "teaching_suggestions":["No data available yet."],
            "class_summary":       "No student results available.",
        }

    try:
        prompt = f"""
Analyse class performance for {len(student_results)} students.
Sample data (top 10): {json.dumps(student_results[:10])}

Return ONLY valid JSON:
{{
  "class_health": "excellent|good|needs_attention|critical",
  "common_weak_topics": ["topic1", "topic2"],
  "teaching_suggestions": ["suggestion1", "suggestion2"],
  "class_summary": "2-sentence summary for the teacher",
  "at_risk_count": <number of students likely at risk>
}}
"""
        return _parse_json(_call(prompt))
    except Exception as exc:
        logger.warning("generate_class_insights failed: %s", exc)
        scores = [r.get("score", 0) for r in student_results]
        avg    = round(sum(scores) / len(scores), 1) if scores else 0
        return {
            "class_health":        "good" if avg >= 65 else "needs_attention",
            "common_weak_topics":  [],
            "teaching_suggestions":["Review the most commonly missed questions with the class."],
            "class_summary":       f"Class average: {avg}%.",
            "at_risk_count":       sum(1 for s in scores if s < 50),
        }