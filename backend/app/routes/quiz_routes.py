"""
QuizGen Platform — Quiz Routes
FILE : app/routes/quiz_routes.py
PREFIX : /quiz

Public quiz flow for B2C students (country-based exams like JEE, SAT, NEET).

  GET  /quiz/countries              →  list all countries
  GET  /quiz/exams/<country_id>     →  list exams for a country
  GET  /quiz/exam/<exam_id>         →  get a single exam's details
  GET  /quiz/questions/<exam_id>    →  AI-generate questions for an exam
  POST /quiz/submit                 →  save a completed quiz result
  GET  /quiz/performance/<user_id>  →  full performance dashboard
  GET  /quiz/report/<result_id>     →  AI-generated report for one result
  POST /quiz/explain                →  AI explains a concept
"""

import logging
from datetime import datetime, timezone

from flask import Blueprint, request, jsonify

from ..models.exam_model import CountryModel, ExamModel
from ..services.exam_service import get_or_create_exams_for_country
from ..services.ai_service import (
    generate_questions_for_exam,
    generate_exam_report_insights,
    explain_concept,
    analyse_performance_trends,
)
from ..services.performance_service import (
    save_test_result,
    get_user_results,
    get_user_stats,
    get_topic_breakdown,
    get_result_by_id,
    get_result_by_offline_id,
)
from ..utils.auth import token_required
from ..utils.helpers import calculate_grade, error_response

quiz_bp = Blueprint("quiz", __name__)
logger = logging.getLogger(__name__)


# ── GET /quiz/countries ───────────────────────────────────────────────────────

@quiz_bp.route("/countries", methods=["GET"])
def get_countries():
    """Return all countries that have exam templates defined."""
    return jsonify(CountryModel.get_all()), 200


# ── GET /quiz/exams/<country_id> ──────────────────────────────────────────────

@quiz_bp.route("/exams/<country_id>", methods=["GET"])
def get_exams(country_id):
    """
    Return all exams for a country.
    Creates exam documents in MongoDB lazily on first request.
    """
    exams = get_or_create_exams_for_country(country_id)
    return jsonify(exams), 200


# ── GET /quiz/exam/<exam_id> ──────────────────────────────────────────────────

@quiz_bp.route("/exam/<exam_id>", methods=["GET"])
def get_exam(exam_id):
    """Return the details of a single exam by its MongoDB _id."""
    exam = ExamModel.get_by_id(exam_id)
    if not exam:
        return error_response("Exam not found", 404)
    return jsonify(exam), 200


# ── GET /quiz/questions/<exam_id> ─────────────────────────────────────────────

@quiz_bp.route("/questions/<exam_id>", methods=["GET"])
@token_required
def get_questions(current_user, exam_id):
    """
    AI-generate questions for a specific exam.

    Query params:
      count       int     number of questions (default 20, max 40)
      difficulty  string  easy | medium | hard  (default: medium)
      type        string  mcq | descriptive     (default: mcq)
    """
    exam = ExamModel.get_by_id(exam_id)
    if not exam:
        return error_response("Exam not found", 404)

    count      = min(int(request.args.get("count", 20)), 40)
    difficulty = request.args.get("difficulty", "medium")
    q_type     = request.args.get("type", "mcq")

    country      = CountryModel.get_by_id(str(exam.get("country_id", ""))) or {}
    country_name = country.get("name", "")

    pack = generate_questions_for_exam(exam, country_name, q_type, difficulty, count)

    return jsonify({
        "success":    True,
        "exam":       exam,
        "questions":  pack.get("questions", []),
        "total":      len(pack.get("questions", [])),
        "source":     pack.get("source"),
        "ai_working": pack.get("source") == "openrouter",
    }), 200


# ── POST /quiz/submit ─────────────────────────────────────────────────────────

@quiz_bp.route("/submit", methods=["POST"])
@token_required
def submit(current_user):
    """
    Save a completed quiz result.

    Supports offline sync — if a result with the same offline_id already
    exists for this user, returns "duplicate" instead of saving again.

    Request body (JSON):
      exam_id            string  required
      exam_name          string
      score              float   percentage 0–100
      total_questions    int
      correct_answers    int
      question_breakdown array   [{topic, is_correct, ...}]
      difficulty         string
      time_taken         int     seconds
      offline_id         string  optional — for offline sync dedup
    """
    data    = request.get_json() or {}
    user_id = str(current_user["_id"])

    if not data.get("exam_id"):
        return error_response("exam_id is required", 400)

    # Prevent duplicate sync of offline results
    offline_id = data.get("offline_id")
    if offline_id:
        existing = get_result_by_offline_id(user_id, offline_id)
        if existing:
            return jsonify({
                "success":   True,
                "status":    "duplicate",
                "message":   "This result was already synced",
                "result_id": existing.get("_id"),
            }), 200

    total_q = int(data.get("total_questions", 0))
    correct = int(data.get("correct_answers", 0))
    score   = float(data.get("score", 0))

    doc = {
        "user_id":            user_id,
        "session_type":       "quiz",
        "exam_id":            data.get("exam_id"),
        "exam_name":          data.get("exam_name", "Quiz"),
        "score":              score,
        "total_questions":    total_q,
        "correct_answers":    correct,
        "incorrect_answers":  total_q - correct,
        "accuracy":           round(correct / total_q * 100, 2) if total_q else 0,
        "grade":              calculate_grade(score),
        "difficulty":         data.get("difficulty", "medium"),
        "question_breakdown": data.get("question_breakdown", []),
        "time_taken":         data.get("time_taken"),
        "offline_id":         offline_id,
        "submitted_at":       datetime.now(timezone.utc),
    }

    result_id = save_test_result(doc)
    logger.info("Quiz submitted: user=%s exam=%s score=%.1f%%", user_id, data.get("exam_name"), score)

    return jsonify({
        "success":   True,
        "result_id": result_id,
        "score":     score,
        "accuracy":  doc["accuracy"],
        "grade":     doc["grade"],
    }), 200


# ── GET /quiz/performance/<user_id> ───────────────────────────────────────────

@quiz_bp.route("/performance/<user_id>", methods=["GET"])
@token_required
def performance(current_user, user_id):
    """
    Full performance dashboard for a user.
    Returns overall stats, AI trend analysis, per-topic breakdown, and recent history.
    Users can only view their own performance.
    """
    if str(current_user["_id"]) != user_id:
        return error_response("Access denied", 403)

    results   = get_user_results(user_id, limit=50)
    stats     = get_user_stats(user_id)
    breakdown = get_topic_breakdown(user_id)
    trends    = analyse_performance_trends(results)

    return jsonify({
        "success":   True,
        "stats":     stats,
        "trends":    trends,
        "breakdown": breakdown,
        "history":   results[:20],
    }), 200


# ── GET /quiz/report/<result_id> ──────────────────────────────────────────────

@quiz_bp.route("/report/<result_id>", methods=["GET"])
@token_required
def get_report(current_user, result_id):
    """
    Generate and return an AI analysis report for a single quiz result.
    The report is generated on-the-fly and not pre-stored.
    """
    result = get_result_by_id(result_id)
    if not result:
        return error_response("Result not found", 404)

    pct       = result.get("score", 0)
    perf_data = {
        "marks_percentage": pct,
        "correct_answers":  result.get("correct_answers", 0),
        "total_questions":  result.get("total_questions", 0),
        "grade":            calculate_grade(pct),
        "time_efficiency":  80,
    }

    insights = generate_exam_report_insights(
        exam_name         = result.get("exam_name", "Quiz"),
        performance_data  = perf_data,
        question_analysis = result.get("question_breakdown", []),
    )

    return jsonify({"success": True, "result": result, "insights": insights}), 200


# ── POST /quiz/explain ────────────────────────────────────────────────────────

@quiz_bp.route("/explain", methods=["POST"])
@token_required
def explain(current_user):
    """
    Ask the AI to explain a concept.

    Request body (JSON):
      concept  string  required  e.g. "photosynthesis", "Newton's third law"
      level    string  optional  beginner | intermediate | advanced
    """
    data    = request.get_json() or {}
    concept = (data.get("concept") or "").strip()
    level   = data.get("level", "intermediate")

    if not concept:
        return error_response("concept is required", 400)

    explanation = explain_concept(concept, level)
    return jsonify({"success": True, **explanation}), 200