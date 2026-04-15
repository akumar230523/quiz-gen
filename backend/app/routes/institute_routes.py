"""
QuizGen Platform — Institute Routes
FILE : app/routes/institute_routes.py
PREFIX : /institute

Institute users create and manage their own exams.
"""

import logging
from datetime import datetime, timezone

from flask import Blueprint, request, jsonify
from bson import ObjectId

from ..models.institute_model import InstituteExamModel
from ..models.attempt_model import AttemptModel
from ..models.database import mongo, doc_to_json
from ..services.ai_service import generate_questions
from ..utils.auth import token_required
from ..utils.helpers import (
    error_response, build_score_distribution, clean_str, clamp
)

institute_bp = Blueprint("institute", __name__)
logger = logging.getLogger(__name__)


# ── POST /institute/generate-questions ────────────────────────────────────────

@institute_bp.route("/generate-questions", methods=["POST"])
@token_required
def generate_ai_questions(current_user):
    """
    Ask the AI to generate questions for a given topic.

    Request body (JSON):
      topic       string  required
      type        string  mcq | descriptive  (default: mcq)
      difficulty  string  easy | medium | hard  (default: medium)
      count       int     1–30  (default: 5)
      prompt      string  optional extra instructions for the AI
    """
    data = request.get_json(force=True) or {}

    topic      = clean_str(data.get("topic") or data.get("description"), "General Knowledge")
    q_type     = clean_str(data.get("type"), "mcq").lower()
    difficulty = clean_str(data.get("difficulty"), "medium")
    count      = clamp(int(data.get("count", data.get("num_questions", 5))), 1, 30)
    extra      = clean_str(data.get("prompt"))

    questions = generate_questions(topic, q_type, difficulty, count, extra)
    return jsonify({
        "success":   True,
        "questions": questions,
        "count":     len(questions),
    }), 200


# ── POST /institute/create-exam ───────────────────────────────────────────────

@institute_bp.route("/create-exam", methods=["POST"])
@token_required
def create_exam(current_user):
    """
    Create and immediately publish a new institute exam.
    Required fields: name, instituteName, examId, questions
    """
    data = request.get_json(force=True) or {}

    required = ["name", "instituteName", "examId", "questions"]
    missing  = [f for f in required if not data.get(f)]
    if missing:
        return error_response(f"Missing required fields: {', '.join(missing)}", 400)

    exam_id = clean_str(data["examId"])
    if InstituteExamModel.find_by_exam_id(exam_id):
        return error_response(
            f"Exam ID '{exam_id}' is already taken. Choose a different ID.", 409
        )

    questions     = data.get("questions", [])
    total_marks   = data.get("totalMarks") or sum(q.get("marks", 1) for q in questions)
    passing_marks = data.get("passingMarks") or round(total_marks * 0.4)
    now           = datetime.now(timezone.utc)

    doc = {
        "name":               clean_str(data["name"]),
        "institute_name":     clean_str(data["instituteName"]),
        "institute_id":       data.get("instituteId") or str(current_user["_id"]),
        "created_by":         str(current_user["_id"]),
        "exam_id":            exam_id,
        "description":        clean_str(data.get("description")),
        "type":               data.get("type", "mcq"),
        "duration":           int(data.get("duration", 60)),
        "difficulty":         data.get("difficulty", "medium"),
        "subject":            clean_str(data.get("subject")),
        "questions":          questions,
        "total_marks":        total_marks,
        "passing_marks":      passing_marks,
        "ai_generated":       bool(data.get("aiGenerate", False)),
        "cheating_detection": bool(data.get("enableCheatingDetection", False)),
        "published":          True,
        "attempt_count":      0,
        "created_at":         now,
        "updated_at":         now,
    }

    inserted_id = InstituteExamModel.create(doc)
    logger.info("Exam created: exam_id=%s by user=%s", exam_id, current_user.get("username"))

    return jsonify({
        "success": True,
        "message": "Exam created and published successfully",
        "exam_id": exam_id,
        "_id":     inserted_id,
    }), 201


# ── GET /institute/my-exams ───────────────────────────────────────────────────

@institute_bp.route("/my-exams", methods=["GET"])
@token_required
def my_exams(current_user):
    """Return all exams created by the currently authenticated institute user."""
    exams = InstituteExamModel.get_by_institute(str(current_user["_id"]))
    return jsonify({"success": True, "exams": exams, "count": len(exams)}), 200


# ── GET /institute/list-exams ─────────────────────────────────────────────────

@institute_bp.route("/list-exams", methods=["GET"])
def list_all_exams():
    """List all published exams. Optional query param: institute_id."""
    institute_id = request.args.get("institute_id")
    query = {"institute_id": institute_id, "published": True} if institute_id else {"published": True}
    exams = InstituteExamModel.get_all(query)
    return jsonify({"success": True, "exams": exams, "count": len(exams)}), 200


# ── GET /institute/exam/<exam_id>/exists ──────────────────────────────────────

@institute_bp.route("/exam/<exam_id>/exists", methods=["GET"])
def check_exam_exists(exam_id):
    """Check whether a human-readable exam_id is already in use."""
    exam = InstituteExamModel.find_by_exam_id(exam_id)
    if exam:
        return jsonify({
            "success":   True,
            "exists":    True,
            "exam_info": {
                "name":           exam.get("name"),
                "institute_name": exam.get("institute_name"),
                "subject":        exam.get("subject"),
                "type":           exam.get("type"),
            },
        }), 200
    return jsonify({"success": True, "exists": False}), 200


# ── PUT /institute/exam/<exam_id> ─────────────────────────────────────────────

@institute_bp.route("/exam/<exam_id>", methods=["PUT"])
@token_required
def update_exam(current_user, exam_id):
    """Update an existing exam. Only the creator can update it."""
    exam = InstituteExamModel.find_by_exam_id(exam_id)
    if not exam:
        return error_response("Exam not found", 404)
    if exam.get("created_by") != str(current_user["_id"]):
        return error_response("You are not authorised to edit this exam", 403)

    data = request.get_json() or {}
    allowed_keys = {
        "name", "description", "questions", "duration",
        "total_marks", "passing_marks", "published",
        "difficulty", "subject",
    }
    update = {k: v for k, v in data.items() if k in allowed_keys}

    if not update:
        return error_response("No updatable fields provided", 400)

    update["updated_at"] = datetime.now(timezone.utc)
    InstituteExamModel.update(exam_id, update)
    return jsonify({"success": True, "message": "Exam updated successfully"}), 200


# ── DELETE /institute/exam/<exam_id> ──────────────────────────────────────────

@institute_bp.route("/exam/<exam_id>", methods=["DELETE"])
@token_required
def delete_exam(current_user, exam_id):
    """Delete an exam. Only the creator can delete it."""
    exam = InstituteExamModel.find_by_exam_id(exam_id)
    if not exam:
        return error_response("Exam not found", 404)
    if exam.get("created_by") != str(current_user["_id"]):
        return error_response("You are not authorised to delete this exam", 403)

    InstituteExamModel.delete(exam_id)
    logger.info("Exam deleted: exam_id=%s by user=%s", exam_id, current_user.get("username"))
    return jsonify({"success": True, "message": "Exam deleted"}), 200


# ── GET /institute/analytics/<exam_id> ────────────────────────────────────────

@institute_bp.route("/analytics/<exam_id>", methods=["GET"])
@token_required
def get_analytics(current_user, exam_id):
    """Detailed analytics for an exam — score distribution, pass rate, per-student results."""
    exam = InstituteExamModel.find_by_exam_id(exam_id)
    if not exam:
        return error_response("Exam not found", 404)

    attempts = list(
        mongo.db.exam_attempts.find({"exam_id": exam_id, "status": "completed"})
    )
    total = len(attempts)

    if total == 0:
        return jsonify({"success": True, "analytics": _empty_analytics(exam)}), 200

    total_marks   = exam.get("total_marks", 100)
    passing_marks = exam.get("passing_marks", 40)
    scores, student_rows = [], []

    for attempt in attempts:
        obtained = attempt.get("obtained_marks", 0)
        pct      = attempt.get("percentage") or (
            round(obtained / total_marks * 100, 2) if total_marks else 0
        )
        scores.append(pct)
        student_rows.append({
            "student_id":     attempt.get("student_id"),
            "student_name":   attempt.get("student_name", "Anonymous"),
            "student_email":  attempt.get("student_email", ""),
            "score":          round(pct, 1),
            "obtained_marks": obtained,
            "status":         "pass" if obtained >= passing_marks else "fail",
            "time_taken":     attempt.get("time_taken_minutes", 0),
            "cheating":       attempt.get("cheating_detected", False),
            "submitted_at":   attempt.get("completed_at", ""),
        })

    pass_count = sum(1 for r in student_rows if r["status"] == "pass")
    avg_score  = sum(scores) / total

    return jsonify({
        "success": True,
        "analytics": {
            "exam_id":            exam_id,
            "exam_name":          exam.get("name"),
            "institute_name":     exam.get("institute_name"),
            "subject":            exam.get("subject"),
            "total_students":     total,
            "average_score":      round(avg_score, 2),
            "highest_score":      round(max(scores), 1),
            "lowest_score":       round(min(scores), 1),
            "pass_count":         pass_count,
            "fail_count":         total - pass_count,
            "pass_percentage":    round(pass_count / total * 100, 2),
            "score_distribution": build_score_distribution(scores),
            "student_results":    sorted(student_rows, key=lambda x: x["score"], reverse=True),
        },
    }), 200


# ── POST /institute/log-cheating ──────────────────────────────────────────────

@institute_bp.route("/log-cheating", methods=["POST"])
def log_cheating():
    """
    Log a cheating event from the student's browser.
    No auth needed — works even if the student's session expired.
    """
    data       = request.get_json(force=True) or {}
    attempt_id = clean_str(data.get("attempt_id"))
    event_type = clean_str(data.get("event_type"), "unknown")

    if not attempt_id:
        return error_response("attempt_id is required", 400)

    AttemptModel.log_cheating_event(attempt_id, {
        "event_type": event_type,
        "details":    clean_str(data.get("details")),
        "timestamp":  datetime.now(timezone.utc),
    })
    AttemptModel.update(attempt_id, {"cheating_detected": True})

    logger.warning("Cheating event logged: attempt=%s type=%s", attempt_id, event_type)
    return jsonify({"success": True, "message": "Event logged"}), 200


# ── Helpers ───────────────────────────────────────────────────────────────────

def _empty_analytics(exam: dict) -> dict:
    return {
        "exam_id":            exam.get("exam_id"),
        "exam_name":          exam.get("name"),
        "institute_name":     exam.get("institute_name"),
        "total_students":     0,
        "average_score":      0,
        "pass_percentage":    0,
        "student_results":    [],
        "score_distribution": [],
    }