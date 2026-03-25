// FILE: frontend/src/pages/Practice/PracticeSession.jsx

import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Layout from '@/components/common/Layout';
import { practiceAPI } from '@/services/api';
import {
    ChevronLeft, ChevronRight, Send, BookOpen, Clock,
    CheckCircle, Target, Brain, Zap, RotateCcw, Flag,
    TrendingUp, Award, BarChart3
} from 'lucide-react';
import Spinner from '@/components/common/Spinner';
import toast from 'react-hot-toast';

function fmt(s) { const m = Math.floor(s / 60), sec = s % 60; return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`; }

// Question status for practice (simpler – no review pressure)
const QS = { UNANSWERED: 'unanswered', ANSWERED: 'answered', SKIPPED: 'skipped' };
const QS_STYLE = {
    unanswered: 'bg-white/8 text-white/30 border border-white/10',
    answered: 'bg-neon/20 text-neon border border-neon/40',
    skipped: 'bg-amber/15 text-amber border border-amber/30',
};

export default function PracticeSession() {
    const { state } = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const practice = state?.practiceData;
    const country = state?.country || '';
    const examType = state?.examType || '';
    const questions = practice?.questions || [];

    const [current, setCurrent] = useState(0);
    const [answers, setAnswers] = useState({});   // { idx: text|number }
    const [qStatus, setQStatus] = useState(
        () => Object.fromEntries(questions.map((_, i) => [i, QS.UNANSWERED]))
    );
    const [elapsed, setElapsed] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);
    const [results, setResults] = useState(null);
    const timerRef = useRef(null);

    // Redirect if no practice data
    useEffect(() => {
        if (!practice || !questions.length) navigate('/practice');
    }, []);

    // Elapsed timer (no time limit in practice)
    useEffect(() => {
        timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
        return () => clearInterval(timerRef.current);
    }, []);

    if (!practice || !questions.length) return null;

    const q = questions[current];
    const answered = Object.values(qStatus).filter(s => s === QS.ANSWERED).length;
    const skipped = Object.values(qStatus).filter(s => s === QS.SKIPPED).length;

    const setAnswer = (val) => {
        const isDeselect = answers[current] === val;
        setAnswers(prev => ({ ...prev, [current]: isDeselect ? undefined : val }));
        setQStatus(prev => ({ ...prev, [current]: isDeselect ? QS.UNANSWERED : QS.ANSWERED }));
    };

    const skip = () => {
        if (qStatus[current] !== QS.ANSWERED) setQStatus(prev => ({ ...prev, [current]: QS.SKIPPED }));
        if (current < questions.length - 1) setCurrent(c => c + 1);
    };

    const handleSubmit = async () => {
        clearInterval(timerRef.current);
        setSubmitting(true);
        try {
            const topicsCovered = [...new Set(questions.map(q => q.topic).filter(Boolean))];
            const correct = Object.entries(answers).filter(([i, a]) => a !== undefined).length;

            await practiceAPI.save({
                country, exam_type: examType,
                questions_attempted: answered + skipped,
                total_questions: questions.length,
                questions_correct: correct,
                time_taken: Math.round(elapsed / 60),
                topics_covered: topicsCovered,
                answers: Object.fromEntries(
                    Object.entries(answers).map(([i, a]) => [questions[i]?.question_text?.slice(0, 40) || i, a])
                ),
            });

            setResults({
                attempted: answered + skipped,
                answered,
                skipped,
                total: questions.length,
                time: elapsed,
                topics: topicsCovered,
                score_pct: questions.length ? Math.round(answered / questions.length * 100) : 0,
            });
            setDone(true);
        } catch { toast.error('Could not save session'); setSubmitting(false); }
    };

    // ── Done Screen ────────────────────────────────────────────
    if (done && results) {
        const grade = results.score_pct >= 80 ? 'A' : results.score_pct >= 60 ? 'B' : results.score_pct >= 40 ? 'C' : 'D';
        const gradeColor = { A: 'text-neon', B: 'text-emerald', C: 'text-amber', D: 'text-rose' }[grade];
        return (
            <Layout noFooter>
                <div className="page-center">
                    <div className="glass p-10 max-w-lg w-full text-center animate-slide-up">
                        {/* Grade circle */}
                        <div className={`w-28 h-28 rounded-full border-4 mx-auto mb-6 flex flex-col items-center justify-center ${grade === 'A' ? 'border-neon/50 bg-neon/10' : grade === 'B' ? 'border-emerald/50 bg-emerald/10' : grade === 'C' ? 'border-amber/50 bg-amber/10' : 'border-rose/50 bg-rose/10'
                            }`}>
                            <span className={`text-4xl font-display font-black ${gradeColor}`}>{grade}</span>
                            <span className="text-xs text-white/40">{results.score_pct}%</span>
                        </div>

                        <h1 className="text-2xl font-display font-bold mb-1">Practice Complete!</h1>
                        <p className="text-white/40 text-sm mb-6">Great work! Here's your session summary.</p>

                        {/* Stats grid */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            {[
                                { label: 'Questions', value: results.total, icon: BookOpen, c: 'text-neon' },
                                { label: 'Answered', value: results.answered, icon: CheckCircle, c: 'text-emerald' },
                                { label: 'Skipped', value: results.skipped, icon: Flag, c: 'text-amber' },
                                { label: 'Time Spent', value: fmt(results.time), icon: Clock, c: 'text-violet-300' },
                            ].map(s => (
                                <div key={s.label} className="p-4 bg-white/5 rounded-xl flex items-center gap-3">
                                    <s.icon size={18} className={s.c} />
                                    <div className="text-left">
                                        <p className="text-lg font-display font-bold text-white">{s.value}</p>
                                        <p className="text-xs text-white/40">{s.label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Topics covered */}
                        {results.topics.length > 0 && (
                            <div className="p-4 bg-white/5 rounded-xl mb-6 text-left">
                                <p className="text-xs text-white/40 mb-2 font-display font-semibold uppercase tracking-widest">Topics Covered</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {results.topics.map((t, i) => (
                                        <span key={i} className="px-2 py-1 text-xs rounded-lg" style={{ background: 'rgba(0,245,212,0.1)', color: '#00f5d4', border: '1px solid rgba(0,245,212,0.2)' }}>
                                            {t}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => navigate('/practice')} className="btn-primary justify-center">
                                <Zap size={14} />New Session
                            </button>
                            <button onClick={() => navigate('/performance')} className="btn-secondary justify-center">
                                <BarChart3 size={14} />Performance
                            </button>
                        </div>
                        <button onClick={() => navigate('/tutor')} className="btn-ghost w-full justify-center mt-3 text-sm">
                            <Brain size={14} />Ask AI Tutor about any questions
                        </button>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout noFooter>
            {/* Top bar */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-ink/95 backdrop-blur-xl border-b border-white/8">
                <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                        <p className="font-display font-semibold text-sm text-white truncate">
                            {practice.session_title || `Practice – ${country}`}
                        </p>
                        <p className="text-xs text-white/30">{answered}/{questions.length} answered · No time limit</p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 font-mono text-sm text-white/50 shrink-0">
                        <Clock size={13} />{fmt(elapsed)}
                    </div>
                    <button onClick={handleSubmit} disabled={submitting} className="btn-primary text-sm shrink-0 py-2">
                        {submitting ? <Spinner size="sm" /> : <><Send size={13} />Finish</>}
                    </button>
                </div>
                <div className="h-0.5 bg-white/5">
                    <div className="h-full bg-neon/60 transition-all duration-500" style={{ width: `${(answered / questions.length) * 100}%` }} />
                </div>
            </div>

            <div className="flex flex-1 pt-14 max-w-6xl mx-auto w-full px-3 md:px-5 gap-4 py-4">

                {/* Question */}
                <div className="flex-1 min-w-0">
                    <div className="glass p-6 md:p-8">
                        {/* Meta */}
                        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700, background: 'rgba(124,58,237,0.15)', color: '#b8aaff', border: '1px solid rgba(124,58,237,0.25)' }}>
                                    Q {current + 1} / {questions.length}
                                </span>
                                {q.topic && <span className="text-xs px-2 py-1 rounded-lg bg-white/8 text-white/50">{q.topic}</span>}
                                {q.difficulty && (
                                    <span className={`text-xs px-2 py-1 rounded-lg font-semibold ${q.difficulty === 'Hard' ? 'bg-rose/10 text-rose' : q.difficulty === 'Medium' ? 'bg-amber/10 text-amber' : 'bg-emerald/10 text-emerald'
                                        }`}>{q.difficulty}</span>
                                )}
                            </div>
                            <div className="text-xs text-white/30">{q.max_score || 5} marks</div>
                        </div>

                        {/* Learning objective */}
                        {q.learning_objective && (
                            <div className="mb-4 flex items-start gap-2 p-3 bg-neon/5 border border-neon/10 rounded-xl">
                                <Target size={13} className="text-neon shrink-0 mt-0.5" />
                                <p className="text-xs text-neon/70">{q.learning_objective}</p>
                            </div>
                        )}

                        {/* Question text */}
                        <h2 className="text-base md:text-lg font-body text-white leading-relaxed mb-6">{q.question_text}</h2>

                        {/* Hint */}
                        {q.hints?.length > 0 && (
                            <details className="mb-5 group">
                                <summary className="cursor-pointer text-xs text-amber/60 hover:text-amber flex items-center gap-1.5 select-none">
                                    <span className="text-base">💡</span> Show hint
                                </summary>
                                <div className="mt-2 p-3 bg-amber/5 border border-amber/15 rounded-xl">
                                    <p className="text-xs text-white/60 leading-relaxed">{q.hints[0]}</p>
                                </div>
                            </details>
                        )}

                        {/* Answer area */}
                        <textarea
                            className="input min-h-36 resize-y text-sm"
                            placeholder="Type your answer here… Take your time, there's no pressure."
                            value={answers[current] || ''}
                            onChange={e => {
                                const val = e.target.value;
                                setAnswers(prev => ({ ...prev, [current]: val }));
                                setQStatus(prev => ({ ...prev, [current]: val.trim() ? QS.ANSWERED : QS.UNANSWERED }));
                            }}
                        />
                        {answers[current] && (
                            <button onClick={() => { setAnswers(p => ({ ...p, [current]: '' })); setQStatus(p => ({ ...p, [current]: QS.UNANSWERED })); }}
                                className="mt-2 flex items-center gap-1.5 text-xs text-white/25 hover:text-white/50 transition-colors">
                                <RotateCcw size={11} />Clear answer
                            </button>
                        )}

                        {/* Nav */}
                        <div className="flex items-center justify-between mt-6 pt-5 border-t border-white/8">
                            <button onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}
                                className="btn-secondary text-sm disabled:opacity-30">
                                <ChevronLeft size={14} />Prev
                            </button>
                            <div className="flex gap-2">
                                <button onClick={skip} disabled={current === questions.length - 1}
                                    className="btn-ghost text-sm gap-1.5 disabled:opacity-30">
                                    <Flag size={13} />Skip
                                </button>
                                {current < questions.length - 1 ? (
                                    <button onClick={() => setCurrent(c => c + 1)} className="btn-primary text-sm">
                                        Next<ChevronRight size={14} />
                                    </button>
                                ) : (
                                    <button onClick={handleSubmit} disabled={submitting} className="btn-violet text-sm">
                                        {submitting ? <Spinner size="sm" /> : <><Send size={13} />Finish Practice</>}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Side panel */}
                <div className="hidden lg:flex flex-col w-52 shrink-0 gap-3 pt-1">
                    <div className="glass p-4">
                        <p className="font-display font-semibold text-xs text-white/40 uppercase tracking-widest mb-3">Questions</p>
                        <div className="grid grid-cols-5 gap-1.5">
                            {questions.map((_, i) => (
                                <button key={i} onClick={() => setCurrent(i)}
                                    className={`aspect-square rounded-lg text-xs font-display font-bold transition-all ${QS_STYLE[qStatus[i] || QS.UNANSWERED]} ${i === current ? 'ring-2 ring-white/30 scale-110' : ''}`}>
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="glass p-4">
                        <p className="font-display font-semibold text-xs text-white/40 uppercase tracking-widest mb-3">Legend</p>
                        <div className="space-y-2">
                            {[{ l: 'Answered', s: QS.ANSWERED }, { l: 'Skipped', s: QS.SKIPPED }, { l: 'Unanswered', s: QS.UNANSWERED }].map(x => (
                                <div key={x.s} className="flex items-center gap-2">
                                    <div className={`w-5 h-5 rounded text-xs flex items-center justify-center ${QS_STYLE[x.s]}`}>·</div>
                                    <span className="text-xs text-white/40">{x.l}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="glass p-4">
                        <p className="font-display font-semibold text-xs text-white/40 uppercase tracking-widest mb-3">Progress</p>
                        <div className="space-y-2">
                            {[
                                { l: 'Answered', v: answered, c: 'bg-neon' },
                                { l: 'Skipped', v: skipped, c: 'bg-amber' },
                                { l: 'Remaining', v: questions.length - answered - skipped, c: 'bg-white/20' },
                            ].map(s => (
                                <div key={s.l} className="flex justify-between text-xs font-body">
                                    <div className="flex items-center gap-1.5">
                                        <div className={`w-2 h-2 rounded-full ${s.c}`} />
                                        <span className="text-white/40">{s.l}</span>
                                    </div>
                                    <span className="font-display font-bold text-white">{s.v}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}