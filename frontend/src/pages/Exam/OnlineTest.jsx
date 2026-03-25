// FILE: frontend/src/pages/Exam/OnlineTest.jsx

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { quizAPI } from '@/services/api';
import {
    Clock, Send, ChevronLeft, ChevronRight, Flag, RotateCcw,
    AlertTriangle, Eye, EyeOff, CheckCircle, Zap
} from 'lucide-react';
import Spinner from '@/components/common/Spinner';
import toast from 'react-hot-toast';

const S = { NONE: 'none', VISITED: 'visited', ANSWERED: 'answered', REVIEW: 'review', ANS_REV: 'answered_review' };
const S_STYLE = {
    none: 'bg-white/8 text-white/25 border border-white/10',
    visited: 'bg-white/15 text-white/60 border border-white/20',
    answered: 'bg-neon/20 text-neon border border-neon/40',
    review: 'bg-rose/20 text-rose border border-rose/40',
    answered_review: 'bg-blue-500/20 text-blue-400 border border-blue-400/40',
};
function fmt(s) { return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }

function SubmitModal({ total, answered, flagged, onConfirm, onCancel, submitting }) {
    return (
        <div className="fixed inset-0 z-50 bg-ink/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass p-8 max-w-sm w-full animate-slide-up">
                <AlertTriangle size={36} className="text-amber mx-auto mb-4" />
                <h2 className="text-xl font-display font-bold text-center mb-2">Submit Exam?</h2>
                <p className="text-white/50 text-sm text-center mb-5">This cannot be undone.</p>
                <div className="grid grid-cols-2 gap-2.5 mb-6">
                    {[
                        { l: 'Answered', v: answered, c: 'bg-neon' },
                        { l: 'Skipped', v: total - answered, c: 'bg-white/25' },
                        { l: 'Flagged', v: flagged, c: 'bg-rose' },
                        { l: 'Total', v: total, c: 'bg-white/10' },
                    ].map(s => (
                        <div key={s.l} className="flex items-center gap-2 p-3 bg-white/5 rounded-xl">
                            <div className={`w-3 h-3 rounded-full ${s.c} shrink-0`} />
                            <div><p className="text-lg font-display font-bold">{s.v}</p><p className="text-xs text-white/40">{s.l}</p></div>
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

export default function OnlineTest() {
    const { examId } = useParams();
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const mode = params.get('mode') || 'mcq';

    const [exam, setExam] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [statuses, setStatuses] = useState({});
    const [current, setCurrent] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [panelOpen, setPanelOpen] = useState(true);
    const [questionSource, setQuestionSource] = useState(null);
    const [aiError, setAiError] = useState(null);
    const timerRef = useRef(null);

    useEffect(() => {
        quizAPI.getQuestions(examId, { count: 20, type: mode, difficulty: 'medium' })
            .then(r => {
                setExam(r.data.exam);
                setQuestions(r.data.questions);
                setQuestionSource(r.data.question_source || null);
                setAiError(r.data.ai_error || null);
                if (r.data.ai_error) {
                    toast.error('AI question generation failed — showing curated questions. Check GEMINI_API_KEY.', { duration: 6000 });
                }
                setTimeLeft((r.data.exam?.duration || 60) * 60);
                const a = {}, st = {};
                r.data.questions.forEach(q => { a[q.id] = null; st[q.id] = S.NONE; });
                setAnswers(a); setStatuses(st);
            })
            .catch(() => toast.error('Failed to load exam'))
            .finally(() => setLoading(false));
    }, [examId, mode]);

    // Timer
    useEffect(() => {
        if (!questions.length || timeLeft <= 0) return;
        timerRef.current = setInterval(() => {
            setTimeLeft(t => { if (t <= 1) { clearInterval(timerRef.current); handleSubmit(true); return 0; } return t - 1; });
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, [questions.length]);

    // Mark visited
    useEffect(() => {
        if (questions[current]) {
            const qId = questions[current].id;
            setStatuses(prev => prev[qId] === S.NONE ? { ...prev, [qId]: S.VISITED } : prev);
        }
    }, [current, questions]);

    const selectAnswer = (qId, idx) => {
        const isDeselect = answers[qId] === idx;
        setAnswers(p => ({ ...p, [qId]: isDeselect ? null : idx }));
        setStatuses(p => {
            const cur = p[qId]; const isReview = cur === S.REVIEW || cur === S.ANS_REV;
            if (isDeselect) return { ...p, [qId]: S.VISITED };
            return { ...p, [qId]: isReview ? S.ANS_REV : S.ANSWERED };
        });
    };

    const toggleReview = (qId) => {
        setStatuses(p => {
            const cur = p[qId];
            if (cur === S.ANSWERED) return { ...p, [qId]: S.ANS_REV };
            if (cur === S.ANS_REV) return { ...p, [qId]: S.ANSWERED };
            if (cur === S.REVIEW) return { ...p, [qId]: S.VISITED };
            return { ...p, [qId]: S.REVIEW };
        });
    };

    const goTo = idx => { if (idx >= 0 && idx < questions.length) setCurrent(idx); };

    const handleSubmit = useCallback(async (auto = false) => {
        if (submitting) return;
        clearInterval(timerRef.current);
        setSubmitting(true); setShowModal(false);
        try {
            const correct = questions.filter(q => answers[q.id] === q.correctAnswer).length;
            const score = questions.length ? (correct / questions.length) * 100 : 0;
            const breakdown = questions.map(q => ({
                question_id: q.id, question_text: q.text,
                user_answer: answers[q.id], correct_answer: q.correctAnswer,
                is_correct: answers[q.id] === q.correctAnswer, topic: q.topic,
            }));
            const res = await quizAPI.submit({
                exam_id: examId, exam_name: exam?.name || 'Exam',
                score: +score.toFixed(2), total_questions: questions.length,
                correct_answers: correct, question_breakdown: breakdown,
                exam_type: 'online', difficulty: 'medium',
                time_taken: Math.round(((exam?.duration || 60) * 60 - timeLeft) / 60),
            });
            toast.success('Exam submitted!');
            navigate(`/report/${res.data.result_id}`);
        } catch { toast.error('Submission failed'); setSubmitting(false); }
    }, [answers, questions, exam, examId, timeLeft, submitting, navigate]);

    if (loading) return (
        <div className="min-h-screen bg-ink flex items-center justify-center"><Spinner size="lg" /></div>
    );

    if (!questions.length) return (
        <div className="min-h-screen bg-ink flex items-center justify-center">
            <p className="text-white/40">No questions available.</p>
        </div>
    );

    const q = questions[current];
    const urgent = timeLeft < 300;
    const answered = Object.values(statuses).filter(s => s === S.ANSWERED || s === S.ANS_REV).length;
    const flagged = Object.values(statuses).filter(s => s === S.REVIEW || s === S.ANS_REV).length;

    return (
        <div className="min-h-screen bg-ink flex flex-col">
            {/* Top bar */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-ink/95 backdrop-blur-xl border-b border-white/8">
                <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                        <p className="font-display font-bold text-white text-sm truncate">{exam?.name}</p>
                        <p className="text-xs text-white/30">{answered}/{questions.length} answered</p>
                    </div>
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-sm font-bold border shrink-0 transition-all ${urgent ? 'bg-rose/20 text-rose border-rose/30 animate-pulse' : 'bg-neon/10 text-neon border-neon/20'
                        }`}><Clock size={14} />{fmt(timeLeft)}</div>
                    <button onClick={() => setPanelOpen(o => !o)} className="btn-ghost text-xs hidden md:flex shrink-0">
                        {panelOpen ? <EyeOff size={13} /> : <Eye size={13} />}{panelOpen ? 'Hide' : 'Panel'}
                    </button>
                    <button onClick={() => setShowModal(true)} className="btn-primary text-sm shrink-0 py-2">
                        <Send size={13} />Submit
                    </button>
                </div>
                <div className="h-0.5 bg-white/5">
                    <div className="h-full bg-neon transition-all duration-300" style={{ width: `${(answered / questions.length) * 100}%` }} />
                </div>
                {(aiError || questionSource === 'bank') && (
                    <div className="border-t border-amber/20 bg-amber/10 px-4 py-2 text-xs text-amber/90 text-center">
                        {questionSource === 'bank' && !aiError && (
                            <span>Questions loaded from the curated bank for this exam type.</span>
                        )}
                        {aiError && (
                            <span>
                                Gemini AI unavailable ({String(aiError).slice(0, 120)}
                                {String(aiError).length > 120 ? '…' : ''}). Using curated questions — set a valid{' '}
                                <code className="text-amber">GEMINI_API_KEY</code> in the backend <code className="text-amber">.env</code>.
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Body */}
            <div className="flex flex-1 pt-14">
                <div className="flex-1 min-w-0 p-3 md:p-5 max-w-3xl mx-auto w-full">
                    <div className="glass p-6 md:p-8 mt-1">
                        {/* Q header */}
                        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700, background: 'rgba(0,245,212,0.15)', color: '#00f5d4', border: '1px solid rgba(0,245,212,0.2)' }}>
                                    Q {current + 1} / {questions.length}
                                </span>
                                {q.topic && <span className="text-xs px-2 py-1 rounded-lg bg-white/8 text-white/50">{q.topic}</span>}
                                {q.difficulty && (
                                    <span className={`text-xs px-2 py-1 rounded-lg font-semibold ${q.difficulty === 'hard' ? 'bg-rose/10 text-rose' : q.difficulty === 'medium' ? 'bg-amber/10 text-amber' : 'bg-emerald/10 text-emerald'}`}>
                                        {q.difficulty}
                                    </span>
                                )}
                            </div>
                            <button onClick={() => toggleReview(q.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-display font-semibold border transition-all ${statuses[q.id] === S.REVIEW || statuses[q.id] === S.ANS_REV
                                        ? 'bg-rose/15 border-rose/40 text-rose'
                                        : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white/70'
                                    }`}>
                                <Flag size={11} />{statuses[q.id] === S.REVIEW || statuses[q.id] === S.ANS_REV ? 'Marked' : 'Mark for Review'}
                            </button>
                        </div>

                        <h2 className="text-base md:text-lg font-body text-white leading-relaxed mb-7">{q.text}</h2>

                        {/* MCQ options */}
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
                            <textarea className="input min-h-48 resize-y text-sm"
                                placeholder="Write your detailed answer here…"
                                value={answers[q.id] || ''}
                                onChange={e => {
                                    const v = e.target.value;
                                    setAnswers(p => ({ ...p, [q.id]: v }));
                                    setStatuses(p => ({ ...p, [q.id]: v.trim() ? (p[q.id] === S.REVIEW ? S.ANS_REV : S.ANSWERED) : S.VISITED }));
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

                {/* Side panel */}
                {panelOpen && (
                    <div className="hidden md:flex flex-col w-52 shrink-0 p-3 gap-3 pt-4">
                        <div className="glass p-4">
                            <p className="font-display font-semibold text-xs text-white/40 uppercase tracking-widest mb-3">Navigate</p>
                            <div className="grid grid-cols-5 gap-1.5">
                                {questions.map((qq, i) => (
                                    <button key={qq.id} onClick={() => goTo(i)}
                                        className={`aspect-square rounded-lg text-xs font-display font-bold transition-all ${S_STYLE[statuses[qq.id] || S.NONE]} ${i === current ? 'ring-2 ring-offset-1 ring-offset-ink ring-white/40 scale-110' : ''}`}>
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="glass p-4">
                            <p className="font-display font-semibold text-xs text-white/40 uppercase tracking-widest mb-3">Legend</p>
                            <div className="space-y-2">
                                {[
                                    { l: 'Answered', s: S.ANSWERED },
                                    { l: 'Flagged', s: S.REVIEW },
                                    { l: 'Ans+Flag', s: S.ANS_REV },
                                    { l: 'Visited', s: S.VISITED },
                                    { l: 'Not Seen', s: S.NONE },
                                ].map(x => (
                                    <div key={x.s} className="flex items-center gap-2">
                                        <div className={`w-5 h-5 rounded text-xs flex items-center justify-center ${S_STYLE[x.s]}`}>·</div>
                                        <span className="text-xs text-white/40">{x.l}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="glass p-4">
                            <p className="font-display font-semibold text-xs text-white/40 uppercase tracking-widest mb-3">Summary</p>
                            <div className="space-y-1.5">
                                {[
                                    { l: 'Total', v: questions.length, c: 'bg-white/25' },
                                    { l: 'Done', v: answered, c: 'bg-neon' },
                                    { l: 'Flagged', v: flagged, c: 'bg-rose' },
                                    { l: 'Unseen', v: Object.values(statuses).filter(s => s === S.NONE).length, c: 'bg-white/10' },
                                ].map(s => (
                                    <div key={s.l} className="flex justify-between items-center text-xs font-body">
                                        <div className="flex items-center gap-1.5"><div className={`w-2 h-2 rounded-full ${s.c}`} /><span className="text-white/40">{s.l}</span></div>
                                        <span className="font-display font-bold">{s.v}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {showModal && (
                <SubmitModal total={questions.length} answered={answered} flagged={flagged}
                    onConfirm={() => handleSubmit(false)} onCancel={() => setShowModal(false)} submitting={submitting} />
            )}
        </div>
    );
}