"""
QuizGen Platform — Exam & Country Models
FILE : app/models/exam_model.py

Two collections:
  - countries  →  reference data (seeded once)
  - exams      →  public/country-based exams (JEE, SAT, etc.)
"""

from datetime import datetime
from .database import mongo, to_oid, doc_to_json


class CountryModel:
    """Read-only access to the `countries` collection."""

    COLLECTION = "countries"

    @classmethod
    def get_all(cls) -> list[dict]:
        return doc_to_json(
            list(mongo.db[cls.COLLECTION].find().sort("name", 1))
        )

    @classmethod
    def get_by_id(cls, country_id: str) -> dict | None:
        return doc_to_json(
            mongo.db[cls.COLLECTION].find_one({"_id": to_oid(country_id)})
        )


class ExamModel:
    """
    Country-based public exams (JEE, NEET, SAT, etc.).
    These are seeded automatically the first time a country's exams are requested.
    """

    COLLECTION = "exams"

    @classmethod
    def get_by_id(cls, exam_id: str) -> dict | None:
        return doc_to_json(
            mongo.db[cls.COLLECTION].find_one({"_id": to_oid(exam_id)})
        )

    @classmethod
    def get_by_country(cls, country_id: str) -> list[dict]:
        return doc_to_json(
            list(mongo.db[cls.COLLECTION].find({"country_id": to_oid(country_id)}))
        )

    @classmethod
    def find_by_name_and_country(cls, name: str, country_id: str) -> dict | None:
        return mongo.db[cls.COLLECTION].find_one({
            "name":       name,
            "country_id": to_oid(country_id),
        })

    @classmethod
    def upsert(cls, name: str, country_id: str, description: str,
               duration: int, difficulty: str) -> str:
        """
        Create an exam if it doesn't already exist for this country.
        Returns the string _id (existing or newly created).
        """
        existing = cls.find_by_name_and_country(name, country_id)
        if existing:
            return str(existing["_id"])

        doc = {
            "name":        name,
            "country_id":  to_oid(country_id),
            "description": description,
            "duration":    duration,          # minutes
            "difficulty":  difficulty,        # easy | medium | hard
            "offline":     True,
            "online":      True,
            "created_at":  datetime.utcnow(),
        }
        result = mongo.db[cls.COLLECTION].insert_one(doc)
        return str(result.inserted_id)
