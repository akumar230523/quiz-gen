"""Practice Routes - uses practice_service, fully decoupled."""

from flask import Blueprint, request, jsonify
from ..utils.auth import token_required
from ..services import practice_service

practice_bp = Blueprint("practice", __name__)


@practice_bp.route("/generate", methods=["POST"])
@token_required
def generate(current_user):
    data     = request.get_json() or {}
    country  = (data.get("country") or "").strip()
    exam_type= (data.get("examType") or data.get("exam_type") or "MCQ").strip()
    if not country:
        return jsonify({"error": "country is required"}), 400

    uid      = str(current_user["_id"])
    practice = practice_service.generate_session(
        uid, country, exam_type,
        target_score=int(data.get("target_score", 80)),
    )
    return jsonify({"practice": practice}), 200


@practice_bp.route("/save", methods=["POST"])
@token_required
def save(current_user):
    data = request.get_json() or {}
    uid  = str(current_user["_id"])
    sid  = practice_service.save_session(uid, data)
    return jsonify({"success": True, "session_id": sid}), 200


@practice_bp.route("/history", methods=["GET"])
@token_required
def history(current_user):
    uid   = str(current_user["_id"])
    page  = max(1, int(request.args.get("page", 1)))
    limit = min(20, int(request.args.get("limit", 10)))
    return jsonify(practice_service.get_history(uid, page, limit)), 200