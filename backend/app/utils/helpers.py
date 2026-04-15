"""
QuizGen Platform — Shared Helpers
FILE : app/utils/helpers.py

Small utility functions used across routes and services.
Keeps common logic in one place so it is never duplicated.
"""

from datetime import datetime, timezone

from flask import jsonify


# ── Grade calculation ─────────────────────────────────────────────────────────

def calculate_grade(percentage: float) -> str:
    """
    Convert a percentage score to a letter grade.
    Used in both student exam reports and quiz performance reports.
    """
    if percentage >= 90: return "A+"
    if percentage >= 80: return "A"
    if percentage >= 70: return "B+"
    if percentage >= 60: return "B"
    if percentage >= 50: return "C"
    return "F"


# ── Consistent HTTP response builders ────────────────────────────────────────

def success_response(data: dict | list, status: int = 200) -> tuple:
    """
    Wrap data in a standard success envelope.

    Usage:
        return success_response({"user": user_doc})
        return success_response([item1, item2])
    """
    if isinstance(data, dict):
        return jsonify({"success": True, **data}), status
    return jsonify({"success": True, "data": data}), status


def error_response(message: str, status: int = 400) -> tuple:
    """
    Return a standard error response.

    Usage:
        return error_response("Email is required", 400)
        return error_response("Not found", 404)
    """
    return jsonify({"success": False, "error": message}), status


# ── Score distribution for analytics ─────────────────────────────────────────

def build_score_distribution(scores: list[float]) -> list[dict]:
    """
    Group a list of percentage scores into grade bands.
    Returns a list ready for charting on the frontend.
    """
    total  = len(scores)
    ranges = {
        "90-100": 0,
        "80-89":  0,
        "70-79":  0,
        "60-69":  0,
        "50-59":  0,
        "0-49":   0,
    }
    for score in scores:
        if   score >= 90: ranges["90-100"] += 1
        elif score >= 80: ranges["80-89"]  += 1
        elif score >= 70: ranges["70-79"]  += 1
        elif score >= 60: ranges["60-69"]  += 1
        elif score >= 50: ranges["50-59"]  += 1
        else:             ranges["0-49"]   += 1

    return [
        {
            "range":   band,
            "count":   count,
            "percent": round(count / total * 100, 1) if total else 0,
        }
        for band, count in ranges.items()
    ]


# ── Time utilities ────────────────────────────────────────────────────────────

def utcnow() -> datetime:
    """Return the current UTC time as a timezone-aware datetime object."""
    return datetime.now(timezone.utc)


def utcnow_iso() -> str:
    """Return the current UTC time as an ISO 8601 string."""
    return datetime.now(timezone.utc).isoformat()


def minutes_since(dt: datetime) -> int:
    """
    Return how many minutes have elapsed since a given datetime.
    Handles both naive (assumed UTC) and timezone-aware datetimes.
    """
    now = datetime.now(timezone.utc)
    # If dt is naive, treat it as UTC to avoid TypeError on subtraction
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    delta = now - dt
    return int(delta.total_seconds() / 60)


# ── Input sanitisation ────────────────────────────────────────────────────────

def clean_str(value, default: str = "") -> str:
    """Strip whitespace from a string value; return default if None or empty."""
    if value is None:
        return default
    return str(value).strip() or default


def clamp(value: int | float, min_val: int | float, max_val: int | float):
    """Clamp a number to [min_val, max_val]."""
    return max(min_val, min(max_val, value))