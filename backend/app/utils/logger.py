"""
QuizGen Platform — Centralised Logging
FILE : app/utils/logger.py

HOW TO USE IN ANY MODULE:
    import logging
    logger = logging.getLogger(__name__)

    logger.info("Server started")
    logger.warning("Something unexpected")
    logger.error("Something failed")
    logger.debug("Detailed dev info")   <- only shows if level set to DEBUG

setup_logging() is called ONCE from create_app(). After that every module's
logger automatically inherits the right level and format.

THIRD-PARTY NOISE:
  pymongo, urllib3, and werkzeug produce hundreds of internal DEBUG lines
  (connection pool, socket selection, raw commands, etc.).
  We silence them to WARNING in EVERY environment — dev AND prod alike —
  because they are never useful in normal day-to-day work.
  If you ever need to debug a raw MongoDB wire issue, temporarily call:
      logging.getLogger("pymongo").setLevel(logging.DEBUG)
"""

import logging
import os
import sys
from logging.handlers import RotatingFileHandler


# ── ANSI colour codes (development console only) ──────────────────────────────

_COLOURS = {
    "DEBUG":    "\033[36m",    # Cyan
    "INFO":     "\033[32m",    # Green
    "WARNING":  "\033[33m",    # Yellow
    "ERROR":    "\033[31m",    # Red
    "CRITICAL": "\033[35m",    # Magenta
    "RESET":    "\033[0m",
}


class _ColouredFormatter(logging.Formatter):
    """Adds colour to log level names in terminal output."""

    def format(self, record: logging.LogRecord) -> str:
        colour = _COLOURS.get(record.levelname, "")
        reset  = _COLOURS["RESET"]
        record.levelname = f"{colour}{record.levelname:<8}{reset}"
        return super().format(record)


# ── Public setup function ─────────────────────────────────────────────────────

def setup_logging(app_name: str = "quizgen") -> None:
    """
    Configure all logging for the app. Call once from create_app().

    Development  -> INFO level, coloured output to terminal
    Production   -> INFO level, plain output to terminal + rotating log file
    """
    flask_env = os.getenv("FLASK_ENV", "production")
    is_dev    = flask_env == "development"

    # INFO in both modes — DEBUG would flood the terminal with internal detail
    level = logging.INFO

    # Format strings
    dev_fmt  = "%(levelname)s [%(name)s] %(message)s"
    prod_fmt = "%(asctime)s %(levelname)-8s [%(name)s] %(message)s"
    date_fmt = "%Y-%m-%d %H:%M:%S"

    # Console handler
    console = logging.StreamHandler(sys.stdout)
    if is_dev:
        console.setFormatter(_ColouredFormatter(dev_fmt))
    else:
        console.setFormatter(logging.Formatter(prod_fmt, datefmt=date_fmt))

    handlers: list[logging.Handler] = [console]

    # Rotating file handler (production only)
    if not is_dev:
        log_dir = os.path.join(os.getcwd(), "logs")
        os.makedirs(log_dir, exist_ok=True)
        file_handler = RotatingFileHandler(
            os.path.join(log_dir, f"{app_name}.log"),
            maxBytes    = 10 * 1024 * 1024,  # 10 MB per file
            backupCount = 5,
            encoding    = "utf-8",
        )
        file_handler.setFormatter(logging.Formatter(prod_fmt, datefmt=date_fmt))
        handlers.append(file_handler)

    # Apply to root logger
    logging.basicConfig(level=level, handlers=handlers, force=True)

    # ── Silence noisy third-party libraries ───────────────────────────────
    # These libraries produce hundreds of internal DEBUG/INFO lines that are
    # not useful during normal development or production monitoring.
    # Setting to WARNING means you still see real errors — just not chatter.
    # THIS RUNS IN EVERY ENVIRONMENT, including development.
    _NOISY_LIBS = [
        "pymongo",                  # Raw MongoDB wire protocol details
        "pymongo.command",          # Every single DB command logged in full JSON
        "pymongo.serverSelection",  # Replica set election chatter
        "urllib3",                  # HTTP connection pool internals
        "urllib3.connectionpool",
        "bson",                     # BSON codec internals
    ]
    for lib in _NOISY_LIBS:
        logging.getLogger(lib).setLevel(logging.WARNING)

    # werkzeug at INFO so you still see incoming HTTP request lines like:
    # INFO [werkzeug] GET /health 200
    logging.getLogger("werkzeug").setLevel(logging.INFO)

    logger = logging.getLogger(app_name)
    logger.info("QuizGen logging ready — env=%s", flask_env)