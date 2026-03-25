// FILE: frontend/src/pages/Dashboard/Dashboard.jsx

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Layout from '@/components/common/Layout';
import { quizAPI, tutorAPI } from '@/services/api';
import {
    Trophy, Zap, BookOpen, TrendingUp, ArrowRight, Target,
    Brain, Building2, GraduationCap, BarChart3, Globe, Sparkles,
    AlertTriangle, CheckCircle, Clock, Award, Activity
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const CT = ({ active, payload, label }) =>
    active && payload?.length ? (
        <div className="glass px-3 py-2 text-xs">
            <p className="text-white/50 mb-1">{label}</p>
            <p style={{ color: '#00f5d4' }} className="font-semibold">{payload[0]?.value?.toFixed(1)}%</p>
        </div>
    ) : null;

const RISK_BORDER = {
    low: 'border-emerald/30 bg-emerald/5', medium: 'border-amber/30 bg-amber/5',
    high: 'border-rose/30 bg-rose/5', critical: 'border-rose/40 bg-rose/10'
};

// ── Student actions (no institute links)
const STUDENT_ACTIONS = [
    { href: '/countries', icon: Globe, color: 'text-neon', bg: 'bg-neon/10', title: 'Take Exam', desc: 'Country-based exams with AI questions' },
    { href: '/practice', icon: Zap, color: 'text-violet-300', bg: 'bg-violet/10', title: 'AI Practice', desc: 'Personalised sessions targeting weak areas' },
    { href: '/tutor', icon: Brain, color: 'text-amber', bg: 'bg-amber/10', title: 'AI Tutor', desc: '24/7 chat tutor + concept explainer' },
    { href: '/adaptive', icon: Target, color: 'text-rose', bg: 'bg-rose/10', title: 'Adaptive Quiz', desc: 'Difficulty adjusts to your performance live' },
    { href: '/performance', icon: TrendingUp, color: 'text-emerald', bg: 'bg-emerald/10', title: 'Performance Hub', desc: 'Heatmaps, predictions & risk analysis' },
    { href: '/recommendations', icon: Sparkles, color: 'text-neon', bg: 'bg-neon/10', title: 'Recommendations', desc: 'AI study plan, resources & strategies' },
    { href: '/student/exams', icon: GraduationCap, color: 'text-amber', bg: 'bg-amber/10', title: 'Find Institute Exam', desc: 'Search by institute name or exam ID' },
];

// ── Institute actions (no student exam search)
const INSTITUTE_ACTIONS = [
    { href: '/institute/create', icon: Building2, color: 'text-violet-300', bg: 'bg-violet/10', title: 'Create Exam', desc: 'Publish institute exams in minutes' },
    { href: '/institute/exams', icon: BookOpen, color: 'text-neon', bg: 'bg-neon/10', title: 'My Exams', desc: 'Manage your published exams' },
    { href: '/institute/analytics', icon: BarChart3, color: 'text-emerald', bg: 'bg-emerald/10', title: 'Analytics', desc: 'Student performance & class insights' },
    { href: '/tutor', icon: Brain, color: 'text-amber', bg: 'bg-amber/10', title: 'AI Tutor', desc: '24/7 tutoring assistant' },
    { href: '/performance', icon: TrendingUp, color: 'text-rose', bg: 'bg-rose/10', title: 'Performance Hub', desc: 'Heatmaps & analytics dashboard' },
];

export default function Dashboard() {
    const { user } = useAuth();
    const isInstitute = user?.role === 'institute';
    const ACTIONS = isInstitute ? INSTITUTE_ACTIONS : STUDENT_ACTIONS;

    const [stats, setStats] = useState(null);
    const [history, setHistory] = useState([]);
    const [risk, setRisk] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const uid = user?._id || user?.user_id;
        if (!uid) { setLoading(false); return; }
        Promise.all([
            quizAPI.getPerformance(uid),
            tutorAPI.risk(),
        ]).then(([perfRes, riskRes]) => {
            setStats(perfRes.data.stats);
            setHistory(perfRes.data.history?.slice(0, 10) || []);
            setRisk(riskRes.data);
        }).catch(() => { }).finally(() => setLoading(false));
    }, [user]);

    const chartData = [...history].reverse().map((r, i) => ({
        name: `#${i + 1}`,
        score: +(r.accuracy || r.score || 0).toFixed(1),
    }));

    const greeting = () => {
        const h = new Date().getHours();
        return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    };

    return (
        <Layout>
            <div className="page max-w-6xl">

                {/* Welcome */}
                <div className="mb-8">
                    <p className="text-white/40 text-sm mb-1">{greeting()},</p>
                    <h1 className="text-3xl font-display font-bold">
                        {user?.username} <span className="text-white/30 text-xl">👋</span>
                    </h1>
                    {isInstitute && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '8px', padding: '3px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 600, background: 'rgba(124,58,237,0.2)', color: '#b8aaff', border: '1px solid rgba(124,58,237,0.3)' }}>
                            <Building2 size={10} /> Institute Account
                        </span>
                    )}
                </div>

                {/* Risk Alert */}
                {risk && risk.risk_level && risk.risk_level !== 'low' && (
                    <div className={`glass p-4 mb-6 border ${RISK_BORDER[risk.risk_level]}`}>
                        <div className="flex items-start gap-3">
                            <AlertTriangle size={18} className={risk.risk_level === 'medium' ? 'text-amber' : 'text-rose'} />
                            <div className="flex-1">
                                <p className="text-sm font-display font-semibold text-white">
                                    {risk.risk_level === 'critical' ? 'Critical Risk' : risk.risk_level === 'high' ? 'High Risk' : 'Attention Needed'}
                                </p>
                                {risk.alerts?.[0] && <p className="text-xs text-white/60 mt-0.5">{risk.alerts[0].message}</p>}
                            </div>
                            <Link to="/performance" className="btn-ghost text-xs shrink-0">View Details</Link>
                        </div>
                    </div>
                )}

                {/* Stats */}
                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="glass p-5 animate-pulse"><div className="h-8 bg-white/10 rounded mb-2" /><div className="h-3 bg-white/5 rounded w-3/4" /></div>
                        ))}
                    </div>
                ) : stats ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        {[
                            { icon: Trophy, label: 'Best Score', value: stats.best_score ? `${stats.best_score.toFixed(1)}%` : '—', color: 'text-amber' },
                            { icon: Activity, label: 'Avg Score', value: stats.avg_score ? `${stats.avg_score.toFixed(1)}%` : '—', color: 'text-neon' },
                            { icon: BookOpen, label: 'Exams Taken', value: stats.total_exams || 0, color: 'text-violet-300' },
                            { icon: CheckCircle, label: 'Total Correct', value: stats.total_correct || 0, color: 'text-emerald' },
                        ].map(s => (
                            <div key={s.label} className="glass p-5">
                                <s.icon size={20} className={`${s.color} mb-3`} />
                                <p className="text-2xl font-display font-bold text-white">{s.value}</p>
                                <p className="text-xs text-white/40 mt-0.5">{s.label}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="glass p-6 mb-8 text-center">
                        <Clock size={28} className="text-white/20 mx-auto mb-3" />
                        <p className="text-white/40 text-sm">No exam history yet. Take your first exam to see stats here.</p>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Score chart */}
                    <div className="lg:col-span-2 space-y-5">
                        {chartData.length > 1 && (
                            <div className="glass p-5">
                                <h2 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
                                    <TrendingUp size={15} className="text-neon" /> Score Trend
                                </h2>
                                <ResponsiveContainer width="100%" height={180}>
                                    <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -15 }}>
                                        <defs>
                                            <linearGradient id="grd" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#00f5d4" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#00f5d4" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                                        <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                                        <Tooltip content={<CT />} />
                                        <Area type="monotone" dataKey="score" stroke="#00f5d4" strokeWidth={2} fill="url(#grd)" name="Score" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Quick Actions */}
                        <div className="glass p-5">
                            <h2 className="font-display font-semibold text-white mb-4">Quick Actions</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {ACTIONS.map(a => (
                                    <Link key={a.href} to={a.href}
                                        className="flex items-center gap-3 p-3.5 bg-white/5 rounded-xl border border-white/8 hover:bg-white/8 hover:border-white/15 transition-all group">
                                        <div className={`w-9 h-9 rounded-xl ${a.bg} flex items-center justify-center shrink-0`}>
                                            <a.icon size={16} className={a.color} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-display font-semibold text-white">{a.title}</p>
                                            <p className="text-xs text-white/40 truncate">{a.desc}</p>
                                        </div>
                                        <ArrowRight size={13} className="text-white/20 group-hover:text-white/50 shrink-0 transition-colors" />
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        {/* Recent history */}
                        <div className="glass p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-display font-semibold text-white text-sm">Recent Exams</h3>
                                <Link to="/performance" className="text-xs text-neon/70 hover:text-neon transition-colors">See all →</Link>
                            </div>
                            {history.length === 0 ? (
                                <p className="text-xs text-white/30 text-center py-4">No exams yet</p>
                            ) : (
                                <div className="space-y-2">
                                    {history.slice(0, 5).map((r, i) => {
                                        const s = +(r.accuracy || r.score || 0).toFixed(0);
                                        return (
                                            <div key={i} className="flex items-center gap-3 p-2.5 bg-white/5 rounded-xl">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-display font-bold ${s >= 70 ? 'bg-neon/15 text-neon' : s >= 50 ? 'bg-amber/15 text-amber' : 'bg-rose/15 text-rose'
                                                    }`}>{s}%</div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-body text-white truncate">{r.exam_name || 'Exam'}</p>
                                                    <p className="text-xs text-white/30">{r.correct_answers}/{r.total_questions} correct</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Risk summary */}
                        {risk && (
                            <div className={`glass p-5 border ${RISK_BORDER[risk.risk_level || 'low']}`}>
                                <h3 className="font-display font-semibold text-sm text-white mb-2 flex items-center gap-2">
                                    <Award size={13} className={risk.risk_level === 'low' ? 'text-emerald' : risk.risk_level === 'medium' ? 'text-amber' : 'text-rose'} />
                                    Performance Health
                                </h3>
                                <p className="text-xs text-white/50 capitalize mb-1">{risk.risk_level || 'unknown'} risk level</p>
                                {risk.pass_probability != null && (
                                    <p className="text-xs text-white/40">Pass probability: <span className="text-white font-semibold">{risk.pass_probability.toFixed(0)}%</span></p>
                                )}
                                <Link to="/performance" className="btn-ghost text-xs mt-3 w-full justify-center">
                                    View Full Analysis <ArrowRight size={11} />
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}