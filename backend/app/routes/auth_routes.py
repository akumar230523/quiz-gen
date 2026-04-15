"""
QuizGen Platform — Authentication Routes
FILE : app/routes/auth_routes.py
PREFIX : /auth

Endpoints:
  POST /auth/register   →  create a new account
  POST /auth/login      →  verify credentials and return a JWT
  POST /auth/logout     →  (stateless — client discards the token)
  GET  /auth/me         →  get the current user's profile
  PUT  /auth/me         →  update the current user's profile
"""

from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash

from ..models.user_model import UserModel
from ..models.database import doc_to_json
from ..utils.auth import generate_token, token_required
from ..utils.helpers import clean_str, error_response

auth_bp = Blueprint("auth", __name__)


# ── POST /auth/register ───────────────────────────────────────────────────────

@auth_bp.route("/register", methods=["POST"])
def register():
    """
    Create a new user account.

    Request body (JSON):
      username  string  required
      password  string  required (min 6 chars)
      email     string  optional
      role      string  optional — "student" (default) | "institute"

    Returns the JWT token so the client is immediately logged in.
    """
    data = request.get_json() or {}

    username = clean_str(data.get("username"))
    password = data.get("password", "")
    email    = clean_str(data.get("email")) or None
    role     = clean_str(data.get("role"), default="student")

    # ── Validation ────────────────────────────────────────────────────────
    if not username or not password:
        return error_response("Username and password are required", 400)
    if len(password) < 6:
        return error_response("Password must be at least 6 characters", 400)
    if role not in ("student", "institute", "admin"):
        return error_response("Invalid role. Must be 'student' or 'institute'", 400)

    # ── Uniqueness check ──────────────────────────────────────────────────
    if UserModel.find_by_username(username):
        return error_response("Username is already taken", 409)
    if email and UserModel.find_by_email(email):
        return error_response("Email is already registered", 409)

    # ── Create user ───────────────────────────────────────────────────────
    hashed_pw = generate_password_hash(password)
    user_id   = UserModel.create(username, hashed_pw, email, role)
    token     = generate_token(username, user_id, role)

    return jsonify({
        "success":  True,
        "message":  "Account created successfully",
        "token":    token,
        "user_id":  user_id,
        "username": username,
        "role":     role,
        "email":    email,
    }), 201


# ── POST /auth/login ──────────────────────────────────────────────────────────

@auth_bp.route("/login", methods=["POST"])
def login():
    """
    Authenticate a user with username + password.
    Returns a JWT on success.
    """
    data = request.get_json() or {}

    username = clean_str(data.get("username"))
    password = data.get("password", "")

    if not username or not password:
        return error_response("Username and password are required", 400)

    # ── Look up user ──────────────────────────────────────────────────────
    # find_by_username returns the RAW document (including hashed password)
    user = UserModel.find_by_username(username)
    if not user or not check_password_hash(user["password"], password):
        # Deliberately vague — don't reveal which field was wrong
        return error_response("Invalid username or password", 401)

    user_id = str(user["_id"])
    role    = user.get("role", "student")
    token   = generate_token(username, user_id, role)

    return jsonify({
        "success":  True,
        "message":  "Login successful",
        "token":    token,
        "user_id":  user_id,
        "username": username,
        "role":     role,
        "email":    user.get("email"),
        "profile":  user.get("profile", {}),
    }), 200


# ── POST /auth/logout ─────────────────────────────────────────────────────────

@auth_bp.route("/logout", methods=["POST"])
def logout():
    """
    Stateless logout — the client is responsible for discarding the JWT.
    If you need server-side token invalidation, implement a token blocklist here.
    """
    return jsonify({"success": True, "message": "Logged out successfully"}), 200


# ── GET /auth/me ──────────────────────────────────────────────────────────────

@auth_bp.route("/me", methods=["GET"])
@token_required
def get_profile(current_user):
    """Return the authenticated user's profile (password excluded)."""
    user = doc_to_json(current_user)
    user.pop("password", None)   # never expose the password hash
    return jsonify({"success": True, "user": user}), 200


# ── PUT /auth/me ──────────────────────────────────────────────────────────────

@auth_bp.route("/me", methods=["PUT"])
@token_required
def update_profile(current_user):
    """
    Update the current user's profile or email.

    Allowed fields:
      profile  object  — display_name, avatar_color, bio
      email    string  — new email address
    """
    data = request.get_json() or {}

    # Only allow safe fields to be updated
    allowed_fields = {}
    if "profile" in data:
        allowed_fields["profile"] = data["profile"]
    if "email" in data:
        new_email = clean_str(data["email"]) or None
        # Check if new email is already taken by another user
        if new_email and UserModel.find_by_email(new_email):
            existing = UserModel.find_by_email(new_email)
            if str(existing["_id"]) != str(current_user["_id"]):
                return error_response("Email is already in use", 409)
        allowed_fields["email"] = new_email

    if not allowed_fields:
        return error_response("No updatable fields provided", 400)

    UserModel.update_profile(str(current_user["_id"]), allowed_fields)
    return jsonify({"success": True, "message": "Profile updated"}), 200
