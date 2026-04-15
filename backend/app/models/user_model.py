"""
QuizGen Platform — User Model
FILE : app/models/user_model.py

Wraps the `users` MongoDB collection.
Keeps all DB queries in one place so routes never call mongo directly.
"""

from datetime import datetime, timezone

from .database import mongo, to_oid, doc_to_json


class UserModel:
    """CRUD helpers for the `users` collection."""

    COLLECTION = "users"

    # ── Finders ───────────────────────────────────────────────────────────

    @classmethod
    def find_by_id(cls, user_id: str) -> dict | None:
        return doc_to_json(
            mongo.db[cls.COLLECTION].find_one({"_id": to_oid(user_id)})
        )

    @classmethod
    def find_by_username(cls, username: str) -> dict | None:
        """Returns the raw document (including hashed password) for auth checks."""
        return mongo.db[cls.COLLECTION].find_one({"username": username})

    @classmethod
    def find_by_email(cls, email: str) -> dict | None:
        return mongo.db[cls.COLLECTION].find_one({"email": email})

    # ── Writers ───────────────────────────────────────────────────────────

    @classmethod
    def create(
        cls,
        username: str,
        hashed_password: str,
        email: str | None = None,
        role: str = "student",
    ) -> str:
        """
        Insert a new user and return its string _id.
        role: "student" | "institute" | "admin"
        """
        now = datetime.now(timezone.utc)
        doc = {
            "username": username,
            "password": hashed_password,
            "email":    email,
            "role":     role,
            "profile": {
                "display_name": username,
                "avatar_color": "#6366f1",
                "bio":          "",
            },
            "stats": {
                "total_exams": 0,
                "avg_score":   0.0,
                "streak_days": 0,
                "best_score":  0.0,
            },
            "created_at": now,
            "updated_at": now,
        }
        result = mongo.db[cls.COLLECTION].insert_one(doc)
        return str(result.inserted_id)

    @classmethod
    def update_profile(cls, user_id: str, fields: dict) -> None:
        """Update allowed profile fields."""
        fields["updated_at"] = datetime.now(timezone.utc)
        mongo.db[cls.COLLECTION].update_one(
            {"_id": to_oid(user_id)},
            {"$set": fields},
        )

    @classmethod
    def increment_stats(cls, user_id: str, delta: dict) -> None:
        """
        Atomically increment stats counters.
        Example: increment_stats(uid, {"stats.total_exams": 1})
        """
        mongo.db[cls.COLLECTION].update_one(
            {"_id": to_oid(user_id)},
            {"$inc": delta, "$set": {"updated_at": datetime.now(timezone.utc)}},
        )