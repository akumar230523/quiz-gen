// FILE: frontend/src/pages/Student/ExamAttempt.jsx

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studentAPI } from '@/services/api';
import {
    Clock, AlertTriangle, Send, ChevronLeft, ChevronRight,
    Flag, RotateCcw, User, Mail, CreditCard, Eye, EyeOff,
    CheckCircle, BookOpen, Zap
} from 'lucide-react';
import Spinner from '@/components/common/Spinner';
import toast from 'react-hot-toast';

const S = { NONE: 'none', VISITED: 'visited', ANSWERED: 'answered', REVIEW: 'review', ANS_REV: 'answered_review' };

const S_STYLE = {
    none: 'bg-white/8 text-white/25 border border-white/10',
    visited: 'bg-white/15 text-white/60 border border-white/20',
    answered: 'bg-emerald/20 text-emerald border border-emerald/40',
    review: 'bg-rose/20 text-rose border border-rose/40',
    answered_review: 'bg-blue-500/20 text-blue-400 border border-blue-400/40',
};

function fmt(s) { const m = Math.floor(s / 60), sec = s % 60; return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`; }

function StudentForm({ onStart, err, loading }) {
    const [f, sf] = useState({ student_id: '', student_name: '', student_email: '' });
    const set = k => e => sf(p => ({ ...p, [k]: e.target.value }));
    return (
        <div className="min-h-screen bg-ink flex items-center justify-center px-4">
            <div className="orb w-96 h-96 bg-neon/10 -top-24 -left-24 fixed" />
            <div className="orb w-72 h-72 bg-violet/15 bottom-0 right-0 fixed" />
            <div className="relative z-10 w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-neon/15 border border-neon/30 flex items-center justify-center mx-auto mb-4">
                        <BookOpen size={28} className="text-neon" />
                    </div>
                    <h1 className="text-2xl font-display font-bold mb-1">Exam Registration</h1>
                    <p className="text-white/40 text-sm">Enter your details to begin</p>
                </div>
                <div className="glass p-8 space-y-4">
                    <div><label className="label">Student ID *</label>
                        <div className="relative">
                            <CreditCard size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                            <input className="input pl-10" placeholder="Roll number / student ID" value={f.student_id} onChange={set('student_id')} />
                        </div>
                    </div>
                    <div><label className="label">Full Name *</label>
                        <div className="relative">
                            <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                            <input className="input pl-10" placeholder="Your full name" value={f.student_name} onChange={set('student_name')} />
                        </div>
                    </div>
                    <div><label className="label">Email <span className="font-normal normal-case text-white/20">(optional)</span></label>
                        <div className="relative">
                            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                            <input className="input pl-10" type="email" placeholder="you@example.com" value={f.student_email} onChange={set('student_email')} />
                        </div>
                    </div>
                    {err && <div className="p-3 bg-rose/10 border border-rose/20 rounded-xl text-sm text-rose">{err}</div>}
                    <button onClick={() => onStart(f)} disabled={loading || !f.student_id.trim() || !f.student_name.trim()} className="btn-primary w-full justify-center py-3.5">
                        {loading ? <><Spinner size="sm" /> Starting…</> : <><Zap size={15} /> Begin Exam</>}
                    </button>
                    <p className="text-xs text-white/25 text-center">Each exam can only be attempted once.</p>
                </div>
            </div>
        </div>
    );
}

function SubmitModal({ questions, statuses, onConfirm, onCancel, submitting }) {
    const answered = Object.values(statuses).filter(s => s === S.ANSWERED || s === S.ANS_REV).length;
    const review = Object.values(statuses).filter(s => s === S.REVIEW || s === S.ANS_REV).length;
    const notSeen = Object.values(statuses).filter(s => s === S.NONE).length;
    return (
        <div className="fixed inset-0 z-50 bg-ink/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass p-8 max-w-sm w-full animate-slide-up">
                <AlertTriangle size={36} className="text-amber mx-auto mb-4" />
                <h2 className="text-xl font-display font-bold text-center mb-2">Submit Exam?</h2>
                <p className="text-white/50 text-sm text-center mb-5">This action cannot be undone.</p>
                <div className="grid grid-cols-2 gap-2.5 mb-6">
                    {[
                        { label: 'Answered', count: answered, c: 'bg-emerald' },
                        { label: 'Not Answered', count: questions.length - answered, c: 'bg-white/30' },
                        { label: 'For Review', count: review, c: 'bg-rose' },
                        { label: 'Not Visited', count: notSeen, c: 'bg-white/15' },
                    ].map(s => (
                        <div key={s.label} className="flex items-center gap-2 p-3 bg-white/5 rounded-xl">
                            <div className={`w-3 h-3 rounded-full ${s.c} shrink-0`} />
                            <div><div className="text-base font-display font-bold">{s.count}</div><div className="text-xs text-white/40">{s.label}</div></div>
                        </div>
                    ))}
                </div>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="btn-secondary flex-1 justify-center">Cancel</button>
                    <button onClick={onConfirm} disabled={submitting} className="btn-primary flex-1 justify-center">
                        {submitting ? <Spinner size="sm" /> : 'Submit'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function ExamAttempt() {
    const { examId } = useParams();
    const navigate = useNavigate();
    const [phase, setPhase] = useState('info');
    const [infoErr, setInfoErr] = useState('');
    const [exam, setExam] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [attemptId, setAttemptId] = useState(null);
    const [student, setStudent] = useState(null);
    const [answers, setAnswers] = useState({});
    const [statuses, setStatuses] = useState({});
    const [current, setCurrent] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const timerRef = useRef(null);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [panelOpen, setPanelOpen] = useState(true);

    const startExam = async (info) => {
        if (!info.student_id.trim() || !info.student_name.trim()) { setInfoErr('Student ID and Full Name are required.'); return; }
        setInfoErr(''); setPhase('loading');
        try {
            const res = await studentAPI.startAttempt(examId, info);
            if (!res.data.success) throw new Error(res.data.message || 'Failed');
            const e = res.data.exam; const qs = e.questions || [];
            setExam(e); setQuestions(qs); setAttemptId(res.data.attempt_id); setStudent(info);
            setTimeLeft(e.duration * 60);
            const ans = {}, stat = {};
            qs.forEach(q => { ans[q.id] = null; stat[q.id] = S.NONE; });
            setAnswers(ans); setStatuses(stat); setPhase('exam');
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to start';
            setInfoErr(msg.toLowerCase().includes('already') ? 'You have already attempted this exam.' : msg);
            setPhase('info');
        }
    };

    useEffect(() => {
        if (phase !== 'exam' || timeLeft <= 0) return;
        timerRef.current = setInterval(() => {
            setTimeLeft(t => { if (t <= 1) { clearInterval(timerRef.current); handleSubmit(true); return 0; } return t - 1; });
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, [phase]);

    useEffect(() => {
        if (questions.length && questions[current]) {
            const qId = questions[current].id;
            setStatuses(prev => prev[qId] === S.NONE ? { ...prev, [qId]: S.VISITED } : prev);
        }
    }, [current, questions]);

    const selectAnswer = (qId, idx) => {
        const isDeselect = answers[qId] === idx;
        setAnswers(prev => ({ ...prev, [qId]: isDeselect ? null : idx }));
        setStatuses(prev => {
            const cur = prev[qId];
            const isReview = cur === S.REVIEW || cur === S.ANS_REV;
            if (isDeselect) return { ...prev, [qId]: S.VISITED };
            return { ...prev, [qId]: isReview ? S.ANS_REV : S.ANSWERED };
        });
    };

    const toggleReview = (qId) => {
        setStatuses(prev => {
            const cur = prev[qId];
            if (cur === S.ANSWERED) return { ...prev, [qId]: S.ANS_REV };
            if (cur === S.ANS_REV) return { ...prev, [qId]: S.ANSWERED };
            if (cur === S.REVIEW) return { ...prev, [qId]: S.VISITED };
            return { ...prev, [qId]: S.REVIEW };
        });
    };

    const goTo = idx => { if (idx >= 0 && idx < questions.length) setCurrent(idx); };

    const handleSubmit = useCallback(async (auto = false) => {
        if (submitting) return;
        clearInterval(timerRef.current);
        setSubmitting(true); setShowModal(false);
        try {
            const timeTaken = Math.round(((exam?.duration || 60) * 60 - timeLeft) / 60);
            const res = await studentAPI.submitAttempt(attemptId, { answers, time_taken: timeTaken });
            if (res.data.success) {
                toast.success('Exam submitted! Generating report…');
                navigate(`/exam/report/${res.data.report_id}`, { state: { fromAttempt: true } });
            } else throw new Error(res.data.error || 'Failed');
        } catch (e) {
            toast.error(e.response?.data?.error || e.message || 'Submission failed');
            setSubmitting(false);
        }
    }, [submitting, attemptId, answers, exam, timeLeft, navigate]);

    if (phase === 'info') return <StudentForm onStart={startExam} err={infoErr} loading={false} />;
    if (phase === 'loading') return <div className="min-h-screen bg-ink flex items-center justify-center"><Spinner size="lg" /></div>;
    if (!exam || !questions.length) return <div className="min-h-screen bg-ink flex items-center justify-center text-white/40">No questions</div>;

    const q = questions[current];
    const urgent = timeLeft < 300;
    const answeredCount = Object.values(statuses).filter(s => s === S.ANSWERED || s === S.ANS_REV).length;

    return (
        <div className="min-h-screen bg-ink flex flex-col">
            {/* Top Bar */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-ink/95 backdrop-blur-xl border-b border-white/8">
                <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                        <p className="font-display font-bold text-white text-sm truncate">{exam.name}</p>
                        <p className="text-xs text-white/30">{student?.student_name} · {answeredCount}/{questions.length} answered</p>
                    </div>
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-sm font-bold border transition-all shrink-0 ${urgent ? 'bg-rose/20 text-rose border-rose/30 animate-pulse' : 'bg-neon/10 text-neon border-neon/20'
                        }`}>
                        <Clock size={14} />{fmt(timeLeft)}
                    </div>
                    <button onClick={() => setPanelOpen(o => !o)} className="btn-ghost text-xs gap-1 hidden md:flex shrink-0">
                        {panelOpen ? <EyeOff size={13} /> : <Eye size={13} />}{panelOpen ? 'Hide' : 'Panel'}
                    </button>
                    <button onClick={() => setShowModal(true)} className="btn-primary text-sm shrink-0 py-2">
                        <Send size={13} />Submit
                    </button>
                </div>
                <div className="h-0.5 bg-white/5">
                    <div className="h-full bg-neon transition-all duration-300" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
                </div>
            </div>

            {/* Body */}
            <div className="flex flex-1 pt-14">
                <div className="flex-1 min-w-0 p-3 md:p-5 max-w-3xl mx-auto w-full">
                    <div className="glass p-6 md:p-8 mt-1">
                        {/* Q header */}
                        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="badge-neon font-mono text-xs">Q {current + 1} / {questions.length}</span>
                                {q.topic && <span className="badge-grey text-xs">{q.topic}</span>}
                                {q.difficulty && <span className={`badge text-xs ${q.difficulty === 'hard' ? 'badge-rose' : q.difficulty === 'medium' ? 'badge-amber' : 'badge-emerald'}`}>{q.difficulty}</span>}
                            </div>
                            <button
                                onClick={() => toggleReview(q.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-display font-semibold border transition-all ${statuses[q.id] === S.REVIEW || statuses[q.id] === S.ANS_REV
                                        ? 'bg-rose/15 border-rose/40 text-rose'
                                        : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white/70'
                                    }`}
                            >
                                <Flag size={11} />{statuses[q.id] === S.REVIEW || statuses[q.id] === S.ANS_REV ? 'Marked for Review' : 'Mark for Review'}
                            </button>
                        </div>

                        {/* Question text */}
                        <div className="mb-7">
                            <p className="text-sm text-white/40 mb-2 font-body">{q.marks || 1} mark{q.marks > 1 ? 's' : ''}</p>
                            <h2 className="text-base md:text-lg font-body text-white leading-relaxed">{q.text}</h2>
                        </div>

                        {/* MCQ */}
                        {q.type === 'mcq' && q.options?.length > 0 && (
                            <div className="space-y-2.5">
                                {q.options.map((opt, idx) => {
                                    const sel = answers[q.id] === idx;
                                    return (
                                        <button key={idx} onClick={() => selectAnswer(q.id, idx)}
                                            className={`w-full text-left flex items-start gap-3 px-4 py-3.5 rounded-xl border transition-all duration-150 group ${sel ? 'bg-neon/10 border-neon/50' : 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20'
                                                }`}
                                        >
                                            <span className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-display font-bold shrink-0 ${sel ? 'bg-neon text-ink' : 'bg-white/10 text-white/50 group-hover:bg-white/15'
                                                }`}>{String.fromCharCode(65 + idx)}</span>
                                            <span className={`flex-1 text-sm leading-relaxed ${sel ? 'text-white' : 'text-white/80'}`}>{opt}</span>
                                            {sel && <CheckCircle size={15} className="text-neon shrink-0 mt-0.5" />}
                                        </button>
                                    );
                                })}
                                {answers[q.id] !== null && (
                                    <button onClick={() => selectAnswer(q.id, answers[q.id])}
                                        className="flex items-center gap-1.5 text-xs text-white/25 hover:text-white/50 transition-colors mt-1">
                                        <RotateCcw size={11} />Clear selection
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Descriptive */}
                        {q.type === 'descriptive' && (
                            <textarea
                                className="input min-h-48 resize-y text-sm"
                                placeholder="Write your detailed answer here…"
                                value={answers[q.id] || ''}
                                onChange={e => {
                                    setAnswers(p => ({ ...p, [q.id]: e.target.value }));
                                    setStatuses(p => ({ ...p, [q.id]: e.target.value.trim() ? (p[q.id] === S.REVIEW ? S.ANS_REV : S.ANSWERED) : S.VISITED }));
                                }}
                            />
                        )}

                        {/* Nav */}
                        <div className="flex items-center justify-between mt-7 pt-5 border-t border-white/8">
                            <button onClick={() => goTo(current - 1)} disabled={current === 0} className="btn-secondary text-sm disabled:opacity-30">
                                <ChevronLeft size={14} />Prev
                            </button>
                            <div className="flex gap-2">
                                <button onClick={() => { toggleReview(q.id); goTo(current + 1); }} disabled={current === questions.length - 1}
                                    className="btn-ghost text-xs disabled:opacity-30 gap-1.5">
                                    <Flag size={12} />Flag & Next
                                </button>
                                {current < questions.length - 1 ? (
                                    <button onClick={() => goTo(current + 1)} className="btn-primary text-sm">
                                        Next<ChevronRight size={14} />
                                    </button>
                                ) : (
                                    <button onClick={() => setShowModal(true)} className="btn-violet text-sm">
                                        <Send size={13} />Submit
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigator Panel */}
                {panelOpen && (
                    <div className="hidden md:flex flex-col w-56 shrink-0 p-3 gap-3 pt-4">
                        <div className="glass p-4">
                            <p className="font-display font-semibold text-xs text-white/50 uppercase tracking-widest mb-3">Navigate</p>
                            <div className="grid grid-cols-5 gap-1.5">
                                {questions.map((qq, i) => (
                                    <button key={qq.id} onClick={() => goTo(i)}
                                        className={`aspect-square rounded-lg text-xs font-display font-bold transition-all ${S_STYLE[statuses[qq.id] || S.NONE]} ${i === current ? 'ring-2 ring-offset-1 ring-offset-ink ring-white/40 scale-110' : ''
                                            }`}
                                    >{i + 1}</button>
                                ))}
                            </div>
                        </div>
                        <div className="glass p-4">
                            <p className="font-display font-semibold text-xs text-white/50 uppercase tracking-widest mb-3">Legend</p>
                            <div className="space-y-2">
                                {[
                                    { label: 'Answered', st: S.ANSWERED },
                                    { label: 'Marked Review', st: S.REVIEW },
                                    { label: 'Ans + Review', st: S.ANS_REV },
                                    { label: 'Visited', st: S.VISITED },
                                    { label: 'Not Visited', st: S.NONE },
                                ].map(l => (
                                    <div key={l.st} className="flex items-center gap-2">
                                        <div className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold ${S_STYLE[l.st]}`}>·</div>
                                        <span className="text-xs text-white/45 font-body">{l.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="glass p-4">
                            <p className="font-display font-semibold text-xs text-white/50 uppercase tracking-widest mb-3">Summary</p>
                            <div className="space-y-1.5">
                                {[
                                    { l: 'Total', v: questions.length, c: 'bg-white/25' },
                                    { l: 'Answered', v: Object.values(statuses).filter(s => s === S.ANSWERED || s === S.ANS_REV).length, c: 'bg-emerald' },
                                    { l: 'Flagged', v: Object.values(statuses).filter(s => s === S.REVIEW || s === S.ANS_REV).length, c: 'bg-rose' },
                                    { l: 'Visited', v: Object.values(statuses).filter(s => s === S.VISITED).length, c: 'bg-white/50' },
                                    { l: 'Unseen', v: Object.values(statuses).filter(s => s === S.NONE).length, c: 'bg-white/10' },
                                ].map(s => (
                                    <div key={s.l} className="flex justify-between items-center text-xs font-body">
                                        <div className="flex items-center gap-1.5"><div className={`w-2 h-2 rounded-full ${s.c}`} /><span className="text-white/45">{s.l}</span></div>
                                        <span className="font-display font-bold text-white">{s.v}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {showModal && <SubmitModal questions={questions} statuses={statuses} onConfirm={() => handleSubmit(false)} onCancel={() => setShowModal(false)} submitting={submitting} />}
        </div>
    );
}