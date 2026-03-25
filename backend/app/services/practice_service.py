"""
Practice Service
Handles personalised practice session generation and history.
"""

from datetime import datetime, timezone
from ..models.database import mongo, doc_to_json
from .performance_service import get_user_results, get_topic_breakdown
from .ai_service import generate_personalised_practice


def generate_session(user_id: str, country: str, exam_type: str,
                     target_score: int = 80) -> dict:
    """Generate an AI-personalised practice session."""
    results  = get_user_results(user_id, limit=10)
    breakdown = get_topic_breakdown(user_id)

    weak_topics   = [t["topic"] for t in breakdown if t["mastery"] == "low"][:5]
    strong_topics = [t["topic"] for t in breakdown if t["mastery"] == "high"][:3]

    practice = generate_personalised_practice(
        country      = country,
        exam_type    = exam_type,
        weak_areas   = weak_topics,
        strong_areas = strong_topics,
        target_score = target_score,
        has_history  = bool(results),
    )
    practice["generated_for"] = {
        "user_id":    user_id,
        "country":    country,
        "exam_type":  exam_type,
        "has_history":bool(results),
    }
    return practice


def save_session(user_id: str, session_data: dict) -> str:
    now = datetime.now(timezone.utc)
    doc = {
        "user_id":             user_id,
        "session_type":        "practice",
        "country":             session_data.get("country"),
        "exam_type":           session_data.get("exam_type"),
        "questions_attempted": int(session_data.get("questions_attempted", 0)),
        "total_questions":     int(session_data.get("total_questions", 0)),
        "questions_correct":   int(session_data.get("questions_correct", 0)),
        "time_taken_minutes":  int(session_data.get("time_taken", 0)),
        "topics_covered":      session_data.get("topics_covered", []),
        "answers":             session_data.get("answers", {}),
        "score":               0,
        "exam_name":           f"Practice – {session_data.get('country')} ({session_data.get('exam_type')})",
        "submitted_at":        now,
        "is_unlimited_time":   True,
    }
    result = mongo.db.test_results.insert_one(doc)
    return str(result.inserted_id)


def get_history(user_id: str, page: int = 1, limit: int = 10) -> dict:
    query = {"user_id": user_id, "session_type": "practice"}
    total = mongo.db.test_results.count_documents(query)
    docs  = list(
        mongo.db.test_results.find(query)
        .sort("submitted_at", -1)
        .skip((page - 1) * limit)
        .limit(limit)
    )
    return {
        "sessions": doc_to_json(docs),
        "pagination": {
            "page":        page,
            "total_pages": max(1, (total + limit - 1) // limit),
            "total":       total,
        },
    }