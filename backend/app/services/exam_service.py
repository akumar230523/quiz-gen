"""
QuizGen Platform — Exam Service
FILE : app/services/exam_service.py

Manages the catalogue of public/country-based exams (JEE, SAT, NEET, etc.).

get_or_create_exams_for_country() is the main entry point.
It checks the database for the country's exams and creates them from the
template list if they don't exist yet.  This way the DB is always populated
lazily — no manual seeding step required.
"""

from ..models.exam_model import ExamModel, CountryModel


# ─────────────────────────────────────────────────────────────────────────────
# Exam templates — one entry per real-world exam
# ─────────────────────────────────────────────────────────────────────────────

EXAM_TEMPLATES: dict[str, list[dict]] = {
    "India": [
        {"name": "JEE Main",    "description": "Joint Entrance Examination – Engineering Undergrad",  "duration": 180, "difficulty": "hard"},
        {"name": "JEE Advanced","description": "IIT Joint Entrance Examination – Advanced",           "duration": 180, "difficulty": "hard"},
        {"name": "NEET",        "description": "National Eligibility cum Entrance Test – Medical",    "duration": 200, "difficulty": "hard"},
        {"name": "UPSC CSE",    "description": "Civil Services Examination – IAS/IPS/IFS",            "duration": 300, "difficulty": "hard"},
        {"name": "CAT",         "description": "Common Admission Test – IIM MBA",                     "duration": 120, "difficulty": "hard"},
        {"name": "GATE",        "description": "Graduate Aptitude Test in Engineering",               "duration": 180, "difficulty": "hard"},
        {"name": "SSC CGL",     "description": "Staff Selection Commission – Combined Graduate Level","duration": 120, "difficulty": "medium"},
        {"name": "IBPS PO",     "description": "Institute of Banking Personnel Selection – PO",       "duration": 120, "difficulty": "medium"},
        {"name": "RRB NTPC",    "description": "Railway Recruitment Board – Non-Technical Popular Categories", "duration": 90, "difficulty": "medium"},
    ],
    "United States": [
        {"name": "SAT",         "description": "Scholastic Assessment Test – College Admission",     "duration": 180, "difficulty": "medium"},
        {"name": "ACT",         "description": "American College Testing",                           "duration": 175, "difficulty": "medium"},
        {"name": "GRE",         "description": "Graduate Record Examination",                        "duration": 205, "difficulty": "hard"},
        {"name": "GMAT",        "description": "Graduate Management Admission Test",                 "duration": 187, "difficulty": "hard"},
        {"name": "LSAT",        "description": "Law School Admission Test",                          "duration": 175, "difficulty": "hard"},
        {"name": "MCAT",        "description": "Medical College Admission Test",                     "duration": 375, "difficulty": "hard"},
        {"name": "USMLE",       "description": "United States Medical Licensing Examination",        "duration": 480, "difficulty": "hard"},
    ],
    "United Kingdom": [
        {"name": "A-Levels",    "description": "Advanced Level Qualifications – University Prep",   "duration": 180, "difficulty": "hard"},
        {"name": "UCAT",        "description": "University Clinical Aptitude Test – Medical/Dental","duration": 120, "difficulty": "hard"},
        {"name": "BMAT",        "description": "BioMedical Admissions Test",                        "duration": 120, "difficulty": "hard"},
        {"name": "LNAT",        "description": "National Admissions Test for Law",                  "duration": 135, "difficulty": "hard"},
        {"name": "IELTS",       "description": "International English Language Testing System",     "duration": 165, "difficulty": "medium"},
    ],
    "Australia": [
        {"name": "ATAR",        "description": "Australian Tertiary Admission Rank",                 "duration": 120, "difficulty": "medium"},
        {"name": "GAMSAT",      "description": "Graduate Medical School Admissions Test",            "duration": 318, "difficulty": "hard"},
        {"name": "UCAT ANZ",    "description": "University Clinical Aptitude Test – ANZ",           "duration": 120, "difficulty": "hard"},
        {"name": "IELTS",       "description": "International English Language Testing System",     "duration": 165, "difficulty": "medium"},
    ],
    "Canada": [
        {"name": "MCAT",        "description": "Medical College Admission Test",                    "duration": 375, "difficulty": "hard"},
        {"name": "LSAT",        "description": "Law School Admission Test",                         "duration": 175, "difficulty": "hard"},
        {"name": "GRE",         "description": "Graduate Record Examination",                       "duration": 205, "difficulty": "hard"},
        {"name": "CELPIP",      "description": "Canadian English Language Proficiency Index Program","duration": 180, "difficulty": "medium"},
        {"name": "IELTS",       "description": "International English Language Testing System",     "duration": 165, "difficulty": "medium"},
    ],
    "Germany": [
        {"name": "TestDaF",     "description": "Test of German as a Foreign Language",              "duration": 180, "difficulty": "hard"},
        {"name": "TestAS",      "description": "Test for Academic Studies",                          "duration": 180, "difficulty": "hard"},
        {"name": "DSH",         "description": "German University Language Entrance Examination",   "duration": 240, "difficulty": "hard"},
        {"name": "Goethe C1",   "description": "Goethe-Institut German Certification C1",          "duration": 200, "difficulty": "hard"},
    ],
    "France": [
        {"name": "BAC",         "description": "Baccalauréat – French High School Diploma",        "duration": 240, "difficulty": "hard"},
        {"name": "DELF B2",     "description": "Diplôme d'études en langue française B2",          "duration": 180, "difficulty": "medium"},
        {"name": "DALF C1",     "description": "Diplôme approfondi de langue française C1",        "duration": 240, "difficulty": "hard"},
        {"name": "Concours",    "description": "French Civil Service Competitive Examinations",    "duration": 300, "difficulty": "hard"},
    ],
    "Japan": [
        {"name": "JLPT N1",     "description": "Japanese Language Proficiency Test – N1",          "duration": 180, "difficulty": "hard"},
        {"name": "EJU",         "description": "Examination for Japanese University Admission",    "duration": 125, "difficulty": "hard"},
        {"name": "JASSO",       "description": "Japan Student Services Organisation Exam",         "duration": 150, "difficulty": "medium"},
    ],
    "South Korea": [
        {"name": "CSAT (수능)", "description": "College Scholastic Ability Test",                  "duration": 540, "difficulty": "hard"},
        {"name": "TOPIK II",    "description": "Test of Proficiency in Korean – Advanced",         "duration": 180, "difficulty": "hard"},
        {"name": "IELTS",       "description": "International English Language Testing System",    "duration": 165, "difficulty": "medium"},
    ],
    "Brazil": [
        {"name": "ENEM",        "description": "National High School Exam (Exame Nacional)",       "duration": 330, "difficulty": "hard"},
        {"name": "Vestibular",  "description": "University Entrance Examination",                  "duration": 240, "difficulty": "hard"},
        {"name": "Fuvest",      "description": "University of São Paulo Entrance Exam",            "duration": 240, "difficulty": "hard"},
    ],
    "Singapore": [
        {"name": "A-Levels",    "description": "GCE Advanced Level",                               "duration": 180, "difficulty": "hard"},
        {"name": "PSLE",        "description": "Primary School Leaving Examination",               "duration": 120, "difficulty": "medium"},
        {"name": "IELTS",       "description": "International English Language Testing System",    "duration": 165, "difficulty": "medium"},
    ],
    "UAE": [
        {"name": "EmSAT",       "description": "Emirates Standardised Test",                       "duration": 120, "difficulty": "medium"},
        {"name": "IELTS",       "description": "International English Language Testing System",    "duration": 165, "difficulty": "medium"},
        {"name": "TOEFL",       "description": "Test of English as a Foreign Language",            "duration": 200, "difficulty": "medium"},
    ],
}

# Used when a country has no specific template
DEFAULT_EXAMS: list[dict] = [
    {"name": "General Knowledge",   "description": "Comprehensive general knowledge test", "duration": 60,  "difficulty": "medium"},
    {"name": "English Proficiency", "description": "English language assessment",          "duration": 90,  "difficulty": "medium"},
    {"name": "Logical Reasoning",   "description": "Aptitude and reasoning test",          "duration": 60,  "difficulty": "medium"},
]


# ─────────────────────────────────────────────────────────────────────────────
# Main service function
# ─────────────────────────────────────────────────────────────────────────────

def get_or_create_exams_for_country(country_id: str) -> list[dict]:
    """
    Return all exams for a country, creating the DB entries if needed.

    Flow:
      1. Look up the country by _id
      2. Look up the exam templates for that country name
      3. For each template, upsert the exam in MongoDB (create if not exists)
      4. Return the full list with MongoDB _ids

    This is called lazily — exams are created the first time a country is selected.
    """
    country = CountryModel.get_by_id(country_id)
    if not country:
        print(f"[ExamService] Country not found: {country_id}")
        return []

    country_name = country.get("name", "")
    templates    = EXAM_TEMPLATES.get(country_name, DEFAULT_EXAMS)

    result = []
    for tmpl in templates:
        exam_db_id = ExamModel.upsert(
            name        = tmpl["name"],
            country_id  = country_id,
            description = tmpl["description"],
            duration    = tmpl["duration"],
            difficulty  = tmpl["difficulty"],
        )
        result.append({
            "_id":         exam_db_id,
            "name":        tmpl["name"],
            "description": tmpl["description"],
            "country_id":  country_id,
            "duration":    tmpl["duration"],
            "difficulty":  tmpl["difficulty"],
            "offline":     True,
            "online":      True,
        })

    return result
