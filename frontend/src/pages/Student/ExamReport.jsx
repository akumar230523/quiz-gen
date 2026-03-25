// FILE: frontend/src/pages/Student/ExamReport.jsx

import { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { studentAPI } from '@/services/api';
import {
    Trophy, CheckCircle, XCircle, Clock, BookOpen,
    TrendingUp, Lightbulb, ArrowRight, Target, Zap,
    Brain, Award
} from 'lucide-react';
import Spinner from '@/components/common/Spinner';

function GradeBadge({ grade, pct }) {
    const MAP = {
        'A+': ['from-neon to-emerald', '#00f5d4'],
        A: ['from-neon to-emerald', '#00f5d4'],
        'B+': ['from-violet-300 to-violet', '#b8aaff'],
        B: ['from-violet-300 to-violet', '#b8aaff'],
        C: ['from-amber to-orange-400', '#f59e0b'],
        F: ['from-rose to-red-500', '#f43f5e'],
    };
    const [cls] = MAP[grade] || ['from-white/20 to-white/10', '#fff'];
    return (
        <div className={`w-32 h-32 rounded-full bg-gradient-to-br ${cls} flex flex-col items-center justify-center mx-auto shadow-xl`}>
            <span className="text-4xl font-display font-black text-ink">{grade}</span>
            <span className="text-sm font-body text-ink/70">{pct?.toFixed(1)}%</span>
        </div>
    );
}

function Stat({ icon: I, value, label, color }) {
    return (
        <div className="glass p-5 text-center">
            <I size={20} className={`${color} mx-auto mb-2`} />
            <p className="text-2xl font-display font-bold text-white">{value}</p>
            <p className="text-xs text-white/40">{label}</p>
        </div>
    );
}

export default function ExamReport() {
    const { reportId } = useParams();
    const { state } = useLocation();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [tab, setTab] = useState('summary');

    useEffect(() => {
        studentAPI.getReport(reportId)
            .then(r => setReport(r.data))
            .catch(() => setError('Report not found or failed to load.'))
            .finally(() => setLoading(false));
    }, [reportId]);

    if (loading) return (
        <div className="min-h-screen bg-ink flex items-center justify-center">
            <div className="text-center"><Spinner size="lg" /><p className="text-white/40 text-sm mt-4">Generating your report…</p></div>
        </div>
    );

    if (error || !report) return (
        <div className="min-h-screen bg-ink flex items-center justify-center">
            <div className="glass p-8 max-w-sm text-center">
                <XCircle size={36} className="text-rose mx-auto mb-3" />
                <p className="text-rose mb-5">{error || 'Report not found'}</p>
                <Link to="/" className="btn-primary justify-center">Go Home</Link>
            </div>
        </div>
    );

    const perf = report.performance || {};
    const pct = perf.marks_percentage || 0;
    const grade = perf.grade || (pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : 'F');
    const passed = perf.passed ?? pct >= 40;
    const answers = report.answers_analysis || [];
    const correct = answers.filter(a => a.is_correct === true).length;

    const TABS = [
        { id: 'summary', label: 'Summary', icon: Award },
        { id: 'answers', label: 'Answer Review', icon: BookOpen },
        { id: 'insights', label: 'AI Insights', icon: Brain },
    ];

    return (
        <div className="min-h-screen bg-ink">
            {/* Orbs */}
            <div className="orb w-96 h-96 bg-neon/8 -top-24 -left-24 fixed pointer-events-none" />
            <div className="orb w-80 h-80 bg-violet/10 bottom-0 right-0 fixed pointer-events-none" />

            <div className="relative z-10 max-w-2xl mx-auto px-4 py-10">

                {/* Hero card */}
                <div className="glass p-8 text-center mb-5 relative overflow-hidden">
                    <div className="absolute inset-0 pointer-events-none"
                        style={{ background: passed ? 'radial-gradient(ellipse at 50% 0%, rgba(0,245,212,0.07) 0%, transparent 70%)' : 'radial-gradient(ellipse at 50% 0%, rgba(244,63,94,0.07) 0%, transparent 70%)' }} />
                    <p className="text-white/40 text-xs uppercase tracking-widest mb-1">{report.institute_name}</p>
                    <p className="text-white font-display font-bold text-lg mb-6">{report.exam_name}</p>
                    <GradeBadge grade={grade} pct={pct} />
                    <div className="mt-5">
                        <span className={`inline-flex items-center gap-2 px-5 py-2 rounded-full font-display font-bold text-sm ${passed ? 'bg-neon/15 text-neon border border-neon/30' : 'bg-rose/15 text-rose border border-rose/30'}`}>
                            {passed ? <CheckCircle size={14} /> : <XCircle size={14} />}
                            {passed ? 'PASSED' : 'FAILED'}
                        </span>
                    </div>
                    <div className="flex justify-center gap-8 mt-7">
                        {[
                            { v: correct, label: 'Correct', icon: CheckCircle, c: 'text-neon' },
                            { v: answers.length - correct, label: 'Wrong', icon: XCircle, c: 'text-rose' },
                            { v: answers.length, label: 'Total', icon: BookOpen, c: 'text-white/50' },
                        ].map(s => (
                            <div key={s.label} className="text-center">
                                <s.icon size={16} className={`${s.c} mx-auto mb-1`} />
                                <p className="text-xl font-display font-bold text-white">{s.v}</p>
                                <p className="text-xs text-white/40">{s.label}</p>
                            </div>
                        ))}
                    </div>
                    {report.time_analysis?.time_taken_minutes > 0 && (
                        <p className="text-xs text-white/30 mt-4 flex items-center justify-center gap-1">
                            <Clock size={11} /> {report.time_analysis.time_taken_minutes} min · {report.student_id}
                        </p>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-5 w-full">
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-display font-semibold transition-all ${tab === t.id ? 'bg-neon text-ink' : 'text-white/50 hover:text-white'}`}>
                            <t.icon size={12} />{t.label}
                        </button>
                    ))}
                </div>

                {/* ── Summary Tab ────────────────────────── */}
                {tab === 'summary' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <Stat icon={Trophy} value={`${pct.toFixed(1)}%`} label="Score" color="text-amber" />
                            <Stat icon={Target} value={`${perf.accuracy_percentage?.toFixed(0) || 0}%`} label="Accuracy" color="text-neon" />
                            <Stat icon={CheckCircle} value={perf.correct_answers || correct} label="Correct Answers" color="text-emerald" />
                            <Stat icon={BookOpen} value={perf.total_questions || answers.length} label="Total Questions" color="text-violet-300" />
                        </div>

                        {/* Strengths / Weaknesses */}
                        {(report.strengths?.length || report.weaknesses?.length) ? (
                            <div className="grid grid-cols-2 gap-3">
                                {report.strengths?.length > 0 && (
                                    <div className="glass p-4">
                                        <h3 className="font-display font-semibold text-sm text-emerald mb-3 flex items-center gap-1.5">
                                            <CheckCircle size={13} />Strengths
                                        </h3>
                                        <ul className="space-y-1.5">
                                            {report.strengths.map((s, i) => (
                                                <li key={i} className="text-xs text-white/60 flex gap-2 font-body"><span className="text-emerald mt-0.5">•</span>{s}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {report.weaknesses?.length > 0 && (
                                    <div className="glass p-4">
                                        <h3 className="font-display font-semibold text-sm text-rose mb-3 flex items-center gap-1.5">
                                            <Target size={13} />Improve
                                        </h3>
                                        <ul className="space-y-1.5">
                                            {report.weaknesses.map((w, i) => (
                                                <li key={i} className="text-xs text-white/60 flex gap-2 font-body"><span className="text-rose mt-0.5">•</span>{w}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ) : null}

                        {/* Study plan */}
                        {report.study_plan && (report.study_plan.immediate || report.study_plan.short_term) && (
                            <div className="glass p-5">
                                <h3 className="font-display font-semibold text-white mb-3">Recommended Study Plan</h3>
                                <div className="space-y-2">
                                    {[
                                        { label: 'Today', v: report.study_plan.immediate, c: 'border-neon/20 bg-neon/5' },
                                        { label: 'This Week', v: report.study_plan.short_term, c: 'border-violet/20 bg-violet/5' },
                                        { label: 'This Month', v: report.study_plan.long_term, c: 'border-amber/20 bg-amber/5' },
                                    ].filter(p => p.v).map(p => (
                                        <div key={p.label} className={`p-3 rounded-xl border ${p.c}`}>
                                            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">{p.label}</p>
                                            <p className="text-sm text-white/80 font-body">{p.v}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Answers Tab ────────────────────────── */}
                {tab === 'answers' && (
                    <div className="space-y-3">
                        {answers.length === 0 ? (
                            <div className="glass p-10 text-center"><p className="text-white/40">No answer breakdown available.</p></div>
                        ) : answers.map((a, i) => (
                            <div key={i} className={`glass p-4 border ${a.is_correct === true ? 'border-neon/20 bg-neon/5' : a.is_correct === false ? 'border-rose/20 bg-rose/5' : 'border-white/10'}`}>
                                <div className="flex items-start gap-3">
                                    {a.is_correct === true ? <CheckCircle size={15} className="text-neon shrink-0 mt-0.5" />
                                        : a.is_correct === false ? <XCircle size={15} className="text-rose shrink-0 mt-0.5" />
                                            : <Target size={15} className="text-amber shrink-0 mt-0.5" />}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-white font-body leading-relaxed mb-1">{a.question_text}</p>
                                        {a.is_correct === false && a.correct_answer !== null && (
                                            <p className="text-xs text-neon/70">✓ Correct answer: Option {typeof a.correct_answer === 'number' ? a.correct_answer + 1 : a.correct_answer}</p>
                                        )}
                                        <div className="flex items-center justify-between mt-1">
                                            {a.marks_obtained !== undefined && (
                                                <p className="text-xs text-white/30">{a.marks_obtained}/{a.total_marks} marks</p>
                                            )}
                                            {a.topic && <span className="text-xs text-white/30">{a.topic}</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Insights Tab ───────────────────────── */}
                {tab === 'insights' && (
                    <div className="space-y-4">
                        {report.insights?.length > 0 && (
                            <div className="glass p-5">
                                <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
                                    <Lightbulb size={15} className="text-amber" />AI Insights
                                </h3>
                                <div className="space-y-3">
                                    {report.insights.map((ins, i) => (
                                        <div key={i} className="flex gap-3 p-3 bg-white/5 rounded-xl">
                                            <div className="w-5 h-5 rounded-full bg-amber/15 text-amber flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                                            <p className="text-xs text-white/70 font-body leading-relaxed">{ins}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {report.recommendations?.length > 0 && (
                            <div className="glass p-5">
                                <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
                                    <TrendingUp size={15} className="text-neon" />Recommendations
                                </h3>
                                <div className="space-y-2">
                                    {report.recommendations.map((r, i) => (
                                        <div key={i} className="flex gap-3 p-3 bg-neon/5 border border-neon/10 rounded-xl">
                                            <Zap size={12} className="text-neon shrink-0 mt-0.5" />
                                            <p className="text-xs text-white/70 font-body">{r}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {(!report.insights?.length && !report.recommendations?.length) && (
                            <div className="glass p-10 text-center">
                                <Brain size={32} className="text-white/20 mx-auto mb-3" />
                                <p className="text-white/40">AI insights are being generated. Check back shortly.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                    <Link to="/student/exams" className="btn-primary flex-1 justify-center">
                        Find Another Exam<ArrowRight size={13} />
                    </Link>
                    <Link to="/practice" className="btn-secondary flex-1 justify-center">
                        <Zap size={13} />Practice
                    </Link>
                </div>
            </div>
        </div>
    );
}