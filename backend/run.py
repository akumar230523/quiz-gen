"""
QuizGen Platform — Entry Point
FILE : quizgen/run.py
RUN  : cd quizgen  →  python run.py
"""

import os
import sys

# Make sure Python can find the `app` package inside this folder
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app

# ── Create the Flask application ─────────────────────────────────────────────
app = create_app()

# ── Start the development server ─────────────────────────────────────────────
if __name__ == "__main__":
    port  = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_ENV", "production") == "development"

    print(f"""
╔══════════════════════════════════════════╗
║   QuizGen Platform API  v3.0             ║
║   http://localhost:{port}                  ║
║   Mode : {"Development" if debug else "Production "}                     ║
║   Docs : http://localhost:{port}/health    ║
╚══════════════════════════════════════════╝
    """)

    app.run(debug=debug, host="0.0.0.0", port=port)
