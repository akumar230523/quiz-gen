"""
QuizGen Platform — Practice Routes
FILE : app/routes/practice_routes.py
PREFIX : /practice

AI-powered adaptive practice sessions for individual learners (B2C).

  GET  /practice/exams/<country_id>  →  list available exams for a country
  POST /practice/generate            →  generate a personalised AI practice session
  POST /practice/save                →  save a completed practice session
  GET  /practice/history             →  get the user's practice history
"""

from datetime import datetime

from flask import Blueprint, request, jsonify

from ..models.exam_model import ExamModel
from ..services.exam_service import get_or_create_exams_for_country
from ..services.ai_service import generate_questions_for_exam
from ..services.practice_service import save_session, get_history
from ..utils.auth import token_required
from ..utils.helpers import error_response, clean_str

practice_bp = Blueprint("practice", __name__)


# ── GET /practice/exams/<country_id> ─────────────────────────────────────────

@practice_bp.route("/exams/<country_id>", methods=["GET"])
@token_required
def get_exams(current_user, country_id):
    """
    Return all exams available for a country so the student can pick one.
    Creates the exam documents if they don't exist yet.
    """
    if not country_id:
        return error_response("country_id is required", 400)

    exams = get_or_create_exams_for_country(country_id)
    if not exams:
        return error_response("No exams found for this country", 404)

    # Return only the fields the frontend dropdown needs
    return jsonify({
        "success": True,
        "exams": [
            {
                "id":          str(e.get("_id", "")),
                "name":        e.get("name", ""),
                "description": e.get("description", ""),
                "duration":    e.get("duration", 60),
                "difficulty":  e.get("difficulty", "medium"),
            }
            for e in exams
        ],
    }), 200


# ── POST /practice/generate ───────────────────────────────────────────────────

@practice_bp.route("/generate", methods=["POST"])
@token_required
def generate(current_user):
    """
    Generate an AI-powered practice session for a specific exam.

    The AI is given the exam's real-world profile (JEE level, SAT level, etc.)
    so questions match the actual exam's difficulty and style.

    Request body (JSON):
      country_id  string  required
      exam_id     string  optional — MongoDB _id of a specific exam
      exam_name   string  optional — fallback if exam_id not provided
      exam_type   string  mcq | descriptive  (default: mcq)
      difficulty  string  easy | medium | hard  (default: medium)
      count       int     number of questions (default: 20)
    """
    data = request.get_json() or {}

    country_id = clean_str(data.get("country_id"))
    exam_id    = clean_str(data.get("exam_id"))
    exam_name  = clean_str(data.get("exam_name"))
    exam_type  = clean_str(data.get("exam_type"), "mcq").lower()
    difficulty = clean_str(data.get("difficulty"), "medium").lower()
    count      = int(data.get("count", 20))

    if not country_id:
        return error_response("country_id is required", 400)

    # ── Resolve which exam to generate questions for ───────────────────────
    exam = None

    # Priority 1: specific exam by MongoDB _id
    if exam_id:
        exam = ExamModel.get_by_id(exam_id)

    # Priority 2: find by name within this country's exam list
    if not exam and exam_name:
        country_exams = get_or_create_exams_for_country(country_id)
        exam = next(
            (e for e in country_exams if e.get("name", "").lower() == exam_name.lower()),
            None,
        )

    # Priority 3: first exam in the country list
    if not exam:
        country_exams = get_or_create_exams_for_country(country_id)
        if not country_exams:
            return error_response("No exams found for this country", 404)
        exam = country_exams[0]

    print(f"[PRACTICE] exam='{exam.get('name')}' | type={exam_type} | diff={difficulty} | count={count}")

    # ── Generate questions ─────────────────────────────────────────────────
    pack      = generate_questions_for_exam(exam, "", exam_type, difficulty, count)
    questions = pack.get("questions", [])

    if not questions:
        return error_response("Failed to generate questions. Please try again.", 500)

    return jsonify({
        "success": True,
        "practice": {
            "session_title":     exam.get("name", "Practice Session"),
            "exam_name":         exam.get("name", ""),
            "exam_description":  exam.get("description", ""),
            "questions":         questions,
            "total_questions":   len(questions),
            "estimated_minutes": exam.get("duration", 20),
            "difficulty":        difficulty,
            "source":            pack.get("source", "ai"),
            "ai_working":        pack.get("source") == "openrouter",
        },
    }), 200


# ── POST /practice/save ───────────────────────────────────────────────────────

@practice_bp.route("/save", methods=["POST"])
@token_required
def save_practice(current_user):
    """
    Save a completed practice session.
    Called by the frontend after the student finishes a session.

    Request body (JSON):
      country           string
      exam_type         string
      exam_name         string
      questions_attempted int
      total_questions   int
      questions_correct int
      time_taken        int   seconds
      topics_covered    array
      answers           object  {question_id: selected_index}
    """
    data = request.get_json() or {}
    uid  = str(current_user["_id"])

    session_id = save_session(uid, data)

    total_q  = int(data.get("total_questions", 0))
    correct  = int(data.get("questions_correct", 0))
    score_pct = round(correct / total_q * 100) if total_q else 0

    print(f"[PRACTICE] Saved — user={uid} | exam={data.get('exam_name')} | score={score_pct}%")

    return jsonify({
        "success":    True,
        "message":    "Practice session saved",
        "session_id": session_id,
        "score_pct":  score_pct,
    }), 200


# ── GET /practice/history ─────────────────────────────────────────────────────

@practice_bp.route("/history", methods=["GET"])
@token_required
def practice_history(current_user):
    """
    Return paginated practice session history for the current user.

    Query params:
      page   int  (default: 1)
      limit  int  (default: 10)
    """
    uid   = str(current_user["_id"])
    page  = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 10))

    result = get_history(uid, page, limit)
    return jsonify({"success": True, **result}), 200
