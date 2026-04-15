"""
QuizGen Platform — Database Layer
FILE : app/models/database.py

Responsibilities:
  - Hold the shared `mongo` PyMongo instance
  - configure_database()  →  attach URI to Flask app
  - init_db()             →  create indexes + seed reference data
  - Shared helpers        →  to_oid(), doc_to_json()
"""

import logging
import os
from datetime import datetime, timezone

from bson import ObjectId
from flask_pymongo import PyMongo

logger = logging.getLogger(__name__)

# ── Shared PyMongo instance ───────────────────────────────────────────────────
# Imported by every model file:  from .database import mongo
mongo = PyMongo()


# ── Connection setup ──────────────────────────────────────────────────────────

def configure_database(app) -> PyMongo:
    """
    Read MONGO_URI from app config and initialise PyMongo.
    Called once inside create_app() before any requests are handled.
    """
    uri = app.config.get("MONGO_URI") or os.getenv("MONGO_URL")
    if not uri:
        raise RuntimeError("MONGO_URI is not configured. Check your .env file.")

    app.config["MONGO_URI"] = uri

    # Redact password from logs
    display_uri = uri.split("@")[-1] if "@" in uri else uri
    logger.info("Connecting to MongoDB: %s", display_uri)

    mongo.init_app(app)
    return mongo


def init_db() -> bool:
    """
    Verify the connection, create indexes, and seed lookup data.
    Safe to call multiple times — index creation is idempotent.
    """
    # ── Ping the server ───────────────────────────────────────────────────
    try:
        mongo.db.command("ping")
        logger.info("Connected to MongoDB successfully")
    except Exception as exc:
        logger.error("MongoDB connection failed: %s", exc)
        return False

    # ── Indexes ───────────────────────────────────────────────────────────
    mongo.db.users.create_index("username", unique=True)
    mongo.db.users.create_index("email",    unique=True, sparse=True)

    mongo.db.institute_exams.create_index("exam_id",      unique=True)
    mongo.db.institute_exams.create_index("institute_id")
    mongo.db.institute_exams.create_index([("created_at", -1)])

    mongo.db.exam_attempts.create_index([("student_id", 1), ("exam_id", 1)])
    mongo.db.exam_attempts.create_index([("exam_id",    1)])

    mongo.db.exam_reports.create_index("report_id",  unique=True)
    mongo.db.exam_reports.create_index("attempt_id")
    mongo.db.exam_reports.create_index([("student_id", 1), ("generated_at", -1)])

    mongo.db.test_results.create_index([("user_id",    1), ("submitted_at", -1)])
    mongo.db.test_results.create_index([("offline_id", 1)], sparse=True)

    mongo.db.cheating_logs.create_index([("attempt_id", 1), ("timestamp", -1)])

    # ── Seed countries (only if empty) ────────────────────────────────────
    if mongo.db.countries.count_documents({}) == 0:
        _seed_countries()

    logger.info("Database initialised — indexes verified")
    return True


def _seed_countries() -> None:
    """Insert the reference country list once."""
    countries = [
        {"name": "India",          "code": "IN", "flag": "🇮🇳"},
        {"name": "United States",  "code": "US", "flag": "🇺🇸"},
        {"name": "United Kingdom", "code": "GB", "flag": "🇬🇧"},
        {"name": "Australia",      "code": "AU", "flag": "🇦🇺"},
        {"name": "Canada",         "code": "CA", "flag": "🇨🇦"},
        {"name": "Germany",        "code": "DE", "flag": "🇩🇪"},
        {"name": "France",         "code": "FR", "flag": "🇫🇷"},
        {"name": "Japan",          "code": "JP", "flag": "🇯🇵"},
        {"name": "South Korea",    "code": "KR", "flag": "🇰🇷"},
        {"name": "Brazil",         "code": "BR", "flag": "🇧🇷"},
        {"name": "Singapore",      "code": "SG", "flag": "🇸🇬"},
        {"name": "UAE",            "code": "AE", "flag": "🇦🇪"},
    ]
    now = datetime.now(timezone.utc)
    for c in countries:
        c["created_at"] = now
    mongo.db.countries.insert_many(countries)
    logger.info("Seeded %d countries into the database", len(countries))


# ── Shared helpers ────────────────────────────────────────────────────────────

def to_oid(val) -> ObjectId | None:
    """Safely convert a string to a MongoDB ObjectId. Returns None on failure."""
    try:
        return ObjectId(val)
    except Exception:
        return None


def doc_to_json(doc):
    """
    Recursively convert a MongoDB document (or list of documents) to a
    JSON-serialisable Python dict by converting ObjectId → str and
    datetime → ISO string.
    """
    if doc is None:
        return None
    if isinstance(doc, list):
        return [doc_to_json(d) for d in doc]
    if isinstance(doc, dict):
        out = {}
        for key, val in doc.items():
            if isinstance(val, ObjectId):
                out[key] = str(val)
            elif isinstance(val, datetime):
                # Always serialise as UTC ISO string regardless of tzinfo presence
                if val.tzinfo is None:
                    val = val.replace(tzinfo=timezone.utc)
                out[key] = val.isoformat()
            elif isinstance(val, (dict, list)):
                out[key] = doc_to_json(val)
            else:
                out[key] = val
        return out
    return doc