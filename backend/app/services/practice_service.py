"""
QuizGen Platform — Practice Service
FILE : app/services/practice_service.py

Business logic for personalised practice sessions.
Wraps AI generation and DB persistence.
"""

from datetime import datetime, timezone

from ..models.database import mongo, doc_to_json
from .performance_service import get_user_results, get_topic_breakdown
from .ai_service import generate_personalised_practice


def generate_session(
    user_id: str,
    country: str,
    exam_type: str,
    target_score: int = 80,
) -> dict:
    """
    Build an AI-personalised practice session for a student.

    Steps:
      1. Fetch the student's topic breakdown from their history
      2. Identify weak and strong topics
      3. Ask the AI to generate a session focused on weak areas
      4. Return the session dict (NOT yet saved — call save_session() separately)
    """
    # Load history so the AI can personalise
    results    = get_user_results(user_id, limit=10)
    breakdown  = get_topic_breakdown(user_id)

    weak_topics   = [t["topic"] for t in breakdown if t["mastery"] == "low"][:5]
    strong_topics = [t["topic"] for t in breakdown if t["mastery"] == "high"][:3]

    session = generate_personalised_practice(
        country      = country,
        exam_type    = exam_type,
        weak_areas   = weak_topics,
        strong_areas = strong_topics,
        target_score = target_score,
        has_history  = bool(results),
    )

    # Attach metadata so the frontend knows who the session was for
    session["generated_for"] = {
        "user_id":     user_id,
        "country":     country,
        "exam_type":   exam_type,
        "has_history": bool(results),
    }
    return session


def save_session(user_id: str, session_data: dict) -> str:
    """
    Persist a completed practice session to the test_results collection.
    Returns the string _id of the inserted document.

    `session_data` fields (all optional with defaults):
      country, exam_type, exam_name, questions_attempted, total_questions,
      questions_correct, time_taken (seconds), topics_covered, answers
    """
    total_q  = int(session_data.get("total_questions", 0))
    correct  = int(session_data.get("questions_correct", 0))
    score    = round(correct / total_q * 100, 1) if total_q else 0

    doc = {
        "user_id":             user_id,
        "session_type":        "practice",            # distinguishes from quiz results
        "country":             session_data.get("country", ""),
        "exam_type":           session_data.get("exam_type", ""),
        "exam_name":           session_data.get("exam_name", "Practice Session"),
        "score":               score,
        "questions_attempted": int(session_data.get("questions_attempted", 0)),
        "total_questions":     total_q,
        "correct_answers":     correct,
        "time_taken":          int(session_data.get("time_taken", 0)),  # seconds
        "topics_covered":      session_data.get("topics_covered", []),
        "answers":             session_data.get("answers", {}),
        "is_unlimited_time":   True,                  # practice = no time pressure
        "submitted_at":        datetime.now(timezone.utc),
    }

    result = mongo.db.test_results.insert_one(doc)
    return str(result.inserted_id)


def get_history(user_id: str, page: int = 1, limit: int = 10) -> dict:
    """
    Return paginated practice session history for a user.
    Only returns session_type="practice" documents.
    """
    query = {"user_id": user_id, "session_type": "practice"}
    total = mongo.db.test_results.count_documents(query)
    skip  = (page - 1) * limit

    docs = list(
        mongo.db.test_results
        .find(query)
        .sort("submitted_at", -1)
        .skip(skip)
        .limit(limit)
    )

    return {
        "sessions": doc_to_json(docs),
        "pagination": {
            "page":        page,
            "limit":       limit,
            "total":       total,
            "total_pages": max(1, (total + limit - 1) // limit),
        },
    }
