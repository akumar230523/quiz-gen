/**
 * api.js  ─  Axios HTTP client
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for every API call in the app.
 *
 * ─────────────────────────────────────────────────────────────────────────────
*/

import axios from 'axios';

// VITE_API_URL can be set in .env for production deployments.
// In development, Vite's proxy in vite.config.js forwards /auth, /quiz, etc.
// to localhost:5000, so we just use an empty string as the base.
const BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
    baseURL: BASE,
    timeout: 60_000,  // 60 seconds — AI generation can be slow
});

// ── Request interceptor ───────────────────────────────────────────────────

// Automatically attach the JWT Bearer token to every request
api.interceptors.request.use(cfg => {
    const token = localStorage.getItem('qg-token');
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
    return cfg;
});

api.interceptors.response.use(
    res => res,
    err => {
        const isAuthRoute = err.config?.url?.startsWith('/auth');
        if (err.response?.status === 401 && !isAuthRoute) {
            // Session expired — clear everything and send back to login
            localStorage.removeItem('qg-token');
            localStorage.removeItem('qg-user');
            window.location.href = '/login';
        }
        // Re-throw so calling code can display error toasts
        return Promise.reject(err);
    },
);

// ── Helper to extract a readable error message ────────────────────────────
// Usage:  toast.error(getErrMsg(err))
export function getErrMsg(err) {
    return (
        err?.response?.data?.error ||    // our backend: { success: false, error: "..." }
        err?.response?.data?.message ||  // legacy backend format
        err?.message ||
        'Something went wrong'
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// API modules — one section per backend blueprint
// ═════════════════════════════════════════════════════════════════════════════

// ── Auth (/auth) ──────────────────────────────────────────────────────────
export const authAPI = {
    register: data => api.post('/auth/register', data),
    login: data => api.post('/auth/login', data),
    logout: () => api.post('/auth/logout'),
    me: () => api.get('/auth/me'),
    updateProfile: data => api.put('/auth/me', data),
};

// ── Quiz / public exams (/quiz) ───────────────────────────────────────────
export const quizAPI = {
    getCountries: () => api.get('/quiz/countries'),
    getExams: countryId => api.get(`/quiz/exams/${countryId}`),
    getExam: examId => api.get(`/quiz/exam/${examId}`),
    getQuestions: (id, params) => api.get(`/quiz/questions/${id}`, { params }),
    submit: data => api.post('/quiz/submit', data),
    getPerformance: userId => api.get(`/quiz/performance/${userId}`),
    getReport: resultId => api.get(`/quiz/report/${resultId}`),
    explain: data => api.post('/quiz/explain', data),
};

// ── Institute (/institute) ────────────────────────────────────────────────
export const instituteAPI = {
    generateQuestions: data => api.post('/institute/generate-questions', data),
    createExam: data => api.post('/institute/create-exam', data),
    myExams: () => api.get('/institute/my-exams'),
    listExams: params => api.get('/institute/list-exams', { params }),
    checkExamId: id => api.get(`/institute/exam/${id}/exists`),
    getAnalytics: examId => api.get(`/institute/analytics/${examId}`),
    updateExam: (id, data) => api.put(`/institute/exam/${id}`, data),
    deleteExam: id => api.delete(`/institute/exam/${id}`),
};

// ── Student portal (/student) ─────────────────────────────────────────────
export const studentAPI = {
    searchExams: query => api.get(`/student/search/${query}`),  // fixed endpoint
    getExam: id => api.get(`/student/exam/${id}`),
    startAttempt: (id, data) => api.post(`/student/attempt/${id}`, data),
    submitAttempt: (id, data) => api.post(`/student/submit/${id}`, data),
    getReport: reportId => api.get(`/student/report/${reportId}`),
    getHistory: studentId => api.get(`/student/history/${studentId}`),
};

// ── Practice (/practice) ──────────────────────────────────────────────────
export const practiceAPI = {
    getExams: countryId => api.get(`/practice/exams/${countryId}`),
    generate: data => api.post('/practice/generate', data),  // errors propagate naturally
    save: data => api.post('/practice/save', data),
    history: params => api.get('/practice/history', { params }),
};

// ── AI Tutor (/tutor) ─────────────────────────────────────────────────────
export const tutorAPI = {
    chat: data => api.post('/tutor/chat', data),
    explain: data => api.post('/tutor/explain', data),
    recommendations: data => api.post('/tutor/recommendations', data),
    risk: params => api.get('/tutor/risk', { params }),
    adaptive: data => api.post('/tutor/adaptive', data),
    saveSession: data => api.post('/tutor/save-session', data),
    sessions: () => api.get('/tutor/sessions'),
};

// ── Offline Quiz (/offline) ───────────────────────────────────────────────
export const offlineAPI = {
    generate: data => api.post('/offline/generate', data),
    getQuiz: code => api.get(`/offline/quiz/${code}`),
    myQuizzes: () => api.get('/offline/my-quizzes'),
    scan: data => api.post('/offline/scan', data),
    saveResult: data => api.post('/offline/save-result', data),
    downloadUrl: (code, ak) => `${api.defaults.baseURL || ''}/offline/download/${code}${ak ? '?answer_key=true' : ''}`,
};

export default api;