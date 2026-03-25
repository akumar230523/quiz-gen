import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({ baseURL: BASE, timeout: 60_000 });

// Attach JWT to every request
api.interceptors.request.use(cfg => {
    const token = localStorage.getItem('token');
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
    return cfg;
});

// Handle 401 globally
api.interceptors.response.use(
    res => res,
    err => {
        if (err.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(err);
    }
);

// ── Auth ─────────────────────────────────────────────────────
export const authAPI = {
    register: d => api.post('/auth/register', d),
    login: d => api.post('/auth/login', d),
    logout: () => api.post('/auth/logout'),
    me: () => api.get('/auth/me'),
    updateProfile: d => api.put('/auth/me', d),
};

// ── Quiz / Exams ─────────────────────────────────────────────
export const quizAPI = {
    getCountries: () => api.get('/quiz/countries'),
    getExams: id => api.get(`/quiz/exams/${id}`),
    getExam: id => api.get(`/quiz/exam/${id}`),
    generateTest: id => api.get(`/quiz/generate-test/${id}`),
    getQuestions: (id, p) => api.get(`/quiz/questions/${id}`, { params: p }),
    submit: d => api.post('/quiz/submit', d),
    getPerformance: uid => api.get(`/quiz/performance/${uid}`),
    getReport: id => api.get(`/quiz/report/${id}`),
    explain: d => api.post('/quiz/explain', d),
};

// ── Institute ────────────────────────────────────────────────
export const instituteAPI = {
    generateQuestions: d => api.post('/institute/generate-questions', d),
    createExam: d => api.post('/institute/create-exam', d),
    myExams: () => api.get('/institute/my-exams'),
    listExams: p => api.get('/institute/list-exams', { params: p }),
    checkExamId: id => api.get(`/institute/exam/${id}/exists`),
    getAnalytics: id => api.get(`/institute/analytics/${id}`),
    updateExam: (id, d) => api.put(`/institute/exam/${id}`, d),
    deleteExam: id => api.delete(`/institute/exam/${id}`),
};

// ── Student ──────────────────────────────────────────────────
export const studentAPI = {
    searchExams: ref => api.get(`/student/exams/${ref}`),
    getExam: id => api.get(`/student/exam/${id}`),
    startAttempt: (id, d) => api.post(`/student/attempt/${id}`, d),
    submitAttempt: (id, d) => api.post(`/student/submit/${id}`, d),
    getReport: id => api.get(`/student/report/${id}`),
    getHistory: sid => api.get(`/student/history/${sid}`),
};

// ── Practice ─────────────────────────────────────────────────
export const practiceAPI = {
    generate: d => api.post('/practice/generate', d),
    save: d => api.post('/practice/save', d),
    history: p => api.get('/practice/history', { params: p }),
    tutor: d => api.post('/practice/tutor', d),
};

// ── AI Tutor ─────────────────────────────────────────────────
export const tutorAPI = {
    chat: d => api.post('/tutor/chat', d),
    explain: d => api.post('/tutor/explain', d),
    recommendations: d => api.post('/tutor/recommendations', d),
    risk: p => api.get('/tutor/risk', { params: p }),
    adaptive: d => api.post('/tutor/adaptive', d),
    classInsights: id => api.get(`/tutor/class-insights/${id}`),
    saveSession: d => api.post('/tutor/save-session', d),
    sessions: () => api.get('/tutor/sessions'),
};
export default api;