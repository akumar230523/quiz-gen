"""
QuizGen Platform — Report Model
FILE : app/models/report_model.py

Wraps the `exam_reports` collection.
A report is an AI-generated analysis document created after a student
submits an institute exam.
"""

from .database import mongo, to_oid, doc_to_json


class ReportModel:
    """CRUD helpers for the `exam_reports` collection."""

    COLLECTION = "exam_reports"

    # ── Finders ───────────────────────────────────────────────────────────

    @classmethod
    def find_by_report_id(cls, report_id: str) -> dict | None:
        """
        Look up by either the UUID report_id field OR the MongoDB _id.
        This covers the case where the frontend passes either value.
        """
        doc = mongo.db[cls.COLLECTION].find_one({"report_id": report_id})
        if not doc:
            # Try treating it as a MongoDB _id
            doc = mongo.db[cls.COLLECTION].find_one({"_id": to_oid(report_id)})
        return doc_to_json(doc)

    @classmethod
    def find_by_attempt(cls, attempt_id: str) -> dict | None:
        return doc_to_json(
            mongo.db[cls.COLLECTION].find_one({"attempt_id": attempt_id})
        )

    @classmethod
    def get_student_reports(cls, student_id: str, limit: int = 20) -> list[dict]:
        """Most recent reports for a student."""
        return doc_to_json(
            list(
                mongo.db[cls.COLLECTION]
                .find({"student_id": student_id})
                .sort("generated_at", -1)
                .limit(limit)
            )
        )

    # ── Writers ───────────────────────────────────────────────────────────

    @classmethod
    def create(cls, doc: dict) -> str:
        """Insert a new report. Returns string _id."""
        result = mongo.db[cls.COLLECTION].insert_one(doc)
        return str(result.inserted_id)
