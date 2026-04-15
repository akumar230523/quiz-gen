"""
QuizGen Platform — Configuration
FILE : app/config/settings.py

All application settings are loaded from the .env file.
Access settings via:  current_app.config["KEY"]  or  Config.KEY
"""

import os
from dotenv import load_dotenv

# Load .env from the project root (two levels up from this file)
_project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(_project_root, ".env"))


class Config:
    # ── Flask core ────────────────────────────────────────────────────────
    SECRET_KEY  = os.getenv("SECRET_KEY", "dev-secret-please-change-in-production")
    DEBUG       = os.getenv("FLASK_ENV", "production") == "development"
    PORT        = int(os.getenv("PORT", 5000))
    FLASK_ENV   = os.getenv("FLASK_ENV", "production")

    # ── MongoDB Atlas ─────────────────────────────────────────────────────
    MONGO_URI = os.getenv("MONGO_URL", "mongodb://localhost:27017/quizgen")

    # ── JWT ───────────────────────────────────────────────────────────────
    # Falls back to SECRET_KEY so you only need one secret in simple setups
    JWT_SECRET_KEY  = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
    JWT_EXPIRY_HOURS = int(os.getenv("JWT_EXPIRY_HOURS", 24))

    # ── OpenRouter AI ─────────────────────────────────────────────────────
    OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "").strip()
    OPENROUTER_MODEL   = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini").strip()

    # ── CORS ──────────────────────────────────────────────────────────────
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

    # ── File uploads ──────────────────────────────────────────────────────
    UPLOAD_FOLDER      = os.path.join(_project_root, "uploads")
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024   # 16 MB max upload size

    @classmethod
    def validate(cls) -> list[str]:
        """
        Return a list of warning strings for missing or suspicious settings.
        Called once at startup — warnings are printed but do NOT stop the app.
        """
        warnings = []

        if not cls.OPENROUTER_API_KEY:
            warnings.append("OPENROUTER_API_KEY not set — AI features will use fallback data.")

        if "localhost" in cls.MONGO_URI and not cls.DEBUG:
            warnings.append("Using local MongoDB while FLASK_ENV is not 'development'.")

        if cls.SECRET_KEY == "dev-secret-please-change-in-production":
            warnings.append("SECRET_KEY is using the insecure default — set a strong value in .env!")

        return warnings
