"""
QuizGen Platform — Offline Question Bank
FILE : app/services/question_bank.py

A curated set of MCQ questions used as a fallback when:
  - The AI API is unavailable or rate-limited
  - The AI returns invalid/unparseable output

Questions are keyed by exam category bucket so fallbacks are at least
somewhat relevant to the exam being taken.

Public API:
  get_curated_mcq(exam_name, difficulty, count)     →  list[dict]
  get_curated_for_topic(topic, difficulty, count)   →  list[dict]
"""

from __future__ import annotations

import copy
import hashlib
import random
import re
from datetime import datetime


# ─────────────────────────────────────────────────────────────────────────────
# Helper to build a question dict
# ─────────────────────────────────────────────────────────────────────────────

def _q(
    text: str,
    options: list[str],
    correct: int,
    topic: str,
    difficulty: str = "medium",
    explanation: str = "",
) -> dict:
    """Build a normalised question dict with a stable hash-based ID."""
    q_hash = hashlib.sha256(text.encode()).hexdigest()[:12]
    return {
        "id":            f"bank_{q_hash}",
        "type":          "mcq",
        "text":          text,
        "question_text": text,       # always provide both field names
        "options":       options,
        "correctAnswer": correct,
        "explanation":   explanation or "Review the concept and try a similar problem.",
        "topic":         topic,
        "difficulty":    difficulty,
        "marks":         1,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Question pools  (extend each pool for production variety)
# ─────────────────────────────────────────────────────────────────────────────

# ── General / Default pool ────────────────────────────────────────────────────
_GENERAL_POOL = [
    _q("If a train travels 180 km in 3 hours, what is its speed?",
       ["45 km/h", "60 km/h", "90 km/h", "540 km/h"], 1,
       "Quantitative Reasoning", "easy", "Speed = distance ÷ time = 180 ÷ 3 = 60 km/h."),
    _q("Which sentence uses the subjunctive mood correctly?",
       ["I wish I was there.", "I wish I were there.", "I wish I am there.", "I wish I be there."], 1,
       "English Grammar", "medium", "The subjunctive uses 'were' for hypothetical wishes."),
    _q("In a right triangle with legs 3 and 4, what is the hypotenuse?",
       ["5", "6", "7", "12"], 0, "Geometry", "easy", "3-4-5 is a Pythagorean triple."),
    _q("Photosynthesis primarily occurs in which plant organelle?",
       ["Mitochondria", "Chloroplast", "Nucleus", "Ribosome"], 1, "Biology", "easy"),
    _q("What is the value of log₁₀(100)?",
       ["1", "2", "10", "100"], 1, "Mathematics", "easy"),
    _q("Which gas makes up approximately 78% of Earth's atmosphere?",
       ["Oxygen", "Carbon dioxide", "Nitrogen", "Argon"], 2, "General Science", "easy"),
    _q("If f(x) = 2x + 3, what is f(5)?",
       ["10", "11", "13", "16"], 2, "Algebra", "easy", "f(5) = 2(5) + 3 = 13."),
    _q("The derivative of x² with respect to x is:",
       ["x", "2x", "x²/2", "2"], 1, "Calculus", "medium"),
    _q("When demand increases and supply is unchanged, equilibrium price will:",
       ["Fall", "Rise", "Stay the same", "Become zero"], 1, "Economics", "medium"),
    _q("Which organ filters blood to produce urine?",
       ["Liver", "Heart", "Kidney", "Lung"], 2, "Human Biology", "easy"),
    _q("What is 15% of 200?",
       ["20", "25", "30", "35"], 2, "Arithmetic", "easy", "15/100 × 200 = 30."),
    _q("The speed of light in a vacuum is approximately:",
       ["3 × 10⁶ m/s", "3 × 10⁸ m/s", "3 × 10¹⁰ m/s", "3 × 10⁴ m/s"], 1,
       "Physics", "medium"),
    _q("Which planet is closest to the Sun?",
       ["Venus", "Earth", "Mars", "Mercury"], 3, "General Science", "easy"),
    _q("The chemical formula of water is:",
       ["H₂O₂", "HO", "H₂O", "H₃O"], 2, "Chemistry", "easy"),
    _q("Which of the following is a prime number?",
       ["15", "21", "37", "49"], 2, "Number Theory", "easy", "37 is divisible only by 1 and itself."),
]

# ── STEM / India exams pool ───────────────────────────────────────────────────
_STEM_INDIA_POOL = _GENERAL_POOL + [
    _q("A body of mass 2 kg accelerates at 3 m/s². What is the net force?",
       ["5 N", "6 N", "9 N", "12 N"], 1, "Physics – Mechanics", "easy", "F = ma = 2×3 = 6 N."),
    _q("What is the pH of a neutral solution at 25°C?",
       ["0", "7", "14", "1"], 1, "Chemistry", "easy"),
    _q("In DNA, adenine pairs with which base?",
       ["Guanine", "Cytosine", "Thymine", "Uracil"], 2, "Biology – Genetics", "medium"),
    _q("The integral ∫₀¹ 2x dx equals:",
       ["0", "1", "2", "4"], 1, "Calculus", "medium", "∫2x dx = x²; [0→1] = 1."),
    _q("Which law states: F = ma?",
       ["Newton's First Law", "Newton's Second Law", "Newton's Third Law", "Hooke's Law"], 1,
       "Physics", "easy"),
    _q("The atomic number of Carbon is:",
       ["4", "6", "8", "12"], 1, "Chemistry", "easy"),
    _q("∫ eˣ dx =",
       ["eˣ + C", "eˣ/x + C", "xeˣ + C", "1/eˣ + C"], 0, "Calculus", "medium"),
]

# ── US graduate / SAT / GRE pool ──────────────────────────────────────────────
_US_GRAD_POOL = _GENERAL_POOL + [
    _q("If 3x − 7 = 14, what is x?",
       ["5", "6", "7", "8"], 2, "Algebra", "medium", "3x = 21 → x = 7."),
    _q("Choose the word most similar to 'LACONIC':",
       ["Verbose", "Concise", "Ambiguous", "Eloquent"], 1,
       "Vocabulary", "hard", "Laconic means using few words — synonymous with concise."),
    _q("What is the range of the data set {3, 7, 7, 9, 15}?",
       ["6", "7", "12", "15"], 2, "Statistics", "medium", "Range = max − min = 15 − 3 = 12."),
    _q("A rectangle has length 8 and width 5. What is its area?",
       ["13", "26", "40", "80"], 2, "Geometry", "easy"),
    _q("'The committee ___ divided on the issue.' — correct verb form:",
       ["is", "are", "were", "be"], 0, "English Usage", "hard",
       "Committee as a single unit takes a singular verb in formal US English."),
]

# ── English proficiency pool (IELTS / TOEFL) ─────────────────────────────────
_ENGLISH_POOL = _GENERAL_POOL + [
    _q("Which sentence is grammatically correct?",
       ["She don't like coffee.", "She doesn't likes coffee.",
        "She doesn't like coffee.", "She not like coffee."], 2,
       "Grammar", "easy"),
    _q("In academic writing, a 'thesis statement' primarily:",
       ["Lists references", "States the main argument",
        "Summarises methodology", "Thanks the reader"], 1,
       "Academic Writing", "medium"),
    _q("The word 'ubiquitous' means:",
       ["Rare", "Present everywhere", "Ancient", "Mysterious"], 1,
       "Vocabulary", "medium"),
]

# ── Medical pool (NEET / MCAT / USMLE) ───────────────────────────────────────
_MEDICAL_POOL = _GENERAL_POOL + [
    _q("Normal resting heart rate for healthy adults is:",
       ["20–40 bpm", "60–100 bpm", "120–140 bpm", "150–180 bpm"], 1,
       "Physiology", "easy"),
    _q("Which vitamin deficiency classically causes scurvy?",
       ["Vitamin A", "Vitamin B12", "Vitamin C", "Vitamin D"], 2,
       "Biochemistry", "medium"),
    _q("The powerhouse of the cell is the:",
       ["Nucleus", "Ribosome", "Mitochondrion", "Lysosome"], 2,
       "Cell Biology", "easy"),
]

# ── Law pool (LSAT / LNAT) ────────────────────────────────────────────────────
_LAW_POOL = _GENERAL_POOL + [
    _q("In common law, 'stare decisis' refers to:",
       ["Judicial review of statutes", "Standing to sue",
        "Adherence to precedent", "Strict liability"], 2,
       "Legal Reasoning", "hard"),
    _q("Which branch of law governs disputes between private parties?",
       ["Criminal law", "Constitutional law", "Civil law", "International law"], 2,
       "Legal Concepts", "medium"),
]


# ─────────────────────────────────────────────────────────────────────────────
# Category routing
# ─────────────────────────────────────────────────────────────────────────────

def _get_bucket(name: str) -> str:
    """Map an exam name to a question pool bucket."""
    n = (name or "").lower()
    if re.search(r"\bjee\b|gate|neet|upsc|ssc|ibps|cat\b|rrb", n):
        return "STEM_IN"
    if re.search(r"\bsat\b|\bact\b|gre|gmat|lsat\b", n):
        return "US_GRAD"
    if re.search(r"ielts|toefl|celpip|english\b", n):
        return "ENGLISH"
    if re.search(r"mcat|usmle|gamsat|neet|medic", n):
        return "MEDICAL"
    if re.search(r"lsat|lnat|law\b", n):
        return "LAW"
    return "GENERAL"


_POOL_MAP = {
    "GENERAL": _GENERAL_POOL,
    "STEM_IN": _STEM_INDIA_POOL,
    "US_GRAD": _US_GRAD_POOL,
    "ENGLISH": _ENGLISH_POOL,
    "MEDICAL": _MEDICAL_POOL,
    "LAW":     _LAW_POOL,
}


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def get_curated_mcq(exam_name: str, difficulty: str, count: int) -> list[dict]:
    """
    Return up to `count` shuffled MCQs appropriate for the named exam.
    Filters by difficulty, falls back to general pool if pool is too small.
    """
    bucket = _get_bucket(exam_name)
    pool   = copy.deepcopy(_POOL_MAP.get(bucket, _GENERAL_POOL))
    random.shuffle(pool)

    result: list[dict] = []
    seen:   set[str]   = set()

    def _matches_difficulty(q: dict) -> bool:
        d = (q.get("difficulty") or "medium").lower()
        t = (difficulty or "medium").lower()
        if t == "easy":   return d in ("easy", "medium")
        if t == "hard":   return d in ("medium", "hard")
        return True   # medium accepts all

    # First pass: filtered by difficulty
    for q in pool:
        if len(result) >= count:
            break
        key = q["text"][:80]
        if key in seen or not _matches_difficulty(q):
            continue
        seen.add(key)
        q_copy = copy.deepcopy(q)
        # Make IDs unique per session to avoid React key collisions
        q_copy["id"] = f"{q_copy['id']}_{int(datetime.utcnow().timestamp() * 1000)}_{len(result)}"
        q_copy.setdefault("topic", exam_name)
        result.append(q_copy)

    # Second pass: fill remaining slots from general pool without difficulty filter
    if len(result) < count:
        for q in copy.deepcopy(_GENERAL_POOL):
            if len(result) >= count:
                break
            key = q["text"][:80]
            if key in seen:
                continue
            seen.add(key)
            q_copy = copy.deepcopy(q)
            q_copy["id"] = f"fill_{hashlib.sha256(key.encode()).hexdigest()[:8]}_{len(result)}"
            result.append(q_copy)

    return result[:count]


def get_curated_for_topic(topic: str, difficulty: str, count: int) -> list[dict]:
    """
    Same as get_curated_mcq but accepts a free-text topic string.
    Used by the institute question builder when the AI fails.
    """
    return get_curated_mcq(topic or "General Knowledge", difficulty, count)
