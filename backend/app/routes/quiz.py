"""Quiz Routes - Countries, Exams, Test Generation, Submit, Performance."""

from datetime import datetime
from flask import Blueprint, request, jsonify
from ..models.database import CountryModel, ExamModel, doc_to_json
from ..services.exam_service import get_or_create_exams_for_country
from ..services.ai_service import (
    generate_full_test, generate_questions_for_exam,
    generate_exam_report_insights, explain_concept,
)
from ..services.performance_service import (
    save_test_result, get_user_results, get_user_stats,
    get_topic_breakdown, get_result_by_id,
)
from ..services.recommendation_service import get_risk_analysis
from ..services.ai_service import analyse_performance_trends
from ..utils.auth import token_required

quiz_bp = Blueprint("quiz", __name__)


@quiz_bp.route("/countries", methods=["GET"])
def get_countries():
    return jsonify(CountryModel.get_all()), 200


@quiz_bp.route("/exams/<country_id>", methods=["GET"])
def get_exams(country_id):
    return jsonify(get_or_create_exams_for_country(country_id)), 200


@quiz_bp.route("/exam/<exam_id>", methods=["GET"])
def get_exam(exam_id):
    exam = ExamModel.get_by_id(exam_id)
    if not exam:
        return jsonify({"error": "Exam not found"}), 404
    return jsonify(exam), 200


@quiz_bp.route("/generate-test/<exam_id>", methods=["GET"])
@token_required
def generate_test(current_user, exam_id):
    exam = ExamModel.get_by_id(exam_id)
    if not exam:
        return jsonify({"error": "Exam not found"}), 404
    test = generate_full_test(exam["name"], exam.get("duration", 60))
    return jsonify({"exam": exam, "test_content": test}), 200


@quiz_bp.route("/questions/<exam_id>", methods=["GET"])
@token_required
def get_questions(current_user, exam_id):
    exam = ExamModel.get_by_id(exam_id)
    if not exam:
        return jsonify({"error": "Exam not found"}), 404
    count      = min(int(request.args.get("count", 20)), 40)
    difficulty = request.args.get("difficulty", "medium")
    q_type     = request.args.get("type", "mcq")
    country = CountryModel.get_by_id(exam.get("country_id")) or {}
    country_name = country.get("name", "")
    pack = generate_questions_for_exam(exam, country_name, q_type, difficulty, count)
    questions = pack.get("questions") or []
    return jsonify({
        "exam": exam,
        "questions": questions,
        "total": len(questions),
        "question_source": pack.get("source"),
        "ai_error": pack.get("ai_error"),
    }), 200


@quiz_bp.route("/submit", methods=["POST"])
@token_required
def submit(current_user):
    data    = request.get_json() or {}
    uid     = str(current_user["_id"])
    score   = float(data.get("score", 0))
    total_q = int(data.get("total_questions", 0))
    correct = int(data.get("correct_answers", 0))

    doc = {
        "user_id":           uid,
        "exam_id":           data.get("exam_id"),
        "exam_name":         data.get("exam_name", "Exam"),
        "score":             score,
        "total_questions":   total_q,
        "correct_answers":   correct,
        "incorrect_answers": total_q - correct,
        "accuracy":          round(correct / total_q * 100, 2) if total_q else 0,
        "time_taken":        data.get("time_taken"),
        "question_breakdown":data.get("question_breakdown", []),
        "exam_type":         data.get("exam_type", "online"),
        "difficulty":        data.get("difficulty", "medium"),
        "submitted_at":      datetime.utcnow(),
    }
    rid = save_test_result(doc)
    return jsonify({"status": "success", "result_id": rid, "score": score, "accuracy": doc["accuracy"]}), 200


@quiz_bp.route("/performance/<user_id>", methods=["GET"])
@token_required
def performance(current_user, user_id):
    if str(current_user["_id"]) != user_id:
        return jsonify({"error": "Access denied"}), 403
    results   = get_user_results(user_id, 50)
    stats     = get_user_stats(user_id)
    breakdown = get_topic_breakdown(user_id)
    trends    = analyse_performance_trends(results)
    return jsonify({"stats": stats, "trends": trends, "breakdown": breakdown, "history": results[:20]}), 200


@quiz_bp.route("/report/<result_id>", methods=["GET"])
@token_required
def get_report(current_user, result_id):
    result = get_result_by_id(result_id)
    if not result:
        return jsonify({"error": "Result not found"}), 404
    pct = result.get("score", 0)
    perf_data = {
        "marks_percentage": pct,
        "correct_answers":  result.get("correct_answers", 0),
        "total_questions":  result.get("total_questions", 0),
        "grade": _grade(pct),
        "time_efficiency": 80,
    }
    insights = generate_exam_report_insights(result.get("exam_name","Exam"), perf_data, result.get("question_breakdown",[]))
    return jsonify({"result": result, "insights": insights}), 200


@quiz_bp.route("/explain", methods=["POST"])
@token_required
def explain(current_user):
    data    = request.get_json() or {}
    concept = (data.get("concept") or "").strip()
    if not concept:
        return jsonify({"error": "concept required"}), 400
    return jsonify(explain_concept(concept, data.get("level","intermediate"))), 200


def _grade(pct):
    if pct >= 90: return "A+"
    if pct >= 80: return "A"
    if pct >= 70: return "B+"
    if pct >= 60: return "B"
    if pct >= 50: return "C"
    return "F"