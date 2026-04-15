"""
QuizGen Platform — Institute Exam Model
FILE : app/models/institute_model.py

Wraps the `institute_exams` collection.
These are custom exams created by schools/institutes (not the public country exams).
"""

from datetime import datetime
from .database import mongo, to_oid, doc_to_json


class InstituteExamModel:
    """CRUD helpers for the `institute_exams` collection."""

    COLLECTION = "institute_exams"

    # ── Finders ───────────────────────────────────────────────────────────

    @classmethod
    def find_by_exam_id(cls, exam_id: str) -> dict | None:
        """Look up by the human-readable exam_id string (e.g. 'MATHS-2024')."""
        return doc_to_json(
            mongo.db[cls.COLLECTION].find_one({"exam_id": exam_id})
        )

    @classmethod
    def find_by_db_id(cls, db_id: str) -> dict | None:
        """Look up by MongoDB _id."""
        return doc_to_json(
            mongo.db[cls.COLLECTION].find_one({"_id": to_oid(db_id)})
        )

    @classmethod
    def get_by_institute(cls, institute_id: str) -> list[dict]:
        """All exams created by a specific institute, newest first."""
        return doc_to_json(
            list(
                mongo.db[cls.COLLECTION]
                .find({"institute_id": institute_id})
                .sort("created_at", -1)
            )
        )

    @classmethod
    def get_all(cls, query: dict | None = None) -> list[dict]:
        """Fetch all exams, optionally filtered by a query dict."""
        return doc_to_json(
            list(
                mongo.db[cls.COLLECTION]
                .find(query or {})
                .sort("created_at", -1)
            )
        )

    # ── Writers ───────────────────────────────────────────────────────────

    @classmethod
    def create(cls, doc: dict) -> str:
        """Insert a new institute exam. Returns string _id."""
        result = mongo.db[cls.COLLECTION].insert_one(doc)
        return str(result.inserted_id)

    @classmethod
    def update(cls, exam_id: str, update_data: dict) -> None:
        """Partial update by the human-readable exam_id."""
        mongo.db[cls.COLLECTION].update_one(
            {"exam_id": exam_id},
            {"$set": update_data},
        )

    @classmethod
    def delete(cls, exam_id: str) -> None:
        """Delete by the human-readable exam_id."""
        mongo.db[cls.COLLECTION].delete_one({"exam_id": exam_id})

    @classmethod
    def increment_attempt_count(cls, exam_id: str) -> None:
        """Called each time a student starts this exam."""
        mongo.db[cls.COLLECTION].update_one(
            {"exam_id": exam_id},
            {"$inc": {"attempt_count": 1}},
        )
