"""
QuizGen Platform — Recommendation Service
FILE : app/services/recommendation_service.py

Generates personalised study recommendations and risk analysis.
Orchestrates calls to performance_service and ai_service.
"""

from .performance_service import get_user_results, get_user_stats, get_topic_breakdown
from .ai_service import generate_smart_recommendations, predict_performance_risk


def build_recommendations(
    user_id: str,
    exam_type: str,
    learning_style: str = "visual",
) -> dict:
    """
    Build a personalised study recommendation package.

    Flow:
      1. Load the student's overall stats and topic breakdown
      2. Identify weak and strong topics
      3. Ask AI to generate strategies, resources, and a weekly plan

    Returns the AI recommendations dict with added weak_topics and strong_topics fields.
    """
    stats     = get_user_stats(user_id)
    avg_score = float(stats.get("avg_score") or 0)
    breakdown = get_topic_breakdown(user_id)

    weak_topics   = [t["topic"] for t in breakdown if t["mastery"] == "low"][:5]
    strong_topics = [t["topic"] for t in breakdown if t["mastery"] == "high"][:3]

    recommendations = generate_smart_recommendations(
        weak_topics    = weak_topics,
        strong_topics  = strong_topics,
        exam_type      = exam_type,
        avg_score      = avg_score,
        learning_style = learning_style,
    )

    # Enrich the response with the raw topic data for the frontend to use
    recommendations["weak_topics"]   = weak_topics
    recommendations["strong_topics"] = strong_topics
    recommendations["avg_score"]     = avg_score

    return recommendations


def get_risk_analysis(user_id: str, upcoming_exam: str = "") -> dict:
    """
    Predict performance risk for an upcoming exam.

    Returns: risk_level, pass_probability, alerts, and intervention_plan.
    """
    results = get_user_results(user_id, limit=20)
    return predict_performance_risk(results, upcoming_exam)
