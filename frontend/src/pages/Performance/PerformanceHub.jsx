// FILE: frontend/src/pages/Performance/PerformanceHub.jsx

import { useEffect, useState } from 'react';
import Layout from '@/components/common/Layout';
import { useAuth } from '@/context/AuthContext';
import { quizAPI, tutorAPI } from '@/services/api';
import {
    TrendingUp, AlertTriangle, CheckCircle, BarChart3, Target,
    Trophy, Clock, Brain, AlertCircle, ArrowRight, Shield,
    BookOpen, Activity, Award, Zap
} from 'lucide-react';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
    ResponsiveContainer, RadarChart, Radar, PolarGrid,
    PolarAngleAxis, PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import Spinner from '@/components/common/Spinner';
import { Link } from 'react-router-dom';

const RISK_COLOR = { low: 'text-emerald', medium: 'text-amber', high: 'text-rose', critical: 'text-rose', unknown: 'text-white/40' };
const RISK_BG = { low: 'bg-emerald/10 border-emerald/20', medium: 'bg-amber/10 border-amber/20', high: 'bg-rose/10 border-rose/20', critical: 'bg-rose/15 border-rose/30', unknown: 'bg-white/5 border-white/10' };
const MASTERY_CLR = { high: 'text-neon', medium: 'text-amber', low: 'text-rose' };

const CT = ({ active, payload, label }) => active && payload?.length ? (
    <div className="glass px-3 py-2 text-xs">
        <p className="text-white/50 mb-1">{label}</p>
        {payload.map((p, i) => <p key={i} style={{ color: p.color }} className="font-semibold">{p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}{p.name === 'Score' ? '%' : ''}</p>)}
    </div>
) : null;

function HeatCell({ value }) {
    const v = Math.min(100, Math.max(0, value || 0));
    const bg = v >= 80 ? 'rgba(0,245,212,0.8)' : v >= 60 ? 'rgba(0,245,212,0.5)' : v >= 40 ? 'rgba(245,158,11,0.5)' : 'rgba(244,63,94,0.5)';
    return (
        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-display font-bold text-ink"
            style={{ backgroundColor: bg }} title={`${v.toFixed(0)}%`}>
            {v.toFixed(0)}
        </div>
    );
}

export default function PerformanceHub() {
    const { user } = useAuth();
    const [perf, setPerf] = useState(null);
    const [risk, setRisk] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('overview');

    useEffect(() => {
        const uid = user?._id || user?.user_id;
        if (!uid) { setLoading(false); return; }
        Promise.all([
            quizAPI.getPerformance(uid),
            tutorAPI.risk(),
        ]).then(([pRes, rRes]) => {
            setPerf(pRes.data);
            setRisk(rRes.data);
        }).catch(() => { }).finally(() => setLoading(false));
    }, [user]);

    if (loading) return (
        <Layout><div className="page-center"><Spinner size="lg" /></div></Layout>
    );

    const stats = perf?.stats || {};
    const history = perf?.history || [];
    const breakdown = perf?.breakdown || [];
    const trends = perf?.trends || {};

    // Chart data
    const scoreHistory = [...history].reverse().map((r, i) => ({
        name: `#${i + 1}`,
        Score: +(r.accuracy || r.score || 0).toFixed(1),
    }));

    const radarData = breakdown.slice(0, 8).map(t => ({
        subject: t.topic.length > 12 ? t.topic.slice(0, 12) + '…' : t.topic,
        score: t.accuracy,
        full: 100,
    }));

    const diffData = trends.by_difficulty
        ? Object.entries(trends.by_difficulty).map(([k, v]) => ({ name: k, score: +(v || 0).toFixed(1) }))
        : [];

    const pieData = [
        { name: 'Correct', value: stats.total_correct || 0, color: '#00f5d4' },
        { name: 'Incorrect', value: Math.max(0, (stats.total_questions || 0) - (stats.total_correct || 0)), color: '#f43f5e' },
    ].filter(d => d.value > 0);

    const TABS = [
        { id: 'overview', label: 'Overview', icon: Activity },
        { id: 'topics', label: 'Topic Heatmap', icon: Target },
        { id: 'trends', label: 'Trends', icon: TrendingUp },
        { id: 'risk', label: 'Risk Analysis', icon: Shield },
    ];

    return (
        <Layout>
            <div className="page max-w-6xl">
                {/* Header */}
                <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
                    <div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 600, background: 'rgba(0,245,212,0.15)', color: '#00f5d4', border: '1px solid rgba(0,245,212,0.2)', marginBottom: '8px' }}>
                            <Activity size={10} /> Live Analytics
                        </div>
                        <h1 className="text-3xl font-display font-bold">Performance Hub</h1>
                        <p className="text-white/40 text-sm mt-1">Deep dive into your scores, topic mastery & exam readiness</p>
                    </div>
                    <Link to="/recommendations" className="btn-primary text-sm shrink-0">
                        <Zap size={14} />Get Study Plan
                    </Link>
                </div>

                {/* Summary cards */}
                {stats.total_exams > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        {[
                            { icon: Trophy, label: 'Best Score', value: `${(stats.best_score || 0).toFixed(1)}%`, color: 'text-amber' },
                            { icon: Activity, label: 'Average Score', value: `${(stats.avg_score || 0).toFixed(1)}%`, color: 'text-neon' },
                            { icon: BookOpen, label: 'Total Exams', value: stats.total_exams || 0, color: 'text-violet-300' },
                            { icon: CheckCircle, label: 'Total Correct', value: stats.total_correct || 0, color: 'text-emerald' },
                        ].map(s => (
                            <div key={s.label} className="glass p-5">
                                <s.icon size={20} className={`${s.color} mb-3`} />
                                <p className="text-2xl font-display font-bold">{s.value}</p>
                                <p className="text-xs text-white/40 mt-0.5">{s.label}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="glass p-10 text-center mb-8">
                        <BarChart3 size={36} className="text-white/20 mx-auto mb-3" />
                        <p className="text-white/40 font-body">No exam data yet. Take a few exams to unlock your performance analytics.</p>
                        <Link to="/countries" className="btn-primary text-sm mt-4 inline-flex">Take Your First Exam <ArrowRight size={13} /></Link>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-6 w-fit flex-wrap">
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-display font-semibold transition-all ${tab === t.id ? 'bg-neon text-ink' : 'text-white/50 hover:text-white'}`}>
                            <t.icon size={13} />{t.label}
                        </button>
                    ))}
                </div>

                {/* ── Overview ────────────────────────────────────── */}
                {tab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Score history */}
                        <div className="glass p-6">
                            <h3 className="font-display font-semibold text-white mb-4">Score History</h3>
                            {scoreHistory.length > 1 ? (
                                <ResponsiveContainer width="100%" height={200}>
                                    <AreaChart data={scoreHistory} margin={{ top: 5, right: 5, bottom: 0, left: -15 }}>
                                        <defs>
                                            <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#00f5d4" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#00f5d4" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                                        <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                                        <Tooltip content={<CT />} />
                                        <Area type="monotone" dataKey="Score" stroke="#00f5d4" strokeWidth={2} fill="url(#sg)" name="Score" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : <p className="text-white/30 text-sm text-center py-12">Take more exams to see your trend</p>}
                        </div>

                        {/* Correct vs Incorrect pie */}
                        <div className="glass p-6">
                            <h3 className="font-display font-semibold text-white mb-4">Overall Accuracy</h3>
                            {pieData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                                            dataKey="value" paddingAngle={3}>
                                            {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                                        </Pie>
                                        <Tooltip formatter={v => [v, 'Questions']} />
                                        <Legend iconType="circle" formatter={v => <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{v}</span>} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : <p className="text-white/30 text-sm text-center py-12">No data yet</p>}
                        </div>

                        {/* Recent activity */}
                        {history.length > 0 && (
                            <div className="glass p-6 lg:col-span-2">
                                <h3 className="font-display font-semibold text-white mb-4">Recent Activity</h3>
                                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                    {history.map((r, i) => {
                                        const s = +(r.accuracy || r.score || 0).toFixed(0);
                                        return (
                                            <div key={i} className="flex items-center gap-4 p-3 bg-white/5 rounded-xl">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-display font-bold shrink-0 ${s >= 70 ? 'bg-neon/15 text-neon' : s >= 50 ? 'bg-amber/15 text-amber' : 'bg-rose/15 text-rose'}`}>
                                                    {s}%
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-white font-body truncate">{r.exam_name || 'Exam'}</p>
                                                    <p className="text-xs text-white/30">{r.correct_answers}/{r.total_questions} correct · {r.exam_type || 'online'}</p>
                                                </div>
                                                <span className={`text-xs px-2 py-1 rounded-lg ${s >= 70 ? 'bg-neon/10 text-neon' : s >= 50 ? 'bg-amber/10 text-amber' : 'bg-rose/10 text-rose'}`}>
                                                    {s >= 70 ? 'Pass' : s >= 50 ? 'Average' : 'Needs Work'}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Topics ──────────────────────────────────────── */}
                {tab === 'topics' && (
                    <div className="space-y-5">
                        {breakdown.length > 0 ? (
                            <>
                                {/* Heatmap grid */}
                                <div className="glass p-6">
                                    <h3 className="font-display font-semibold text-white mb-4">Topic Mastery Heatmap</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {breakdown.map((t, i) => (
                                            <div key={i} className="flex flex-col items-center gap-1">
                                                <HeatCell value={t.accuracy} />
                                                <p className="text-xs text-white/40 text-center w-9 truncate" title={t.topic}>
                                                    {t.topic.length > 6 ? t.topic.slice(0, 5) + '…' : t.topic}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-3 mt-5 text-xs text-white/40">
                                        <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{ background: 'rgba(244,63,94,0.5)' }} />0–39%</span>
                                        <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{ background: 'rgba(245,158,11,0.5)' }} />40–59%</span>
                                        <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{ background: 'rgba(0,245,212,0.5)' }} />60–79%</span>
                                        <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{ background: 'rgba(0,245,212,0.8)' }} />80–100%</span>
                                    </div>
                                </div>

                                {/* Radar */}
                                {radarData.length >= 3 && (
                                    <div className="glass p-6">
                                        <h3 className="font-display font-semibold text-white mb-4">Skills Radar</h3>
                                        <ResponsiveContainer width="100%" height={280}>
                                            <RadarChart data={radarData}>
                                                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                                                <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
                                                <Radar name="Score" dataKey="score" stroke="#00f5d4" fill="#00f5d4" fillOpacity={0.25} strokeWidth={2} />
                                                <Tooltip formatter={v => [`${v.toFixed(1)}%`, 'Score']} />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}

                                {/* Table */}
                                <div className="glass p-5">
                                    <h3 className="font-display font-semibold text-white mb-4">Topic Breakdown</h3>
                                    <div className="space-y-2">
                                        {breakdown.map((t, i) => (
                                            <div key={i} className="flex items-center gap-4">
                                                <div className={`shrink-0 text-xs font-display font-semibold w-16 text-right ${MASTERY_CLR[t.mastery]}`}>
                                                    {t.accuracy}%
                                                </div>
                                                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                                                    <div className="h-full rounded-full transition-all duration-700"
                                                        style={{ width: `${t.accuracy}%`, background: t.mastery === 'high' ? '#00f5d4' : t.mastery === 'medium' ? '#f59e0b' : '#f43f5e' }} />
                                                </div>
                                                <p className="text-sm text-white/70 w-32 truncate font-body">{t.topic}</p>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${t.mastery === 'high' ? 'bg-neon/10 text-neon' : t.mastery === 'medium' ? 'bg-amber/10 text-amber' : 'bg-rose/10 text-rose'}`}>
                                                    {t.mastery}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        ) : <div className="glass p-12 text-center"><p className="text-white/40">Take exams with topic-tagged questions to see your heatmap.</p></div>}
                    </div>
                )}

                {/* ── Trends ──────────────────────────────────────── */}
                {tab === 'trends' && (
                    <div className="space-y-5">
                        {diffData.length > 0 && (
                            <div className="glass p-6">
                                <h3 className="font-display font-semibold text-white mb-4">Performance by Difficulty</h3>
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={diffData} margin={{ top: 5, right: 5, bottom: 0, left: -15 }}>
                                        <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                        <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                        <Tooltip content={<CT />} />
                                        <Bar dataKey="score" name="Score" radius={[6, 6, 0, 0]}>
                                            {diffData.map((d, i) => (
                                                <Cell key={i} fill={d.name === 'easy' ? '#10b981' : d.name === 'medium' ? '#f59e0b' : '#f43f5e'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {trends.overall_trend && (
                            <div className="glass p-5">
                                <h3 className="font-display font-semibold text-white mb-3">Overall Trend</h3>
                                <div className="flex items-center gap-3">
                                    <TrendingUp size={20} className={trends.overall_trend === 'improving' ? 'text-neon' : trends.overall_trend === 'declining' ? 'text-rose' : 'text-amber'} />
                                    <div>
                                        <p className="text-white font-display font-semibold capitalize">{trends.overall_trend || 'Stable'}</p>
                                        <p className="text-xs text-white/40">Based on your last {history.length} exams</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {!diffData.length && !trends.overall_trend && (
                            <div className="glass p-12 text-center">
                                <TrendingUp size={36} className="text-white/20 mx-auto mb-3" />
                                <p className="text-white/40">Take more exams across different difficulty levels to see trends.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Risk Analysis ────────────────────────────────── */}
                {tab === 'risk' && (
                    <div className="space-y-5">
                        {risk ? (
                            <>
                                <div className={`glass p-6 border ${RISK_BG[risk.risk_level || 'unknown']}`}>
                                    <div className="flex items-start gap-4 mb-5">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${RISK_BG[risk.risk_level || 'unknown']}`}>
                                            <Shield size={24} className={RISK_COLOR[risk.risk_level || 'unknown']} />
                                        </div>
                                        <div>
                                            <h2 className="font-display font-bold text-xl text-white capitalize">
                                                {risk.risk_level || 'Unknown'} Risk Level
                                            </h2>
                                            {risk.pass_probability != null && (
                                                <p className="text-sm text-white/60 mt-1">
                                                    Estimated pass probability: <span className="text-white font-semibold">{risk.pass_probability.toFixed(0)}%</span>
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {risk.alerts?.length > 0 && (
                                        <div className="space-y-2 mb-4">
                                            {risk.alerts.map((a, i) => (
                                                <div key={i} className="flex items-start gap-2 p-3 bg-white/5 rounded-xl">
                                                    <AlertCircle size={14} className={a.type === 'critical' ? 'text-rose' : a.type === 'warning' ? 'text-amber' : 'text-neon'} style={{ marginTop: 2, shrink: 0 }} />
                                                    <p className="text-xs text-white/70 font-body">{a.message}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {risk.intervention_plan && (
                                        <div className="p-4 bg-neon/5 border border-neon/15 rounded-xl">
                                            <p className="text-xs text-neon/60 mb-1 font-display font-semibold uppercase tracking-wider">Intervention Plan</p>
                                            <p className="text-sm text-white/70 font-body">{risk.intervention_plan}</p>
                                        </div>
                                    )}
                                </div>

                                {risk.risk_factors?.length > 0 && (
                                    <div className="glass p-6">
                                        <h3 className="font-display font-semibold text-white mb-4">Risk Factors</h3>
                                        <div className="space-y-3">
                                            {risk.risk_factors.map((f, i) => (
                                                <div key={i} className="flex items-start gap-3 p-3 bg-rose/5 border border-rose/10 rounded-xl">
                                                    <AlertTriangle size={14} className="text-rose shrink-0 mt-0.5" />
                                                    <p className="text-sm text-white/70 font-body">{f}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {risk.predictions?.length > 0 && (
                                    <div className="glass p-6">
                                        <h3 className="font-display font-semibold text-white mb-4">Predictions</h3>
                                        <div className="space-y-2">
                                            {risk.predictions.map((p, i) => (
                                                <div key={i} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                                                    <CheckCircle size={14} className="text-neon shrink-0 mt-0.5" />
                                                    <p className="text-sm text-white/70 font-body">{p}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <Link to="/practice" className="btn-primary flex-1 justify-center"><Zap size={14} />Start Practice</Link>
                                    <Link to="/recommendations" className="btn-secondary flex-1 justify-center"><Brain size={14} />Get Study Plan</Link>
                                </div>
                            </>
                        ) : (
                            <div className="glass p-12 text-center">
                                <Shield size={36} className="text-white/20 mx-auto mb-3" />
                                <p className="text-white/40">Risk analysis requires at least 3 exam attempts.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Layout>
    );
}