"""
QuizGen Platform — Tutor Service
FILE : app/services/tutor_service.py

Business logic for the AI tutoring feature.
Wraps ai_service calls and handles session persistence.
"""

from datetime import datetime, timezone

from ..models.database import mongo, doc_to_json
from .ai_service import ai_tutor_chat, explain_concept


def chat(messages: list[dict], subject: str = "General") -> dict:
    """
    Process a multi-turn tutoring conversation.

    `messages` is the full conversation history:
      [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}, ...]

    Returns the AI's reply dict from ai_tutor_chat().
    """
    return ai_tutor_chat(messages, subject)


def explain(concept: str, level: str = "intermediate") -> dict:
    """
    Get an AI explanation of a concept.
    Delegates to ai_service.explain_concept().
    """
    return explain_concept(concept, level)


def save_session(
    user_id: str,
    subject: str,
    messages: list[dict],
    concepts: list[str],
) -> str:
    """
    Persist a completed tutor conversation to the `tutor_sessions` collection.
    Returns the string _id of the inserted document.
    """
    doc = {
        "user_id":          user_id,
        "subject":          subject,
        "messages":         messages,
        "concepts_covered": concepts,
        "message_count":    len(messages),
        "created_at":       datetime.now(timezone.utc),
    }
    result = mongo.db.tutor_sessions.insert_one(doc)
    return str(result.inserted_id)


def get_sessions(user_id: str, limit: int = 20) -> list[dict]:
    """
    Return past tutor sessions for a user, newest first.
    """
    docs = list(
        mongo.db.tutor_sessions
        .find({"user_id": user_id})
        .sort("created_at", -1)
        .limit(limit)
    )
    return doc_to_json(docs)
