"""
QuizGen Platform — Attempt Model
FILE : app/models/attempt_model.py

Wraps the `exam_attempts` collection.
An attempt is created when a student STARTS an institute exam and
updated when they SUBMIT it.
"""

from .database import mongo, to_oid, doc_to_json


class AttemptModel:
    """CRUD helpers for the `exam_attempts` collection."""

    COLLECTION = "exam_attempts"

    # ── Finders ───────────────────────────────────────────────────────────

    @classmethod
    def find_by_id(cls, attempt_id: str) -> dict | None:
        return doc_to_json(
            mongo.db[cls.COLLECTION].find_one({"_id": to_oid(attempt_id)})
        )

    @classmethod
    def find_active(cls, student_id: str, exam_id: str) -> dict | None:
        """
        Check whether this student has already attempted this exam.
        Used to prevent duplicate attempts.
        """
        return mongo.db[cls.COLLECTION].find_one({
            "student_id": student_id,
            "exam_id":    exam_id,
        })

    @classmethod
    def get_student_history(cls, student_id: str) -> list[dict]:
        """All attempts by a student, newest first."""
        return doc_to_json(
            list(
                mongo.db[cls.COLLECTION]
                .find({"student_id": student_id})
                .sort("started_at", -1)
            )
        )

    # ── Writers ───────────────────────────────────────────────────────────

    @classmethod
    def create(cls, doc: dict) -> str:
        """Insert a new attempt. Returns string _id."""
        result = mongo.db[cls.COLLECTION].insert_one(doc)
        return str(result.inserted_id)

    @classmethod
    def update(cls, attempt_id: str, data: dict) -> None:
        """Partial update (used when student submits)."""
        mongo.db[cls.COLLECTION].update_one(
            {"_id": to_oid(attempt_id)},
            {"$set": data},
        )

    @classmethod
    def log_cheating_event(cls, attempt_id: str, event: dict) -> None:
        """
        Append a cheating event to the cheating_logs collection.
        Does NOT modify the attempt document itself.
        """
        mongo.db["cheating_logs"].insert_one({
            "attempt_id": attempt_id,
            **event,
        })
