"""
QuizGen Platform — Flask Application Factory
FILE : app/__init__.py

create_app() is the single entry-point that:
  1. Initialises logging (must be first so everything else can log)
  2. Creates the Flask instance
  3. Loads configuration
  4. Wires up CORS, database, and all route blueprints
  5. Registers global error handlers
"""

import logging
import os

from flask import Flask, jsonify
from flask_cors import CORS

from .config.settings import Config
from .models.database import configure_database, init_db
from .utils.logger import setup_logging

logger = logging.getLogger(__name__)


def create_app(config_class: type = Config) -> Flask:
    """Factory function — returns a fully configured Flask app."""

    # ── Logging must be first — everything after this can use logger ──────
    setup_logging()

    app = Flask(__name__)
    app.config.from_object(config_class)

    # ── Print any configuration warnings at startup ───────────────────────
    for warning in config_class.validate():
        logger.warning("[CONFIG] %s", warning)

    # ── CORS ──────────────────────────────────────────────────────────────
    CORS(app, resources={
        r"/*": {
            "origins": [
                config_class.FRONTEND_URL,
                "http://localhost:3000",
                "http://localhost:5173",
            ],
            "methods":       ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "supports_credentials": True,
        }
    })

    # ── Database ──────────────────────────────────────────────────────────
    configure_database(app)
    with app.app_context():
        init_db()

    # ── Route Blueprints ──────────────────────────────────────────────────
    from .routes.auth_routes      import auth_bp
    from .routes.quiz_routes      import quiz_bp
    from .routes.institute_routes import institute_bp
    from .routes.student_routes   import student_bp
    from .routes.practice_routes  import practice_bp
    from .routes.tutor_routes     import tutor_bp
    from .routes.offline_routes   import offline_bp

    app.register_blueprint(auth_bp,      url_prefix="/auth")
    app.register_blueprint(quiz_bp,      url_prefix="/quiz")
    app.register_blueprint(institute_bp, url_prefix="/institute")
    app.register_blueprint(student_bp,   url_prefix="/student")
    app.register_blueprint(practice_bp,  url_prefix="/practice")
    app.register_blueprint(tutor_bp,     url_prefix="/tutor")
    app.register_blueprint(offline_bp,   url_prefix="/offline")

    # ── Health check endpoint ─────────────────────────────────────────────
    @app.route("/health")
    def health():
        api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
        model   = os.getenv("OPENROUTER_MODEL", "not set").strip()
        return jsonify({
            "status":                "healthy",
            "service":               "QuizGen API",
            "version":               "3.0.0",
            "ai_provider":           "openrouter",
            "openrouter_configured": bool(api_key),
            "model":                 model,
            "endpoints": {
                "auth":      "/auth",
                "quiz":      "/quiz",
                "institute": "/institute",
                "student":   "/student",
                "practice":  "/practice",
                "tutor":     "/tutor",
            },
        }), 200

    @app.route("/")
    def root():
        return jsonify({
            "name":    "QuizGen Platform API",
            "version": "3.0.0",
            "health":  "/health",
        }), 200

    # ── Global error handlers ─────────────────────────────────────────────
    @app.errorhandler(404)
    def not_found(_e):
        return jsonify({"success": False, "error": "Route not found"}), 404

    @app.errorhandler(405)
    def method_not_allowed(_e):
        return jsonify({"success": False, "error": "Method not allowed"}), 405

    @app.errorhandler(500)
    def server_error(_e):
        return jsonify({"success": False, "error": "Internal server error"}), 500

    @app.errorhandler(Exception)
    def unhandled(exc):
        logger.exception("Unhandled exception: %s", exc)
        return jsonify({"success": False, "error": str(exc)}), 500

    logger.info("QuizGen API v3.0.0 ready")
    return app