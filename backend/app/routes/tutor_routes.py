"""
QuizGen Platform — AI Tutor Routes
FILE : app/routes/tutor_routes.py
PREFIX : /tutor

All 24/7 AI tutoring features.

  POST /tutor/chat             →  multi-turn conversational tutoring
  POST /tutor/explain          →  explain a concept at a given level
  POST /tutor/adaptive         →  generate adaptive follow-up questions
  POST /tutor/recommendations  →  personalised study recommendations
  GET  /tutor/risk             →  predict performance risk for an upcoming exam
  POST /tutor/save-session     →  save a tutor conversation to the DB
  GET  /tutor/sessions         →  get past tutor sessions
"""

from flask import Blueprint, request, jsonify

from ..services.tutor_service import (
    chat,
    explain,
    save_session,
    get_sessions,
)
from ..services.recommendation_service import (
    build_recommendations,
    get_risk_analysis,
)
from ..services.ai_service import generate_adaptive_questions
from ..utils.auth import token_required
from ..utils.helpers import error_response, clean_str

tutor_bp = Blueprint("tutor", __name__)


# ── POST /tutor/chat ──────────────────────────────────────────────────────────

@tutor_bp.route("/chat", methods=["POST"])
@token_required
def tutor_chat(current_user):
    """
    Multi-turn AI tutoring conversation.
    The client sends the full conversation history on each request so
    the AI has context (stateless design).

    Request body (JSON):
      messages  array  [{role: "user"|"assistant", content: "..."}]
      subject   string  e.g. "Physics", "Mathematics" (default: "General")
    """
    data     = request.get_json() or {}
    messages = data.get("messages", [])
    subject  = clean_str(data.get("subject"), "General")

    if not messages:
        return error_response("messages array is required", 400)

    result = chat(messages, subject)
    return jsonify({"success": True, **result}), 200


# ── POST /tutor/explain ───────────────────────────────────────────────────────

@tutor_bp.route("/explain", methods=["POST"])
@token_required
def tutor_explain(current_user):
    """
    Ask the AI to explain a concept with examples and memory tips.

    Request body (JSON):
      concept  string  required
      level    string  beginner | intermediate | advanced  (default: intermediate)
    """
    data    = request.get_json() or {}
    concept = clean_str(data.get("concept"))
    level   = clean_str(data.get("level"), "intermediate")

    if not concept:
        return error_response("concept is required", 400)

    result = explain(concept, level)
    return jsonify({"success": True, **result}), 200


# ── POST /tutor/adaptive ──────────────────────────────────────────────────────

@tutor_bp.route("/adaptive", methods=["POST"])
@token_required
def adaptive(current_user):
    """
    Generate adaptive follow-up questions based on what the student
    has already answered.  Difficulty auto-adjusts based on accuracy.

    Request body (JSON):
      topic     string  topic to generate questions about
      answered  array   [{correct: bool, difficulty: str, topic: str}, ...]
      count     int     how many new questions (default: 5, max: 10)
    """
    data     = request.get_json() or {}
    topic    = clean_str(data.get("topic"), "General Knowledge")
    answered = data.get("answered", [])
    count    = min(int(data.get("count", 5)), 10)

    questions = generate_adaptive_questions(topic, answered, count)
    return jsonify({
        "success":   True,
        "questions": questions,
        "count":     len(questions),
    }), 200


# ── POST /tutor/recommendations ───────────────────────────────────────────────

@tutor_bp.route("/recommendations", methods=["POST"])
@token_required
def recommendations(current_user):
    """
    Generate personalised study recommendations based on the student's
    performance history.

    Request body (JSON):
      exam_type       string  e.g. "JEE Main", "SAT"
      learning_style  string  visual | auditory | reading | kinesthetic
    """
    data           = request.get_json() or {}
    uid            = str(current_user["_id"])
    exam_type      = clean_str(data.get("exam_type"), "General Exam")
    learning_style = clean_str(data.get("learning_style"), "visual")

    recs = build_recommendations(uid, exam_type, learning_style)
    return jsonify({"success": True, **recs}), 200


# ── GET /tutor/risk ───────────────────────────────────────────────────────────

@tutor_bp.route("/risk", methods=["GET"])
@token_required
def risk(current_user):
    """
    Predict the student's performance risk for an upcoming exam.
    Returns risk level (low/medium/high), pass probability, and
    an intervention plan.

    Query params:
      exam  string  name of the upcoming exam (optional)
    """
    uid          = str(current_user["_id"])
    upcoming     = request.args.get("exam", "")

    analysis = get_risk_analysis(uid, upcoming)
    return jsonify({"success": True, **analysis}), 200


# ── POST /tutor/save-session ──────────────────────────────────────────────────

@tutor_bp.route("/save-session", methods=["POST"])
@token_required
def save_tutor_session(current_user):
    """
    Persist a tutor conversation so the student can review it later.

    Request body (JSON):
      subject   string
      messages  array  [{role, content}]
      concepts  array  list of concepts discussed
    """
    data    = request.get_json() or {}
    uid     = str(current_user["_id"])
    subject = clean_str(data.get("subject"), "General")

    session_id = save_session(
        user_id  = uid,
        subject  = subject,
        messages = data.get("messages", []),
        concepts = data.get("concepts", []),
    )
    return jsonify({"success": True, "session_id": session_id}), 200


# ── GET /tutor/sessions ───────────────────────────────────────────────────────

@tutor_bp.route("/sessions", methods=["GET"])
@token_required
def tutor_sessions(current_user):
    """Return all past tutor sessions for the current user."""
    uid      = str(current_user["_id"])
    sessions = get_sessions(uid)
    return jsonify({"success": True, "sessions": sessions}), 200
