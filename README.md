# QuizGen Platform v2.0

### AI-Powered Adaptive Exam & Learning Platform

Built with **Flask + React + MongoDB Atlas + Google Gemini AI**

---

## 🚀 Quick Start (5 minutes)

### Step 1 — MongoDB Atlas Setup

1. Go to [https://cloud.mongodb.com](https://cloud.mongodb.com) → **Create free account**
2. Create a new project: `QuizGen`
3. Build a **free M0 cluster** (choose any region)
4. Under **Database Access** → Add a user with `Read/Write` permissions
5. Under **Network Access** → Add IP `0.0.0.0/0` (allow all) for development
6. Click **Connect** → **Connect your application** → Copy the URI
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/quizgen?retryWrites=true&w=majority
   ```

### Step 2 — Get Gemini AI Key

1. Go to [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
2. Create API Key → Copy it

### Step 3 — Backend Setup

```bash
cd quizgen/backend

# Create virtual environment
# python -m venv .venv
# source .venv/bin/activate      # Linux/Mac
# .venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — paste your MONGO_URI and GEMINI_API_KEY

# Run server
python run.py
# ✅ API running at http://localhost:5000
```

### Step 4 — Frontend Setup

```bash
cd quizgen/frontend

npm install
npm run dev
# ✅ App running at http://localhost:3000
```

---

## 📁 Project Structure

```
quizgen/
├── backend/
│   ├── app/
│   │   ├── __init__.py          # Flask app factory
│   │   ├── config.py            # Config from env vars
│   │   ├── models/
│   │   │   └── database.py      # MongoDB Atlas models & init
│   │   ├── routes/
│   │   │   ├── auth.py          # Register, login, profile
│   │   │   ├── quiz.py          # Countries, exams, generate, submit
│   │   │   ├── institute.py     # Create exam, analytics
│   │   │   ├── student.py       # Attempt, submit, report
│   │   │   └── practice.py      # AI practice sessions
│   │   ├── services/
│   │   │   ├── ai_service.py    # All Gemini AI calls
│   │   │   └── exam_service.py  # Country exam templates
│   │   └── utils/
│   │       └── auth.py          # JWT utilities
│   ├── requirements.txt
│   ├── run.py                   # Entry point
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   └── common/
    │   │       ├── Layout.jsx
    │   │       ├── Navbar.jsx
    │   │       └── Spinner.jsx
    │   ├── context/
    │   │   └── AuthContext.jsx  # Global auth state
    │   ├── pages/
    │   │   ├── Landing.jsx
    │   │   ├── Auth/            # Login, Register
    │   │   ├── Dashboard/       # Dashboard, Countries, Exams, Profile
    │   │   ├── Exam/            # OnlineTest, TestReport
    │   │   ├── Practice/        # Practice, PracticeSession
    │   │   ├── Institute/       # CreateExam, MyExams, Analytics
    │   │   └── Student/         # StudentExams, ExamAttempt, ExamReport
    │   ├── services/
    │   │   └── api.js           # All API calls
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css            # Tailwind + custom design system
    ├── package.json
    ├── vite.config.js
    └── tailwind.config.js
```

---

## 🌟 Feature Matrix

| Feature | Status |
|---------|--------|
| JWT Authentication (Student / Institute) | ✅ |
| MongoDB Atlas with auto-indexes | ✅ |
| AI Question Generation (Gemini) | ✅ |
| Online MCQ Test with Timer | ✅ |
| Descriptive Test Support | ✅ |
| AI Descriptive Answer Evaluation | ✅ |
| AI Performance Report & Insights | ✅ |
| Personalised AI Practice Sessions | ✅ |
| Score Trend Charts | ✅ |
| Institute Exam Creation (3-step wizard) | ✅ |
| Institute Analytics Dashboard | ✅ |
| Student Exam Search by Institute | ✅ |
| One-attempt-per-student enforcement | ✅ |
| AI Tutor (explain any concept) | ✅ |
| Study Plan Generation | ✅ |
| Performance Trend Analysis | ✅ |
| 12 Countries × 80+ Exam Types | ✅ |
| Cheating Detection (backend hook) | ✅ |
| Responsive Design (mobile-first) | ✅ |
| Dark theme with glass morphism UI | ✅ |

---

## 🔑 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register (student or institute) |
| POST | `/auth/login` | Login, returns JWT |
| GET  | `/auth/me` | Get current user profile |

### Quiz (Country-based)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/quiz/countries` | All 12 countries |
| GET | `/quiz/exams/:countryId` | Exams for country |
| GET | `/quiz/questions/:examId` | AI-generated questions |
| POST | `/quiz/submit` | Submit test results |
| GET | `/quiz/performance/:userId` | Performance analytics |
| GET | `/quiz/report/:resultId` | Detailed AI report |
| POST | `/quiz/explain` | AI tutor explain concept |

### Institute
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/institute/generate-questions` | AI question generation |
| POST | `/institute/create-exam` | Publish an exam |
| GET  | `/institute/my-exams` | Your published exams |
| GET  | `/institute/analytics/:examId` | Class analytics |
| DELETE | `/institute/exam/:examId` | Delete exam |

### Student
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | `/student/exams/:ref` | Search by institute/ID |
| GET  | `/student/exam/:id` | Exam details |
| POST | `/student/attempt/:examId` | Start attempt |
| POST | `/student/submit/:attemptId` | Submit answers + get report |
| GET  | `/student/report/:reportId` | View detailed report |

### Practice
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/practice/generate` | AI personalised session |
| POST | `/practice/save` | Save completed session |
| GET  | `/practice/history` | Past practice sessions |
| POST | `/practice/tutor` | AI tutor conversation |

---

## 🎨 Design System

The UI uses a custom dark theme built on:
- **Font**: Syne (display) + DM Sans (body) + JetBrains Mono (code)
- **Colors**: `#0a0f1e` base, `#00f5d4` neon accent, `#7c3aed` violet
- **Glassmorphism** cards with `backdrop-blur`
- **CSS variables** for consistent theming
- **Tailwind v3** with custom design tokens

---

## 🔧 Environment Variables

```env
# Required
SECRET_KEY=your-secret-key
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/quizgen
GEMINI_API_KEY=your-gemini-api-key

# Optional
PORT=5000
FLASK_ENV=development
JWT_EXPIRY_HOURS=24
FRONTEND_URL=http://localhost:3000
```

---

## 🚢 Production Deployment

### Backend (Gunicorn)
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 "app:create_app()"
```

### Frontend (Vite build)
```bash
npm run build
# Serve /dist with Nginx or any static host
```

### Docker (optional)
```dockerfile
# Backend
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt gunicorn
COPY . .
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "run:app"]
```

---

## 📞 Support

For issues, check:
1. `GEMINI_API_KEY` is valid and has quota
2. MongoDB Atlas IP whitelist includes your server IP
3. `MONGO_URI` has correct username/password and cluster name
4. Backend health: `GET http://localhost:5000/health`