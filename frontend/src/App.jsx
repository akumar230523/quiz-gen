import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Spinner from '@/components/common/Spinner';

// Public
import Landing from '@/pages/Landing';
import Login from '@/pages/Auth/Login';
import Register from '@/pages/Auth/Register';
import NotFound from '@/pages/NotFound';

// Dashboard
import Dashboard from '@/pages/Dashboard/Dashboard';
import Countries from '@/pages/Dashboard/Countries';
import Exams from '@/pages/Dashboard/Exams';
import Profile from '@/pages/Dashboard/Profile';

// Exams (country-based)
import OnlineTest from '@/pages/Exam/OnlineTest';
import TestReport from '@/pages/Exam/TestReport';
import AdaptiveQuiz from '@/pages/Exam/AdaptiveQuiz';

// Practice
import Practice from '@/pages/Practice/Practice';
import PracticeSession from '@/pages/Practice/PracticeSession';

// Offline Quiz 
import OfflineQuiz from '@/pages/Offline/OfflineQuiz';

// AI Features
import AITutor from '@/pages/Tutor/AITutor';
import PerformanceHub from '@/pages/Performance/PerformanceHub';
import Recommendations from '@/pages/Recommendations/Recommendations';

// Institute (role-gated)
import CreateExam from '@/pages/Institute/CreateExam';
import MyExams from '@/pages/Institute/MyExams';
import Analytics from '@/pages/Institute/Analytics';

// Student portal
import StudentExams from '@/pages/Student/StudentExams';
import ExamAttempt from '@/pages/Student/ExamAttempt';
import ExamReport from '@/pages/Student/ExamReport';

function Loading() {
    return <div className="min-h-screen bg-ink flex items-center justify-center"><Spinner size="lg" /></div>;
}

function Guard({ children }) {
    const { isAuth, loading } = useAuth();
    if (loading) return <Loading />;
    return isAuth ? children : <Navigate to="/login" replace />;
}

function GuestOnly({ children }) {
    const { isAuth, loading } = useAuth();
    if (loading) return <Loading />;
    return !isAuth ? children : <Navigate to="/dashboard" replace />;
}

function InstituteGuard({ children }) {
    const { user, isAuth, loading } = useAuth();
    if (loading) return <Loading />;
    if (!isAuth) return <Navigate to="/login" replace />;
    if (user?.role !== 'institute') return <Navigate to="/dashboard" replace />;
    return children;
}

export default function App() {
    return (
        <Routes>
            {/* ── Public ─────────────────────────────── */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
            <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />

            <Route path="/dashboard" element={<Guard><Dashboard /></Guard>} />
            <Route path="/countries" element={<Guard><Countries /></Guard>} />
            <Route path="/exams/:countryId" element={<Guard><Exams /></Guard>} />
            <Route path="/profile" element={<Guard><Profile /></Guard>} />

            <Route path="/exam/:examId" element={<ExamAttempt />} />
            <Route path="/exam/report/:reportId" element={<ExamReport />} />
            <Route path="/student/exams" element={<Guard><StudentExams /></Guard>} />

            <Route path="/test/:examId" element={<Guard><OnlineTest /></Guard>} />
            <Route path="/report/:resultId" element={<Guard><TestReport /></Guard>} />
            <Route path="/adaptive" element={<Guard><AdaptiveQuiz /></Guard>} />

            <Route path="/practice" element={<Guard><Practice /></Guard>} />
            <Route path="/practice/session" element={<Guard><PracticeSession /></Guard>} />

            <Route path="/tutor" element={<Guard><AITutor /></Guard>} />
            <Route path="/performance" element={<Guard><PerformanceHub /></Guard>} />
            <Route path="/recommendations" element={<Guard><Recommendations /></Guard>} />
            <Route path="/offline" element={<Guard><OfflineQuiz /></Guard>} />

            <Route path="/institute/create" element={<InstituteGuard><CreateExam /></InstituteGuard>} />
            <Route path="/institute/exams" element={<InstituteGuard><MyExams /></InstituteGuard>} />
            <Route path="/institute/analytics" element={<InstituteGuard><Analytics /></InstituteGuard>} />

            <Route path="*" element={<NotFound />} />
        </Routes>
    );
}