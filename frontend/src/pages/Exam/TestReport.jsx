// FILE: frontend/src/pages/Exam/TestReport.jsx

import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Layout from '@/components/common/Layout';
import { quizAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import {
    Trophy, CheckCircle, XCircle, Lightbulb, Target,
    ArrowRight, Zap, Brain, TrendingUp, BookOpen, Clock
} from 'lucide-react';
import Spinner from '@/components/common/Spinner';

function Grade({ pct }) {
    const g = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : 'F';
    const cls = pct >= 70 ? 'from-neon to-emerald' : pct >= 50 ? 'from-amber to-orange-400' : 'from-rose to-red-500';
    return (
        <div className={`w-28 h-28 rounded-full bg-gradient-to-br ${cls} flex flex-col items-center justify-center mx-auto shadow-xl`}>
            <span className="text-3xl font-display font-black text-ink">{g}</span>
            <span className="text-xs font-body text-ink/70">{pct.toFixed(1)}%</span>
        </div>
    );
}

export default function TestReport() {
    const { resultId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        quizAPI.getReport(resultId)
            .then(r => setData(r.data))
            .catch(() => navigate('/dashboard'))
            .finally(() => setLoading(false));
    }, [resultId]);

    if (loading) return <Layout><div className="page-center"><Spinner size="lg" /></div></Layout>;
    if (!data) return <Layout><div className="page-center"><p className="text-white/40">Report not found</p></div></Layout>;

    const result = data.result || {};
    const insights = data.insights || {};
    const pct = result.score || result.accuracy || 0;
    const bd = result.question_breakdown || [];
    const correct = result.correct_answers || bd.filter(q => q.is_correct).length;

    return (
        <Layout>
            <div className="page max-w-2xl">

                {/* Hero */}
                <div className="glass p-8 text-center mb-5 relative overflow-hidden">
                    <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(0,245,212,0.07) 0%, transparent 70%)' }} />
                    <p className="text-white/40 text-sm mb-4">{result.exam_name}</p>
                    <Grade pct={pct} />
                    <div className="flex justify-center gap-10 mt-7">
                        {[
                            { v: correct, label: 'Correct', c: 'text-neon' },
                            { v: result.total_questions - correct, label: 'Wrong', c: 'text-rose' },
                            { v: result.total_questions, label: 'Total', c: 'text-white/50' },
                        ].map(s => (
                            <div key={s.label} className="text-center">
                                <p className={`text-2xl font-display font-bold ${s.c}`}>{s.v}</p>
                                <p className="text-xs text-white/40">{s.label}</p>
                            </div>
                        ))}
                    </div>
                    {result.time_taken && (
                        <p className="text-xs text-white/30 mt-4 flex items-center justify-center gap-1">
                            <Clock size={11} /> {result.time_taken} min
                        </p>
                    )}
                </div>

                {/* AI Insights */}
                {insights.key_insights?.length > 0 && (
                    <div className="glass p-6 mb-5">
                        <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
                            <Lightbulb size={15} className="text-amber" />AI Insights
                        </h3>
                        <div className="space-y-3">
                            {insights.key_insights.map((ins, i) => (
                                <div key={i} className="flex gap-3 p-3 bg-white/5 rounded-xl">
                                    <div className="w-5 h-5 rounded-full bg-amber/15 text-amber flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                                    <p className="text-xs text-white/70 font-body leading-relaxed">{ins}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recommendations */}
                {insights.recommendations?.length > 0 && (
                    <div className="glass p-6 mb-5">
                        <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
                            <TrendingUp size={15} className="text-neon" />Recommendations
                        </h3>
                        <div className="space-y-2">
                            {insights.recommendations.map((r, i) => (
                                <div key={i} className="flex gap-3 p-3 bg-neon/5 border border-neon/10 rounded-xl">
                                    <Zap size={12} className="text-neon shrink-0 mt-0.5" />
                                    <p className="text-xs text-white/70 font-body">{r}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Answer Review */}
                {bd.length > 0 && (
                    <div className="glass p-6 mb-5">
                        <h3 className="font-display font-semibold text-white mb-4">Answer Review</h3>
                        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                            {bd.map((a, i) => (
                                <div key={i} className={`p-4 rounded-xl border ${a.is_correct ? 'border-neon/15 bg-neon/5' : 'border-rose/15 bg-rose/5'}`}>
                                    <div className="flex items-start gap-3">
                                        {a.is_correct
                                            ? <CheckCircle size={14} className="text-neon shrink-0 mt-0.5" />
                                            : <XCircle size={14} className="text-rose shrink-0 mt-0.5" />
                                        }
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-white font-body leading-relaxed line-clamp-2">{a.question_text}</p>
                                            {!a.is_correct && a.correct_answer != null && (
                                                <p className="text-xs text-neon/70 mt-1">✓ Correct: Option {typeof a.correct_answer === 'number' ? a.correct_answer + 1 : a.correct_answer}</p>
                                            )}
                                            {a.topic && <p className="text-xs text-white/30 mt-0.5">{a.topic}</p>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="grid grid-cols-3 gap-3">
                    <Link to="/countries" className="btn-primary justify-center text-sm">Retake<ArrowRight size={12} /></Link>
                    <Link to="/practice" className="btn-secondary justify-center text-sm"><Zap size={13} />Practice</Link>
                    <Link to="/recommendations" className="btn-ghost justify-center text-sm"><Brain size={13} />Study Plan</Link>
                </div>
            </div>
        </Layout>
    );
}