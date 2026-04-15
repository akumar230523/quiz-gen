"""
QuizGen Platform — Configuration
FILE : app/config/settings.py

All settings are loaded from environment variables.
On Render, set these in the dashboard under "Environment Variables".
Locally, put them in a .env file in the project root.

REQUIRED for production:
  SECRET_KEY          — a long random string
  MONGO_URI           — your MongoDB Atlas connection string
  OPENROUTER_API_KEY  — your OpenRouter key
"""

import os
from dotenv import load_dotenv

# Load .env from the project root (two levels up from this file)
_project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(_project_root, ".env"))


class Config:
    # ── Flask core ────────────────────────────────────────────────────────
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-please-change-in-production")
    FLASK_ENV  = os.getenv("FLASK_ENV", "production")
    DEBUG      = FLASK_ENV == "development"
    PORT       = int(os.getenv("PORT", 5000))

    # ── MongoDB ───────────────────────────────────────────────────────────
    # Accepts either MONGO_URI (standard) or MONGO_URL (legacy fallback).
    # MONGO_URI takes priority. Both work — but use MONGO_URI going forward.
    MONGO_URI = (
        os.getenv("MONGO_URI") or      # standard name — use this on Render
        os.getenv("MONGO_URL") or      # legacy fallback
        "mongodb://localhost:27017/quizgen"
    )

    # ── JWT ───────────────────────────────────────────────────────────────
    JWT_SECRET_KEY   = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
    JWT_EXPIRY_HOURS = int(os.getenv("JWT_EXPIRY_HOURS", 24))

    # ── OpenRouter AI ─────────────────────────────────────────────────────
    OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "").strip()
    OPENROUTER_MODEL   = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini").strip()

    # ── CORS ──────────────────────────────────────────────────────────────
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

    # ── File uploads ──────────────────────────────────────────────────────
    UPLOAD_FOLDER      = os.path.join(_project_root, "uploads")
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024   # 16 MB

    @classmethod
    def validate(cls) -> list[str]:
        """
        Return startup warnings for missing or dangerous config values.
        These are logged but never crash the server.
        """
        warnings = []

        if not cls.OPENROUTER_API_KEY:
            warnings.append(
                "OPENROUTER_API_KEY not set — AI features will use fallback question bank."
            )

        if "localhost" in cls.MONGO_URI:
            warnings.append(
                "MONGO_URI is pointing to localhost. "
                "On Render this means no database — set MONGO_URI to your Atlas connection string."
            )

        if cls.SECRET_KEY == "dev-secret-please-change-in-production":
            warnings.append(
                "SECRET_KEY is the insecure default. "
                "Set a strong random value in your Render environment variables."
            )

        if cls.FLASK_ENV == "development":
            warnings.append(
                "FLASK_ENV=development on a deployed server. "
                "Set FLASK_ENV=production on Render."
            )

        return warnings