"""
QuizGen Platform — Student Routes
FILE : app/routes/student_routes.py
PREFIX : /student

Handles the full lifecycle of a student taking an institute exam:
  start → answer → submit → view report
"""

import logging
from datetime import datetime, timezone

from flask import Blueprint, request, jsonify
from bson import ObjectId

from ..models.institute_model import InstituteExamModel
from ..models.attempt_model import AttemptModel
from ..models.report_model import ReportModel
from ..models.database import mongo, doc_to_json, to_oid
from ..services.ai_service import (
    generate_exam_report_insights,
    evaluate_descriptive_answer,
)
from ..utils.helpers import calculate_grade, error_response, clean_str

student_bp = Blueprint("student", __name__)
logger = logging.getLogger(__name__)


# ── GET /student/search/<query> ───────────────────────────────────────────────

@student_bp.route("/search/<query>", methods=["GET"])
def search_exams(query):
    """Search for published institute exams by institute name, ID, or exam ID."""
    search_filter = {
        "$or": [
            {"institute_id":   query},
            {"institute_name": {"$regex": query, "$options": "i"}},
            {"exam_id":        {"$regex": query, "$options": "i"}},
        ],
        "published": True,
    }
    exams = InstituteExamModel.get_all(search_filter)
    return jsonify({"success": True, "exams": exams, "count": len(exams)}), 200


# ── GET /student/exam/<identifier> ────────────────────────────────────────────

@student_bp.route("/exam/<identifier>", methods=["GET"])
def get_exam(identifier):
    """
    Get exam details. Accepts the human-readable exam_id or MongoDB _id.
    Correct answers are NOT returned until the student starts an attempt.
    """
    exam = InstituteExamModel.find_by_exam_id(identifier)

    if not exam:
        try:
            raw  = mongo.db.institute_exams.find_one({"_id": to_oid(identifier)})
            exam = doc_to_json(raw)
        except Exception:
            pass

    if not exam:
        return error_response("Exam not found", 404)

    safe_exam = {k: v for k, v in exam.items() if k != "questions"}
    safe_exam["question_count"] = len(exam.get("questions", []))

    return jsonify({"success": True, "exam": safe_exam}), 200


# ── POST /student/attempt/<exam_id> ───────────────────────────────────────────

@student_bp.route("/attempt/<exam_id>", methods=["POST"])
def start_attempt(exam_id):
    """
    Start a new exam attempt.
    One attempt per student per exam is enforced.

    Request body (JSON):
      student_id    string  any unique identifier
      student_name  string
      student_email string  optional
    """
    data = request.get_json(force=True) or {}

    student_id    = clean_str(data.get("student_id"), "anonymous")
    student_name  = clean_str(data.get("student_name"), "Student")
    student_email = clean_str(data.get("student_email"))

    exam = InstituteExamModel.find_by_exam_id(exam_id)
    if not exam:
        return error_response("Exam not found", 404)
    if not exam.get("published"):
        return error_response("This exam is not currently published", 403)

    existing = AttemptModel.find_active(student_id, exam_id)
    if existing:
        return jsonify({
            "success": False,
            "error":   "You have already attempted this exam.",
            "code":    "ALREADY_ATTEMPTED",
        }), 409

    attempt_doc = {
        "student_id":        student_id,
        "student_name":      student_name,
        "student_email":     student_email,
        "exam_id":           exam_id,
        "exam_name":         exam.get("name", ""),
        "institute_name":    exam.get("institute_name", ""),
        "started_at":        datetime.now(timezone.utc),
        "status":            "in_progress",
        "answers":           [],
        "obtained_marks":    0,
        "cheating_detected": False,
    }
    attempt_id = AttemptModel.create(attempt_doc)
    InstituteExamModel.increment_attempt_count(exam_id)

    logger.info(
        "Attempt started: exam=%s student=%s attempt=%s",
        exam_id, student_id, attempt_id,
    )

    return jsonify({
        "success":    True,
        "attempt_id": attempt_id,
        "exam": {
            "id":          exam.get("exam_id"),
            "name":        exam.get("name"),
            "description": exam.get("description"),
            "type":        exam.get("type"),
            "duration":    exam.get("duration"),
            "total_marks": exam.get("total_marks"),
            "questions":   exam.get("questions", []),
        },
        "cheating_detection_enabled": exam.get("cheating_detection", False),
    }), 200


# ── POST /student/submit/<attempt_id> ────────────────────────────────────────

@student_bp.route("/submit/<attempt_id>", methods=["POST"])
def submit_attempt(attempt_id):
    """
    Submit a completed attempt.
    Grades MCQ answers, AI-evaluates descriptive answers,
    generates an AI report, and saves everything.

    Request body (JSON):
      answers     object  {question_id: student_answer, ...}
      time_taken  int     minutes
    """
    data       = request.get_json(force=True) or {}
    answers    = data.get("answers", {})
    time_taken = int(data.get("time_taken", 0))

    attempt = AttemptModel.find_by_id(attempt_id)
    if not attempt:
        return error_response("Attempt not found", 404)
    if attempt.get("status") == "completed":
        return error_response("This attempt has already been submitted", 409)

    exam = InstituteExamModel.find_by_exam_id(attempt["exam_id"])
    if not exam:
        return error_response("Exam not found", 404)

    questions     = exam.get("questions", [])
    total_marks   = exam.get("total_marks") or sum(q.get("marks", 1) for q in questions)
    passing_marks = exam.get("passing_marks", round(total_marks * 0.4))

    # ── Grade every question ──────────────────────────────────────────────
    obtained_marks    = 0
    graded_answers    = []
    descriptive_evals = []

    for idx, question in enumerate(questions):
        q_id         = question.get("id", str(idx))
        q_type       = question.get("type", "mcq")
        marks_for_q  = question.get("marks", 1)
        correct_ans  = question.get("correctAnswer")
        student_ans  = answers.get(q_id)
        marks_awarded = 0
        is_correct    = None

        if q_type == "mcq" and correct_ans is not None and student_ans is not None:
            try:
                is_correct = int(student_ans) == int(correct_ans)
            except (ValueError, TypeError):
                is_correct = str(student_ans).strip() == str(correct_ans).strip()
            marks_awarded  = marks_for_q if is_correct else 0
            obtained_marks += marks_awarded

        elif q_type == "descriptive" and student_ans:
            eval_result    = evaluate_descriptive_answer(
                question  = question.get("text", ""),
                answer    = str(student_ans),
                max_marks = marks_for_q,
            )
            marks_awarded  = eval_result.get("score", 0)
            obtained_marks += marks_awarded
            descriptive_evals.append({
                "question_number": idx + 1,
                "score":           marks_awarded,
                "max_score":       marks_for_q,
                "feedback":        eval_result.get("feedback", ""),
            })

        graded_answers.append({
            "question_id":    q_id,
            "question_text":  question.get("text", ""),
            "question_type":  q_type,
            "student_answer": student_ans,
            "correct_answer": correct_ans,
            "is_correct":     is_correct,
            "marks_obtained": marks_awarded,
            "total_marks":    marks_for_q,
        })

    percentage = round(obtained_marks / total_marks * 100, 2) if total_marks else 0
    passed     = obtained_marks >= passing_marks
    grade      = calculate_grade(percentage)
    correct_count = sum(1 for a in graded_answers if a.get("is_correct"))
    now        = datetime.now(timezone.utc)

    AttemptModel.update(attempt_id, {
        "status":             "completed",
        "completed_at":       now,
        "answers":            graded_answers,
        "obtained_marks":     obtained_marks,
        "total_marks":        total_marks,
        "percentage":         percentage,
        "passed":             passed,
        "grade":              grade,
        "time_taken_minutes": time_taken,
    })

    perf_data = {
        "marks_percentage": percentage,
        "correct_answers":  correct_count,
        "total_questions":  len(questions),
        "grade":            grade,
        "time_efficiency":  min(round(time_taken / max(exam.get("duration", 60), 1) * 100), 100),
    }

    ai_insights = generate_exam_report_insights(
        exam_name         = exam.get("name", "Exam"),
        performance_data  = perf_data,
        question_analysis = graded_answers,
    )

    report_doc = {
        "report_id":      str(ObjectId()),
        "attempt_id":     attempt_id,
        "student_id":     attempt["student_id"],
        "student_name":   attempt.get("student_name", ""),
        "exam_id":        attempt["exam_id"],
        "exam_name":      exam.get("name", ""),
        "institute_name": exam.get("institute_name", ""),
        "subject":        exam.get("subject", ""),
        "generated_at":   now,
        "exam_details": {
            "name":            exam.get("name"),
            "type":            exam.get("type"),
            "duration":        exam.get("duration"),
            "difficulty":      exam.get("difficulty"),
            "total_marks":     total_marks,
            "passing_marks":   passing_marks,
            "total_questions": len(questions),
        },
        "performance": {
            **perf_data,
            "obtained_marks":    obtained_marks,
            "passed":            passed,
            "time_taken":        time_taken,
            "performance_level": ai_insights.get("performance_level", ""),
        },
        "answers_analysis":  graded_answers,
        "descriptive_evals": descriptive_evals,
        "insights":          ai_insights.get("insights", []),
        "strengths":         ai_insights.get("strengths", []),
        "weaknesses":        ai_insights.get("weaknesses", []),
        "recommendations":   ai_insights.get("recommendations", []),
        "study_plan":        ai_insights.get("study_plan", {}),
    }

    ReportModel.create(report_doc)
    logger.info(
        "Attempt submitted: attempt=%s exam=%s score=%.1f%% passed=%s",
        attempt_id, attempt["exam_id"], percentage, passed,
    )

    return jsonify({
        "success":   True,
        "report_id": report_doc["report_id"],
        "score":     obtained_marks,
        "percentage":percentage,
        "passed":    passed,
        "grade":     grade,
        "message":   "Exam submitted successfully. Your report is ready.",
    }), 200


# ── GET /student/report/<report_id> ──────────────────────────────────────────

@student_bp.route("/report/<report_id>", methods=["GET"])
def get_report(report_id):
    """Retrieve a student's exam report by UUID report_id or attempt_id."""
    report = ReportModel.find_by_report_id(report_id)
    if not report:
        report = ReportModel.find_by_attempt(report_id)
    if not report:
        return error_response("Report not found", 404)

    cheating_logs = doc_to_json(
        list(
            mongo.db.cheating_logs
            .find({"attempt_id": report.get("attempt_id", "")})
            .sort("timestamp", 1)
        )
    )
    report["cheating_logs"] = cheating_logs
    return jsonify({"success": True, "report": report}), 200


# ── GET /student/history/<student_id> ────────────────────────────────────────

@student_bp.route("/history/<student_id>", methods=["GET"])
def get_history(student_id):
    """Return all past attempts and reports for a student."""
    attempts = AttemptModel.get_student_history(student_id)
    reports  = ReportModel.get_student_reports(student_id)
    return jsonify({
        "success":  True,
        "attempts": attempts,
        "reports":  reports,
    }), 200