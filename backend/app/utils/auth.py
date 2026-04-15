"""
QuizGen Platform — Authentication Utilities
FILE : app/utils/auth.py

Provides:
  - generate_token()   →  create a signed JWT
  - verify_token()     →  decode and validate a JWT
  - token_required     →  route decorator that injects `current_user`
  - role_required()    →  standalone decorator with built-in auth + role checking

INDUSTRY FIX:
  - role_required() no longer nests @token_required inside itself.
    Nesting decorators like that creates ambiguous wrapping order and can
    cause silent bugs when Flask resolves endpoint names. Both decorators
    now share the same private helper (_authenticate_request) so the auth
    logic lives in exactly one place.
  - datetime.utcnow() replaced with datetime.now(timezone.utc)
    (datetime.utcnow() is deprecated since Python 3.12).
"""

import logging
from datetime import datetime, timezone, timedelta
from functools import wraps

import jwt
from flask import request, jsonify, current_app

from ..models.user_model import UserModel

logger = logging.getLogger(__name__)


# ── Token generation ──────────────────────────────────────────────────────────

def generate_token(username: str, user_id: str, role: str = "student") -> str:
    """
    Create a signed JWT containing the user's identity.
    The token expires after JWT_EXPIRY_HOURS (default: 24).
    """
    secret = current_app.config.get("JWT_SECRET_KEY") or current_app.config["SECRET_KEY"]
    hours  = int(current_app.config.get("JWT_EXPIRY_HOURS", 24))
    now    = datetime.now(timezone.utc)

    payload = {
        "username": username,
        "user_id":  user_id,
        "role":     role,
        "iat":      now,
        "exp":      now + timedelta(hours=hours),
    }
    return jwt.encode(payload, secret, algorithm="HS256")


# ── Token verification ────────────────────────────────────────────────────────

def verify_token(token: str) -> dict | None:
    """
    Decode and validate a JWT.
    Returns the payload dict on success, or None if invalid/expired.
    """
    try:
        secret = current_app.config.get("JWT_SECRET_KEY") or current_app.config["SECRET_KEY"]
        return jwt.decode(token, secret, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        logger.debug("Token verification failed: token expired")
        return None
    except jwt.InvalidTokenError as exc:
        logger.debug("Token verification failed: %s", exc)
        return None


def _extract_token_from_header() -> str | None:
    """
    Extract the Bearer token from the Authorization header.
    Accepts:
      Authorization: Bearer <token>   (standard)
      Authorization: <token>          (legacy fallback)
    """
    header = request.headers.get("Authorization", "")
    if header.startswith("Bearer "):
        return header.split(" ", 1)[1].strip()
    return header.strip() or None


# ── Shared private helper ─────────────────────────────────────────────────────

def _authenticate_request() -> tuple[dict | None, tuple | None]:
    """
    Extract and validate the JWT, look up the user document.

    Returns:
      (user_doc, None)           on success
      (None, flask_response)     on any auth failure

    Keeping all auth logic in one place means token_required and
    role_required never duplicate code.
    """
    token = _extract_token_from_header()
    if not token:
        return None, (
            jsonify({"success": False, "error": "Authentication token is missing"}),
            401,
        )

    payload = verify_token(token)
    if not payload:
        return None, (
            jsonify({"success": False, "error": "Invalid or expired token"}),
            401,
        )

    user = UserModel.find_by_username(payload["username"])
    if not user:
        return None, (
            jsonify({"success": False, "error": "User account not found"}),
            401,
        )

    return user, None


# ── Route decorators ──────────────────────────────────────────────────────────

def token_required(f):
    """
    Decorator that protects a route and injects `current_user`.

    Usage:
        @some_bp.route("/protected")
        @token_required
        def my_route(current_user):
            ...

    Returns 401 if the token is missing or invalid.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        user, error_response = _authenticate_request()
        if error_response is not None:
            return error_response
        return f(user, *args, **kwargs)

    return decorated


def role_required(*allowed_roles: str):
    """
    Decorator that protects a route AND enforces role-based access.
    Performs the full auth check internally — do NOT stack with @token_required.

    Usage:
        @some_bp.route("/admin-only")
        @role_required("admin", "institute")
        def admin_route(current_user):
            ...

    Returns 401 if auth fails, 403 if the user's role is not in allowed_roles.
    """
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            user, error_response = _authenticate_request()
            if error_response is not None:
                return error_response

            if user.get("role") not in allowed_roles:
                logger.warning(
                    "Role access denied: user=%s role=%s required=%s",
                    user.get("username"),
                    user.get("role"),
                    allowed_roles,
                )
                return jsonify({
                    "success": False,
                    "error":   f"Access denied. Required role: {' or '.join(allowed_roles)}",
                }), 403

            return f(user, *args, **kwargs)

        return decorated
    return decorator