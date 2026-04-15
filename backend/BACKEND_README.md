# QuizGen Platform — Backend API v3.0

> AI-powered quiz and assessment platform for individual learners (B2C) and educational institutions (B2B).
> Built with **Flask**, **MongoDB Atlas**, and **OpenRouter AI**.

---

## What Does This Backend Do?

This is the server (API) that powers the QuizGen platform. In simple terms:

- **Students** can take AI-generated quizzes, get performance reports, and chat with an AI tutor
- **Institutes** (schools/coaching centres) can create custom exams, track student results, and detect cheating
- **AI** generates the questions, evaluates answers, explains concepts, and makes study recommendations
- **Offline mode** lets students take printed quizzes and scan the answer sheet when back online

---

## Tech Stack

| What | Technology | Why |
|------|-----------|-----|
| Web Framework | Flask 3.0 (Python) | Lightweight, easy to extend |
| Database | MongoDB Atlas | Flexible document storage, cloud-hosted |
| Authentication | JWT (PyJWT) | Stateless tokens, no server sessions |
| AI Provider | OpenRouter | Single API to access GPT-4o, Claude, Gemini |
| CORS | Flask-CORS | Allows the React frontend to talk to this API |
| Production Server | Gunicorn | Multi-worker HTTP server |
| Runtime | Python 3.12 | Current stable release |

---

## Project Structure

```
quizgen/                          ← project root
│
├── run.py                        ← Entry point — starts the server
├── requirements.txt              ← Python package list
├── .env                          ← Your secrets (NEVER commit this)
├── .env.example                  ← Template — safe to commit
├── runtime.txt                   ← Python version for deployment
│
└── app/                          ← Application package
    ├── __init__.py               ← App factory: wires Flask + DB + blueprints
    │
    ├── config/
    │   └── settings.py           ← All settings loaded from .env
    │
    ├── models/                   ← Database layer (MongoDB via PyMongo)
    │   ├── database.py           ← Connection, indexes, shared mongo object
    │   ├── user_model.py         ← users collection
    │   ├── exam_model.py         ← countries + public exams (JEE, SAT, etc.)
    │   ├── institute_model.py    ← institute_exams collection
    │   ├── attempt_model.py      ← exam_attempts collection
    │   ├── report_model.py       ← exam_reports collection
    │   └── result_model.py       ← test_results + performance aggregation
    │
    ├── routes/                   ← HTTP endpoints (thin controllers)
    │   ├── auth_routes.py        ← /auth — register, login, profile
    │   ├── quiz_routes.py        ← /quiz — countries, exams, submit, performance
    │   ├── institute_routes.py   ← /institute — create/manage exams, analytics
    │   ├── student_routes.py     ← /student — take exam, submit, view report
    │   ├── practice_routes.py    ← /practice — AI adaptive practice sessions
    │   ├── tutor_routes.py       ← /tutor — AI chat, recommendations, risk
    │   └── offline_routes.py     ← /offline — generate PDF, scan answer sheet
    │
    ├── services/                 ← Business logic layer
    │   ├── ai_service.py         ← All OpenRouter API calls + fallback logic
    │   ├── exam_service.py       ← Lazy exam seeding for countries
    │   ├── performance_service.py← Stats, history, topic breakdown
    │   ├── practice_service.py   ← Practice session generation + persistence
    │   ├── recommendation_service.py ← Study recommendations + risk analysis
    │   ├── tutor_service.py      ← AI tutor chat + session persistence
    │   └── question_bank.py      ← Offline curated MCQ fallback pool
    │
    └── utils/                    ← Shared helper code
        ├── auth.py               ← JWT creation, verification, route decorators
        ├── helpers.py            ← grade(), error_response(), clean_str(), etc.
        └── logger.py             ← Centralised logging configuration
```

---

## How the Code is Organised (Architecture)

The code follows a strict **3-layer architecture**. Think of it as three floors of a building:

```
┌─────────────────────────────────────────────┐
│  ROUTES  (app/routes/)                       │  ← Floor 1: Door to the building
│  Receive HTTP request → validate input       │    Routes only do: parse request,
│  → call service → return JSON response       │    validate, call service, return JSON
└──────────────────┬──────────────────────────┘
                   │ calls
┌──────────────────▼──────────────────────────┐
│  SERVICES  (app/services/)                   │  ← Floor 2: Where the work happens
│  All business logic lives here.              │    Services contain all the rules,
│  Calls models and AI as needed.              │    calculations, and decisions
└──────────────────┬──────────────────────────┘
                   │ calls
┌──────────────────▼──────────────────────────┐
│  MODELS  (app/models/)                       │  ← Floor 3: Database access only
│  MongoDB queries only — no logic.            │    Models never contain business rules
│  Returns raw data to services.               │    One file per collection
└─────────────────────────────────────────────┘
```

**Rule:** Routes never touch MongoDB directly. Services never build HTTP responses. Models never make decisions.

---

## Getting Started

### Step 1 — Prerequisites

- Python 3.12 or higher
- A MongoDB Atlas account (free tier works) — [cloud.mongodb.com](https://cloud.mongodb.com)
- An OpenRouter API key (free credits available) — [openrouter.ai](https://openrouter.ai)

### Step 2 — Clone & Install

```bash
# Clone the project
git clone https://github.com/your-org/quizgen-backend.git
cd quizgen-backend

# Create an isolated Python environment (strongly recommended)
python -m venv venv

# Activate it
source venv/bin/activate      # macOS / Linux
venv\Scripts\activate         # Windows

# Install all dependencies
pip install -r requirements.txt
```

### Step 3 — Configure Environment Variables

```bash
# Copy the template
cp .env.example .env

# Open .env and fill in your values
nano .env       # or use any text editor
```

The required values are:

| Variable | Required | What to put here |
|----------|----------|-----------------|
| `SECRET_KEY` | ✅ | A long random string — run `python -c "import secrets; print(secrets.token_hex(32))"` |
| `MONGO_URL` | ✅ | Your MongoDB Atlas connection string (found in Atlas dashboard → Connect) |
| `OPENROUTER_API_KEY` | ✅ | Your OpenRouter API key (the app still works without it but questions will use fallback data) |
| `FLASK_ENV` | ⬜ | `development` for local dev (enables auto-reload), `production` for live server |
| `OPENROUTER_MODEL` | ⬜ | Which AI model to use. Default: `openai/gpt-4o-mini` |
| `JWT_EXPIRY_HOURS` | ⬜ | How long login tokens last. Default: `24` |
| `FRONTEND_URL` | ⬜ | Your React app URL for CORS. Default: `http://localhost:3000` |

### Step 4 — Run the Server

```bash
# Development mode (auto-reloads on code changes)
FLASK_ENV=development python run.py

# Production mode
python run.py
```

Visit `http://localhost:5000/health` — you should see a JSON response confirming the server is running.

---

## API Quick Reference

All responses follow this structure:

```json
// Success
{ "success": true,  "data": { ... } }

// Error
{ "success": false, "error": "Human-readable message" }
```

Protected routes require this HTTP header:
```
Authorization: Bearer <your-jwt-token>
```

### Authentication — `/auth`

| Method | URL | Auth | What it does |
|--------|-----|------|-------------|
| `POST` | `/auth/register` | ❌ | Create account. Returns JWT immediately |
| `POST` | `/auth/login` | ❌ | Login with username + password. Returns JWT |
| `POST` | `/auth/logout` | ❌ | Stateless — just discard the token on the client |
| `GET`  | `/auth/me` | ✅ | Get your own profile |
| `PUT`  | `/auth/me` | ✅ | Update your profile or email |

**Register example:**
```json
POST /auth/register
{
  "username": "rahul_2024",
  "password": "mypassword",
  "email": "rahul@example.com",
  "role": "student"
}
```

---

### Quiz (Public Exams) — `/quiz`

For B2C students taking country-based exams like JEE, SAT, NEET.

| Method | URL | Auth | What it does |
|--------|-----|------|-------------|
| `GET`  | `/quiz/countries` | ❌ | List all 12 countries |
| `GET`  | `/quiz/exams/<country_id>` | ❌ | List all exams for a country |
| `GET`  | `/quiz/exam/<exam_id>` | ❌ | Get one exam's details |
| `GET`  | `/quiz/questions/<exam_id>` | ✅ | AI-generate questions for an exam |
| `POST` | `/quiz/submit` | ✅ | Submit a completed quiz and save the result |
| `GET`  | `/quiz/performance/<user_id>` | ✅ | Full performance dashboard |
| `GET`  | `/quiz/report/<result_id>` | ✅ | AI-generated report for one result |
| `POST` | `/quiz/explain` | ✅ | Ask AI to explain any concept |

**Get questions example:**
```
GET /quiz/questions/<exam_id>?count=20&difficulty=medium&type=mcq
```

---

### Institute (School Exams) — `/institute`

For schools/institutes creating and managing their own custom exams.

| Method | URL | Auth | What it does |
|--------|-----|------|-------------|
| `POST` | `/institute/generate-questions` | ✅ | AI-generate questions for any topic |
| `POST` | `/institute/create-exam` | ✅ | Create and publish a new exam |
| `GET`  | `/institute/my-exams` | ✅ | List all exams you created |
| `GET`  | `/institute/list-exams` | ❌ | Browse all published exams |
| `PUT`  | `/institute/exam/<exam_id>` | ✅ | Edit your exam |
| `DELETE` | `/institute/exam/<exam_id>` | ✅ | Delete your exam |
| `GET`  | `/institute/analytics/<exam_id>` | ✅ | Score analytics for all students |
| `POST` | `/institute/log-cheating` | ❌ | Log a browser cheating event |

---

### Student (Taking Institute Exams) — `/student`

For students who take exams created by institutes.

| Method | URL | Auth | What it does |
|--------|-----|------|-------------|
| `GET`  | `/student/search/<query>` | ❌ | Search for exams by institute or exam ID |
| `GET`  | `/student/exam/<identifier>` | ❌ | Preview an exam (no answers shown) |
| `POST` | `/student/attempt/<exam_id>` | ❌ | Start an attempt (returns questions) |
| `POST` | `/student/submit/<attempt_id>` | ❌ | Submit answers and get graded |
| `GET`  | `/student/report/<report_id>` | ❌ | View AI-generated report |
| `GET`  | `/student/history/<student_id>` | ❌ | See all past attempts |

> Students don't need an account — they are identified by a `student_id` string (device ID, roll number, etc.)

---

### Practice (Adaptive Sessions) — `/practice`

For B2C students wanting personalised AI-adaptive practice.

| Method | URL | Auth | What it does |
|--------|-----|------|-------------|
| `GET`  | `/practice/exams/<country_id>` | ✅ | List available exams for a country |
| `POST` | `/practice/generate` | ✅ | Generate a personalised AI practice session |
| `POST` | `/practice/save` | ✅ | Save a completed session |
| `GET`  | `/practice/history` | ✅ | See past practice sessions (paginated) |

**Generate practice example:**
```json
POST /practice/generate
{
  "country_id": "...",
  "exam_id": "...",
  "difficulty": "medium",
  "count": 20
}
```

---

### AI Tutor — `/tutor`

24/7 AI tutoring and personalised study planning.

| Method | URL | Auth | What it does |
|--------|-----|------|-------------|
| `POST` | `/tutor/chat` | ✅ | Multi-turn tutoring conversation |
| `POST` | `/tutor/explain` | ✅ | Explain any concept at any level |
| `POST` | `/tutor/adaptive` | ✅ | Generate adaptive follow-up questions |
| `POST` | `/tutor/recommendations` | ✅ | Get a personalised study plan |
| `GET`  | `/tutor/risk` | ✅ | Predict risk for an upcoming exam |
| `POST` | `/tutor/save-session` | ✅ | Save a conversation |
| `GET`  | `/tutor/sessions` | ✅ | Retrieve past sessions |

**Chat example:**
```json
POST /tutor/chat
{
  "subject": "Physics",
  "messages": [
    { "role": "user", "content": "What is Newton's second law?" }
  ]
}
```

---

### Offline Quizzes — `/offline`

Generate printable PDFs and scan answer sheets with AI vision.

| Method | URL | Auth | What it does |
|--------|-----|------|-------------|
| `POST` | `/offline/generate` | ✅ | Generate quiz, returns code + questions |
| `GET`  | `/offline/download/<code>` | ✅ | Download printable PDF (add `?answer_key=true` for teacher copy) |
| `GET`  | `/offline/quiz/<code>` | ✅ | Retrieve a stored quiz by code |
| `GET`  | `/offline/my-quizzes` | ✅ | List your generated quizzes |
| `POST` | `/offline/scan` | ✅ | Scan a completed answer sheet image |
| `POST` | `/offline/save-result` | ✅ | Save the scanned result to performance hub |

---

### Health Check

```
GET /health
```

Returns server status, AI configuration, and available endpoints. No authentication required. Use this to verify the server is running.

---

## Database Collections

MongoDB stores data in **collections** (similar to tables in SQL). Here's what each collection holds:

| Collection | What's stored |
|------------|--------------|
| `users` | Student and institute accounts |
| `countries` | 12 countries (seeded once at startup) |
| `exams` | Public country-based exams (JEE, SAT, NEET, etc.) |
| `institute_exams` | Custom exams created by schools |
| `exam_attempts` | When a student starts and finishes an institute exam |
| `exam_reports` | AI-generated analysis reports per attempt |
| `test_results` | All quiz and practice session results |
| `tutor_sessions` | Saved AI tutoring conversations |
| `cheating_logs` | Browser events logged during exams (tab switch, etc.) |

---

## AI Integration

All AI is accessed through [OpenRouter](https://openrouter.ai), a unified API that lets you switch between GPT-4o, Claude, and Gemini by just changing a model name.

### What the AI does

| Function | What it produces |
|----------|-----------------|
| `generate_questions_for_exam()` | Questions matching the real exam's style (JEE/SAT/NEET difficulty and pattern) |
| `evaluate_descriptive_answer()` | Score + feedback for free-text answers |
| `generate_exam_report_insights()` | Strengths, weaknesses, study plan after an exam |
| `explain_concept()` | Simple + detailed explanation, examples, memory tips |
| `ai_tutor_chat()` | Conversational tutoring reply |
| `generate_personalised_practice()` | Session focused on the student's weak topics |
| `generate_smart_recommendations()` | Personalised study strategies and resources |
| `analyse_performance_trends()` | Trend detection: improving / declining / stable |
| `predict_performance_risk()` | Risk level (low/medium/high) + alerts |

### Exam-Specific AI Profiles

The AI is given custom instructions for each real-world exam so questions match the actual difficulty, style, and marking scheme:

| Country | Exams covered |
|---------|--------------|
| 🇮🇳 India | JEE Main, JEE Advanced, NEET, UPSC CSE, CAT, GATE, SSC CGL, IBPS PO, RRB NTPC |
| 🇺🇸 USA | SAT, ACT, GRE, GMAT, LSAT, MCAT, USMLE |
| 🇬🇧 UK | A-Levels, UCAT, BMAT, LNAT, IELTS |
| 🇦🇺 Australia | ATAR, GAMSAT, UCAT ANZ |
| 🇨🇦 Canada | MCAT, LSAT, GRE, CELPIP |
| + more | Germany, France, Japan, South Korea, Brazil, Singapore, UAE |

### What happens if the AI fails?

Every AI call is wrapped in a `try/except`. The app **never crashes** due to an AI failure:

```
1. Call OpenRouter
   ├── Success → return AI result
   ├── 429 Rate limit → retry up to 3× with exponential backoff (2s, 4s, 8s)
   ├── 401 Unauthorized → raise immediately (wrong API key)
   └── Any other error → return fallback data from question_bank.py
```

The fallback question bank (`question_bank.py`) contains pre-written MCQs organised by exam category (India STEM, US Graduate, English, Medical, Law) so students always get something useful.

---

## Security

### Authentication Flow

```
1. Student registers → server hashes password with PBKDF2-SHA256
2. Student logs in → server verifies hash → creates JWT
3. JWT stored by client → sent in every subsequent request as:
   Authorization: Bearer <token>
4. Server verifies signature on every protected route
5. Token expires after JWT_EXPIRY_HOURS (default 24h)
```

### Route Protection Decorators

```python
# Any logged-in user can access
@token_required
def my_route(current_user):
    ...

# Only specific roles can access
@role_required("admin", "institute")
def admin_only_route(current_user):
    ...
```

**Important:** Do NOT stack both decorators on the same route. `@role_required` already performs the full auth check internally.

### CORS

Only the following origins can call the API:
- `FRONTEND_URL` (from your `.env`)
- `http://localhost:3000` (React CRA default)
- `http://localhost:5173` (Vite default)

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created (new resource) |
| `400` | Bad request — missing or invalid input |
| `401` | Unauthorised — missing, expired, or invalid token |
| `403` | Forbidden — you don't have permission |
| `404` | Resource not found |
| `405` | HTTP method not allowed |
| `409` | Conflict — e.g. username already taken |
| `500` | Server error |

---

## Logging

The app uses Python's built-in `logging` module — **not `print()`**.

| Environment | Log level | Output |
|-------------|-----------|--------|
| `development` | DEBUG | Coloured console output |
| `production` | INFO | Console + rotating file in `logs/quizgen.log` |

Each module gets its own named logger:
```python
import logging
logger = logging.getLogger(__name__)
logger.info("User logged in: %s", username)
```

---

## Deployment

### Development (local)

```bash
FLASK_ENV=development python run.py
```

### Production (Gunicorn)

```bash
gunicorn "app:create_app()" \
  --bind 0.0.0.0:5000 \
  --workers 4 \
  --timeout 120 \
  --access-logfile -
```

### Docker

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["gunicorn", "app:create_app()", "--bind", "0.0.0.0:5000", "--workers", "4"]
```

### Pre-Deployment Checklist

- [ ] Set `SECRET_KEY` to a strong random value: `python -c "import secrets; print(secrets.token_hex(32))"`
- [ ] Set `FLASK_ENV=production`
- [ ] Set `MONGO_URL` to your production MongoDB cluster
- [ ] Set `OPENROUTER_API_KEY`
- [ ] Set `FRONTEND_URL` to your production frontend domain
- [ ] Add `.env` to `.gitignore` (never commit real secrets)
- [ ] Configure HTTPS at reverse proxy level (Nginx / Caddy / Cloudflare)
- [ ] Set up log rotation for `logs/quizgen.log`

---

## Common Issues

### "MONGO_URI is not configured"
→ Make sure you have a `.env` file with `MONGO_URL=mongodb+srv://...`

### "OPENROUTER_API_KEY not set"
→ The app will still work but questions will come from the fallback question bank, not AI. Add your key to `.env`.

### "Already attempted this exam" (409)
→ Each `student_id` can only attempt each institute exam once. Use a different `student_id` to test again.

### JWT token expired (401)
→ Log in again to get a fresh token. Adjust `JWT_EXPIRY_HOURS` in `.env` if needed.

### AI returns fallback questions instead of generated ones
→ Check that `OPENROUTER_API_KEY` is set and valid. Check the server logs for the error message.

---

## Key Design Decisions

| Decision | Reason |
|----------|--------|
| **Flask over Django** | Lighter weight, easier to understand, no ORM overhead with MongoDB |
| **PyMongo over MongoEngine** | Direct driver is simpler and more transparent — less magic |
| **JWT over sessions** | Stateless — scales to multiple servers without shared session storage |
| **OpenRouter over direct OpenAI** | One API key gives access to multiple AI models, easy to switch |
| **Lazy exam seeding** | Country exam catalogues are created on first request, not at startup — no manual seed step |
| **Fallback question bank** | Students always get questions even when AI is down |
| **No inline imports** | All imports at module top level — easier to test and reason about dependencies |
| **logging over print()** | Proper log levels, timestamps, file rotation, and can be silenced without code changes |

---

*QuizGen Platform API v3.0 — Built with Flask + MongoDB + OpenRouter AI*