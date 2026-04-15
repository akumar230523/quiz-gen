"""
QuizGen Platform — Offline Quiz Routes
FILE : app/routes/offline_routes.py
PREFIX : /offline

Endpoints:
  POST /offline/generate          → AI generates quiz, stores it, returns quiz_code + questions
  GET  /offline/download/<code>   → return quiz data as JSON for frontend printing
  GET  /offline/quiz/<quiz_code>  → retrieve a stored offline quiz by its code
  GET  /offline/my-quizzes        → list user's generated offline quizzes
  POST /offline/scan              → OpenRouter Vision reads the answer sheet photo
  POST /offline/save-result       → persist scanned result to test_results collection
"""

import base64
import json
import logging
import os
import random
import string
import time
from datetime import datetime, timezone

import requests
from flask import Blueprint, request, jsonify

from ..models.database import mongo, doc_to_json
from ..services.ai_service import generate_questions_for_exam, clean_raw
from ..models.exam_model import ExamModel
from ..services.exam_service import get_or_create_exams_for_country
from ..utils.auth import token_required
from ..utils.helpers import calculate_grade, error_response, clean_str

offline_bp = Blueprint("offline", __name__)
logger = logging.getLogger(__name__)


# ── Vision models — tried in order if one rejects the request ────────────────

VISION_MODELS = [
    "openai/gpt-4o-mini",
    "openai/gpt-4o",
    "google/gemini-flash-1.5",
    "anthropic/claude-3-haiku",
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _build_question_context(questions: list) -> str:
    """
    Format quiz questions into a readable string for the vision AI prompt.
    Example output:
      Q1. What is Newton's second law?
         Options: A: F=ma  |  B: F=mv  |  C: a=m/F  |  D: F=mg
         Correct answer: A (index 0) | Marks: 1
    """
    lines = []
    for i, q in enumerate(questions):
        opts = q.get("options", [])
        opt_str = "  |  ".join(f"{chr(65+j)}: {o}" for j, o in enumerate(opts)) if opts else "open answer"
        ci = q.get("correctAnswer", 0)
        correct_letter = chr(65 + ci) if isinstance(ci, int) and ci < len(opts) else str(ci)
        lines.append(
            f"Q{i+1}. {q.get('text', '')[:150]}\n"
            f"   Options: {opt_str}\n"
            f"   Correct answer: {correct_letter} (index {ci}) | Marks: {q.get('marks', 1)}"
        )
    return "\n\n".join(lines)


def _openrouter_vision_scan(image_b64: str, mime_type: str, questions: list) -> dict:
    """
    Send an answer sheet image to OpenRouter vision API.
    The AI reads what the student marked and compares it to the correct answers.
    Tries up to 4 vision models before giving up.
    """
    api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY is not set")

    prompt = f"""You are an expert exam answer-sheet evaluator.

Carefully examine this scanned/photographed answer sheet image.

EXAM QUESTIONS AND CORRECT ANSWERS:
{_build_question_context(questions)}

TASK:
- For each question find what the student circled, bubbled, or wrote.
- Compare against the correct answer listed above.
- If an answer is not visible, set student_answer_raw to "unanswered" and is_correct to false.
- student_answer_index: 0=A, 1=B, 2=C, 3=D, -1=unanswered
- Use confidence "low" if the handwriting or marking is unclear.

Return ONLY valid JSON — no markdown fences, no extra text:
{{
  "answers": [
    {{
      "question_number": 1,
      "question_text": "First 60 chars of question",
      "student_answer_raw": "A",
      "student_answer_index": 0,
      "correct_answer_index": 0,
      "is_correct": true,
      "confidence": "high",
      "marks_obtained": 1,
      "marks_total": 1
    }}
  ],
  "total_correct": 0,
  "total_questions": {len(questions)},
  "score_percentage": 0.0,
  "overall_feedback": "2-sentence assessment of the student performance",
  "legibility": "clear",
  "scan_notes": "Any notes about image quality"
}}"""

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type":  "application/json",
        "HTTP-Referer":  os.getenv("FRONTEND_URL", "http://localhost:3000"),
        "X-Title":       "QuizGen Offline Scanner",
    }

    current_model = os.getenv("OPENROUTER_VISION_MODEL", VISION_MODELS[0]).strip()
    tried_models  = []

    for attempt in range(4):
        payload = {
            "model":       current_model,
            "messages":    [{
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{image_b64}", "detail": "high"}},
                    {"type": "text", "text": prompt},
                ],
            }],
            "temperature": 0.1,
            "max_tokens":  3000,
        }

        try:
            resp = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=headers, json=payload, timeout=120,
            )

            if resp.status_code == 401:
                raise RuntimeError("401 Unauthorized — check OPENROUTER_API_KEY")

            if resp.status_code == 429:
                if attempt < 3:
                    time.sleep(2 ** attempt)
                    continue
                raise RuntimeError("Rate limit exceeded after retries")

            if resp.status_code == 400:
                # This model doesn't support vision — try the next one
                tried_models.append(current_model)
                remaining = [m for m in VISION_MODELS if m not in tried_models]
                if remaining:
                    current_model = remaining[0]
                    logger.warning("Vision model rejected, switching to %s", current_model)
                    continue
                raise RuntimeError(f"No vision-capable model available. Last error: {resp.text[:150]}")

            if not resp.ok:
                raise RuntimeError(f"OpenRouter {resp.status_code}: {resp.text[:200]}")

            raw = resp.json()["choices"][0]["message"]["content"]
            if not raw:
                raise RuntimeError("Empty response from vision model")

            result = json.loads(clean_raw(raw.strip()))

            # Recalculate totals from parsed answers to ensure accuracy
            answers       = result.get("answers", [])
            total_correct = sum(1 for a in answers if a.get("is_correct"))
            total_q       = len(questions)

            result["total_correct"]    = total_correct
            result["total_questions"]  = total_q
            result["score_percentage"] = round(total_correct / total_q * 100, 1) if total_q else 0.0
            result["model_used"]       = current_model

            logger.info("Vision scan done: %d/%d correct via %s", total_correct, total_q, current_model)
            return result

        except (json.JSONDecodeError, KeyError) as exc:
            raise RuntimeError(f"Failed to parse vision response: {exc}")
        except RuntimeError:
            raise
        except requests.RequestException as exc:
            if attempt < 2:
                time.sleep(2 ** attempt)
                continue
            raise RuntimeError(f"Network error: {exc}")

    raise RuntimeError("Vision scan failed after all retries")


def _mock_scan_result(questions: list) -> dict:
    """
    Return a fake scan result for demo/testing when no API key is set
    or when all vision models fail.
    65% chance of getting each answer correct (mimics a real student).
    """
    answers = []
    correct_count = 0

    for i, q in enumerate(questions):
        ci = q.get("correctAnswer", 0)
        opts = q.get("options", [])
        # 65% chance of picking the right answer
        si = ci if random.random() < 0.65 else (ci + 1) % max(len(opts), 1)
        ok = si == ci
        if ok:
            correct_count += 1
        answers.append({
            "question_number":      i + 1,
            "question_text":        q.get("text", "")[:60],
            "student_answer_raw":   "ABCD"[si] if si < 4 else "A",
            "student_answer_index": si,
            "correct_answer_index": ci,
            "is_correct":           ok,
            "confidence":           "medium",
            "marks_obtained":       q.get("marks", 1) if ok else 0,
            "marks_total":          q.get("marks", 1),
        })

    total = len(questions)
    pct   = round(correct_count / total * 100, 1) if total else 0
    return {
        "answers":          answers,
        "total_correct":    correct_count,
        "total_questions":  total,
        "score_percentage": pct,
        "overall_feedback": f"Demo scan: {correct_count}/{total} correct ({pct}%).",
        "legibility":       "clear",
        "scan_notes":       "⚠️ DEMO MODE — Vision scan unavailable. Results are randomly generated.",
        "model_used":       "mock",
    }


def _unique_quiz_code() -> str:
    """Generate a unique 6-character quiz code that doesn't exist in the DB yet."""
    while True:
        code = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
        if not mongo.db.offline_quizzes.find_one({"quiz_code": code}):
            return code


# ── Routes ────────────────────────────────────────────────────────────────────

@offline_bp.route("/generate", methods=["POST"])
@token_required
def generate_offline_quiz(current_user):
    """
    Generate an AI quiz, store it in the DB, and return the quiz code + questions.

    Request body (JSON):
      country_id    string  required
      exam_id       string  optional — specific exam by MongoDB _id
      exam_name     string  optional — fallback exam lookup by name
      difficulty    string  easy | medium | hard  (default: medium)
      count         int     number of questions 5–30 (default: 10)
      student_name  string  optional — printed on the answer sheet
    """
    data         = request.get_json(force=True) or {}
    user_id      = str(current_user["_id"])
    country_id   = clean_str(data.get("country_id"))
    exam_id      = clean_str(data.get("exam_id"))
    exam_name    = clean_str(data.get("exam_name"))
    difficulty   = clean_str(data.get("difficulty"), "medium")
    count        = max(5, min(int(data.get("count", 10)), 30))
    student_name = clean_str(data.get("student_name"))

    if not country_id:
        return error_response("country_id is required", 400)

    # Resolve which exam to use: by ID → by name → first in country list
    exam = None
    if exam_id:
        exam = ExamModel.get_by_id(exam_id)
    if not exam and exam_name:
        exams = get_or_create_exams_for_country(country_id)
        exam  = next((e for e in exams if e.get("name", "").lower() == exam_name.lower()), None)
    if not exam:
        exams = get_or_create_exams_for_country(country_id)
        exam  = exams[0] if exams else {"name": "General Quiz", "_id": ""}

    pack      = generate_questions_for_exam(exam, "", "mcq", difficulty, count)
    questions = pack.get("questions", [])
    if not questions:
        return error_response("Failed to generate questions. Please try again.", 500)

    quiz_code = _unique_quiz_code()

    doc = {
        "quiz_code":    quiz_code,
        "user_id":      user_id,
        "exam_id":      str(exam.get("_id", "")),
        "exam_name":    exam.get("name", "Quiz"),
        "country_id":   country_id,
        "difficulty":   difficulty,
        "questions":    questions,
        "total_marks":  sum(q.get("marks", 1) for q in questions),
        "student_name": student_name,
        "ai_source":    pack.get("source", "ai"),
        "status":       "pending",
        "created_at":   datetime.now(timezone.utc),
        "scan_result":  None,
    }
    mongo.db.offline_quizzes.insert_one(doc)
    logger.info("Offline quiz generated: code=%s exam=%s", quiz_code, exam.get("name"))

    return jsonify({
        "success":     True,
        "quiz_code":   quiz_code,
        "exam_name":   exam.get("name"),
        "difficulty":  difficulty,
        "count":       len(questions),
        "total_marks": doc["total_marks"],
        "questions":   questions,
        "ai_source":   pack.get("source"),
    }), 201


@offline_bp.route("/download/<quiz_code>", methods=["GET"])
@token_required
def get_quiz_for_print(current_user, quiz_code):
    """
    Return quiz data as JSON so the frontend can render and print it.
    PDF generation has moved to the frontend.

    Query param: ?answer_key=true  →  include correct answers (teacher copy)
    """
    quiz = mongo.db.offline_quizzes.find_one({"quiz_code": quiz_code.upper()})
    if not quiz:
        return error_response("Quiz not found", 404)

    include_answers = request.args.get("answer_key", "").lower() == "true"
    questions = quiz.get("questions", [])

    # Strip correct answers from student copy
    if not include_answers:
        questions = [
            {k: v for k, v in q.items() if k not in ("correctAnswer", "explanation")}
            for q in questions
        ]

    return jsonify({
        "success":       True,
        "quiz_code":     quiz_code.upper(),
        "exam_name":     quiz.get("exam_name", "Quiz"),
        "student_name":  quiz.get("student_name", ""),
        "difficulty":    quiz.get("difficulty", "medium"),
        "total_marks":   quiz.get("total_marks", 0),
        "is_answer_key": include_answers,
        "questions":     questions,
    }), 200


@offline_bp.route("/quiz/<quiz_code>", methods=["GET"])
@token_required
def get_quiz(current_user, quiz_code):
    """Return the full stored quiz document (including scan result if available)."""
    quiz = mongo.db.offline_quizzes.find_one({"quiz_code": quiz_code.upper()})
    if not quiz:
        return error_response("Quiz not found", 404)
    return jsonify({"success": True, "quiz": doc_to_json(quiz)}), 200


@offline_bp.route("/my-quizzes", methods=["GET"])
@token_required
def my_quizzes(current_user):
    """List all quizzes generated by the current user (questions excluded for speed)."""
    user_id = str(current_user["_id"])
    quizzes = list(
        mongo.db.offline_quizzes
        .find({"user_id": user_id}, {"questions": 0})
        .sort("created_at", -1)
        .limit(50)
    )
    return jsonify({"success": True, "quizzes": doc_to_json(quizzes), "count": len(quizzes)}), 200


@offline_bp.route("/scan", methods=["POST"])
@token_required
def scan_answer_sheet(current_user):
    """
    Scan a completed answer sheet image using OpenRouter vision AI.

    Accepts multipart/form-data:
      image     file    the answer sheet photo
      quiz_code string

    OR application/json:
      image_b64 string  base64-encoded image
      mime_type string  e.g. "image/jpeg"
      quiz_code string
    """
    quiz_code = None
    image_b64 = None
    mime_type = "image/jpeg"

    if request.content_type and "multipart" in request.content_type:
        quiz_code = clean_str(request.form.get("quiz_code"))
        img_file  = request.files.get("image")
        if not img_file:
            return error_response("No image file provided", 400)
        image_b64 = base64.b64encode(img_file.read()).decode("utf-8")
        mime_type = img_file.content_type or "image/jpeg"
    else:
        data      = request.get_json(force=True) or {}
        quiz_code = clean_str(data.get("quiz_code"))
        image_b64 = data.get("image_b64", "")
        mime_type = data.get("mime_type", "image/jpeg")

    if not quiz_code:
        return error_response("quiz_code is required", 400)
    if not image_b64:
        return error_response("image data is required", 400)

    quiz = mongo.db.offline_quizzes.find_one({"quiz_code": quiz_code.upper()})
    if not quiz:
        return error_response(f"Quiz '{quiz_code}' not found", 404)

    try:
        scan_result = _openrouter_vision_scan(image_b64, mime_type, quiz.get("questions", []))
    except Exception as exc:
        logger.warning("Vision scan failed, using mock result: %s", exc)
        scan_result = _mock_scan_result(quiz.get("questions", []))
        scan_result["scan_notes"] = f"Vision scan failed: {exc}. Showing demo results."

    mongo.db.offline_quizzes.update_one(
        {"quiz_code": quiz_code.upper()},
        {"$set": {"status": "scanned", "scan_result": scan_result, "scanned_at": datetime.now(timezone.utc)}},
    )

    return jsonify({
        "success":     True,
        "quiz_code":   quiz_code.upper(),
        "exam_name":   quiz.get("exam_name"),
        "scan_result": scan_result,
    }), 200


@offline_bp.route("/save-result", methods=["POST"])
@token_required
def save_scan_result(current_user):
    """
    Save the confirmed scan result into the performance hub (test_results collection).
    Call this after the student reviews and confirms the scan is correct.

    Request body (JSON):
      quiz_code  string  required
    """
    data      = request.get_json(force=True) or {}
    quiz_code = clean_str(data.get("quiz_code"))
    if not quiz_code:
        return error_response("quiz_code is required", 400)

    quiz = mongo.db.offline_quizzes.find_one({"quiz_code": quiz_code.upper()})
    if not quiz:
        return error_response("Quiz not found", 404)

    scan = quiz.get("scan_result")
    if not scan:
        return error_response("No scan result found. Please scan the answer sheet first.", 400)

    user_id   = str(current_user["_id"])
    questions = quiz.get("questions", [])
    answers   = scan.get("answers", [])

    # Build a per-question breakdown for the performance hub
    breakdown = [
        {
            "question_id":   q.get("id", str(i)),
            "question_text": q.get("text", "")[:120],
            "topic":         q.get("topic", "General"),
            "is_correct":    bool((answers[i] if i < len(answers) else {}).get("is_correct", False)),
            "user_answer":   (answers[i] if i < len(answers) else {}).get("student_answer_raw", ""),
        }
        for i, q in enumerate(questions)
    ]

    score_pct = float(scan.get("score_percentage", 0))
    correct   = int(scan.get("total_correct", 0))

    result_doc = {
        "user_id":            user_id,
        "session_type":       "offline_quiz",
        "exam_name":          quiz.get("exam_name", "Offline Quiz"),
        "quiz_code":          quiz_code.upper(),
        "score":              score_pct,
        "total_questions":    len(questions),
        "correct_answers":    correct,
        "incorrect_answers":  len(questions) - correct,
        "accuracy":           score_pct,
        "grade":              calculate_grade(score_pct),
        "difficulty":         quiz.get("difficulty", "medium"),
        "question_breakdown": breakdown,
        "scan_feedback":      scan.get("overall_feedback", ""),
        "model_used":         scan.get("model_used", ""),
        "submitted_at":       datetime.now(timezone.utc),
    }

    result = mongo.db.test_results.insert_one(result_doc)
    mongo.db.offline_quizzes.update_one(
        {"quiz_code": quiz_code.upper()},
        {"$set": {"status": "submitted", "result_id": str(result.inserted_id)}},
    )

    logger.info("Offline result saved: quiz=%s user=%s score=%.1f%%", quiz_code, user_id, score_pct)

    return jsonify({
        "success":   True,
        "result_id": str(result.inserted_id),
        "score":     score_pct,
        "grade":     result_doc["grade"],
        "message":   "Result saved to your Performance Hub!",
    }), 200