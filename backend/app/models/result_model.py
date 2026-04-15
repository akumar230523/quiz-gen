"""
QuizGen Platform — Test Result Model
FILE : app/models/result_model.py

Wraps the `test_results` collection.
Used for BOTH online quiz results AND practice session results.
Distinguished by the `session_type` field: "quiz" | "practice".
"""

from bson import ObjectId
from .database import mongo, to_oid, doc_to_json


class TestResultModel:
    """CRUD and aggregation helpers for the `test_results` collection."""

    COLLECTION = "test_results"

    # ── Finders ───────────────────────────────────────────────────────────

    @classmethod
    def find_by_id(cls, result_id: str) -> dict | None:
        try:
            doc = mongo.db[cls.COLLECTION].find_one({"_id": ObjectId(result_id)})
            return doc_to_json(doc)
        except Exception:
            return None

    @classmethod
    def find_by_offline_id(cls, user_id: str, offline_id: str) -> dict | None:
        """
        Prevent duplicate sync of offline quiz results.
        offline_id is a UUID set by the mobile app before the device goes offline.
        """
        return mongo.db[cls.COLLECTION].find_one({
            "user_id":    user_id,
            "offline_id": offline_id,
        })

    @classmethod
    def get_user_results(cls, user_id: str, limit: int = 50) -> list[dict]:
        """Most recent results for a user (all types)."""
        return doc_to_json(
            list(
                mongo.db[cls.COLLECTION]
                .find({"user_id": user_id})
                .sort("submitted_at", -1)
                .limit(limit)
            )
        )

    @classmethod
    def get_user_stats(cls, user_id: str) -> dict:
        """
        Aggregate overall performance stats for a user using MongoDB pipeline.
        Returns an empty dict if the user has no results.
        """
        pipeline = [
            {"$match": {"user_id": user_id}},
            {"$group": {
                "_id":             None,
                "total_exams":     {"$sum": 1},
                "avg_score":       {"$avg": "$score"},
                "best_score":      {"$max": "$score"},
                "worst_score":     {"$min": "$score"},
                "total_questions": {"$sum": "$total_questions"},
                "total_correct":   {"$sum": "$correct_answers"},
            }},
        ]
        rows = list(mongo.db[cls.COLLECTION].aggregate(pipeline))
        if not rows:
            return {}
        row = rows[0]
        row.pop("_id", None)
        row["avg_score"]  = round(row.get("avg_score")  or 0, 2)
        row["best_score"] = round(row.get("best_score") or 0, 2)
        return row

    @classmethod
    def get_topic_breakdown(cls, user_id: str) -> list[dict]:
        """
        Return per-topic accuracy by scanning the question_breakdown arrays
        stored on each result document.
        """
        results = cls.get_user_results(user_id, limit=100)
        topic_map: dict[str, dict] = {}

        for result in results:
            for question in result.get("question_breakdown", []):
                topic = question.get("topic") or "General"
                if topic not in topic_map:
                    topic_map[topic] = {"correct": 0, "total": 0}
                topic_map[topic]["total"] += 1
                if question.get("is_correct"):
                    topic_map[topic]["correct"] += 1

        breakdown = []
        for topic, stats in topic_map.items():
            accuracy = round(stats["correct"] / stats["total"] * 100, 1) if stats["total"] else 0
            breakdown.append({
                "topic":    topic,
                "correct":  stats["correct"],
                "total":    stats["total"],
                "accuracy": accuracy,
                "mastery":  (
                    "high"   if accuracy >= 75 else
                    "medium" if accuracy >= 50 else
                    "low"
                ),
            })

        # Sort by accuracy ascending so weakest topics appear first
        return sorted(breakdown, key=lambda x: x["accuracy"])

    # ── Writers ───────────────────────────────────────────────────────────

    @classmethod
    def create(cls, doc: dict) -> str:
        """Insert a result document. Returns string _id."""
        result = mongo.db[cls.COLLECTION].insert_one(doc)
        return str(result.inserted_id)
