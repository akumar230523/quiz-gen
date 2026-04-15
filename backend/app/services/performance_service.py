"""
QuizGen Platform — Performance Service
FILE : app/services/performance_service.py

All business logic related to student performance tracking.
Routes call these functions — they never touch MongoDB directly.
"""

from datetime import datetime
from ..models.result_model import TestResultModel


def save_test_result(doc: dict) -> str:
    """
    Persist a completed quiz or practice result.
    Adds `submitted_at` if not already set.
    Returns the string _id of the inserted document.
    """
    doc.setdefault("submitted_at", datetime.utcnow())
    return TestResultModel.create(doc)


def get_user_results(user_id: str, limit: int = 50) -> list[dict]:
    """Return the most recent `limit` results for a user."""
    return TestResultModel.get_user_results(user_id, limit)


def get_user_stats(user_id: str) -> dict:
    """
    Return aggregated performance stats for a user.
    Includes: total_exams, avg_score, best_score, total_questions, total_correct.
    """
    return TestResultModel.get_user_stats(user_id)


def get_topic_breakdown(user_id: str) -> list[dict]:
    """
    Return per-topic accuracy, sorted weakest first.
    Each entry: {topic, correct, total, accuracy, mastery: "low"|"medium"|"high"}
    """
    return TestResultModel.get_topic_breakdown(user_id)


def get_result_by_id(result_id: str) -> dict | None:
    """Look up a single result by its MongoDB _id."""
    return TestResultModel.find_by_id(result_id)


def get_result_by_offline_id(user_id: str, offline_id: str) -> dict | None:
    """
    Check if an offline result has already been synced.
    Returns the existing doc, or None if not found.
    """
    return TestResultModel.find_by_offline_id(user_id, offline_id)
