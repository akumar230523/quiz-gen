"""
QuizGen Platform Configuration
FILE LOCATION: quizgen/backend/app/config.py

Loads settings from backend/.env
"""

import os
from dotenv import load_dotenv

# Load .env from backend/ folder (parent of app/)
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(_backend_dir, ".env"))


def _resolve_google_application_credentials() -> None:
    """
    Set GOOGLE_APPLICATION_CREDENTIALS to an absolute path so Vertex AI / GCP
    clients find the service account JSON (supports paths relative to backend/).
    """
    raw = (
        os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        or os.getenv("GCLOUD_KEY_FILE")
        or ""
    ).strip()
    if not raw:
        return
    if os.path.isfile(raw):
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.path.abspath(raw)
        return
    candidate = os.path.join(_backend_dir, raw)
    if os.path.isfile(candidate):
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.path.abspath(candidate)


_resolve_google_application_credentials()


class Config:
    # ── Core Flask ──────────────────────────────────────────
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-in-production")
    DEBUG = os.getenv("FLASK_ENV", "production") == "development"
    PORT = int(os.getenv("PORT", 5000))

    # ── MongoDB Atlas ────────────────────────────────────────
    MONGO_URI = os.getenv(
        "MONGO_URI",
        "mongodb://localhost:27017/quizgen"
    )

    # ── JWT ──────────────────────────────────────────────────
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
    JWT_EXPIRY_HOURS = int(os.getenv("JWT_EXPIRY_HOURS", 24))

    # ── AI ───────────────────────────────────────────────────
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GCLOUD_PROJECT_ID = os.getenv("GCLOUD_PROJECT_ID", "")
    GEMINI_LOCATION = os.getenv("GEMINI_LOCATION", "us-central1")
    # true = force Vertex AI (service account). false = prefer API key when set.
    GEMINI_USE_VERTEX = os.getenv("GEMINI_USE_VERTEX", "").lower() in ("1", "true", "yes")

    # ── CORS ─────────────────────────────────────────────────
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

    # ── File Uploads ─────────────────────────────────────────
    UPLOAD_FOLDER = os.path.join(_backend_dir, "uploads")
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB

    @classmethod
    def validate(cls):
        """Warn about missing critical env vars at startup."""
        warnings = []
        creds = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")
        has_vertex = bool(cls.GCLOUD_PROJECT_ID and creds and os.path.isfile(creds))
        if not cls.GEMINI_API_KEY and not has_vertex:
            warnings.append(
                "No AI credentials: set GEMINI_API_KEY (Google AI Studio) or "
                "GCLOUD_PROJECT_ID + GOOGLE_APPLICATION_CREDENTIALS (Vertex AI)"
            )
        if "localhost" in cls.MONGO_URI and cls.DEBUG is False:
            warnings.append("Using local MongoDB in production mode")
        return warnings