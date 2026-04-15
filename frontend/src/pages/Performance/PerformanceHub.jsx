/**
 * PerformanceHub.jsx  ─  Full analytics dashboard
 * Tabs: Overview, Topics, Risk Analysis
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/components/common/Layout';
import Spinner from '@/components/common/Spinner';
import StatCard from '@/components/ui/StatCard';
import EmptyState from '@/components/ui/EmptyState';
import { useAuth } from '@/context/AuthContext';
import { quizAPI, tutorAPI } from '@/services/api';
import { Trophy, Activity, BookOpen, CheckCircle, TrendingUp, Target, Shield, AlertCircle, Zap, Brain, ArrowRight, BarChart3 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PieChart, Pie, Cell, Legend } from 'recharts';
import { usePageTitle } from '@/hooks/usePageTitle';

function CT({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass px-3 py-2 text-xs">
      <p className="mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-neon font-semibold">{payload[0]?.value?.toFixed(1)}%</p>
    </div>
  );
}

function HeatCell({ value, topic }) {
  const v  = Math.min(100, Math.max(0, value || 0));
  const bg = v >= 80 ? 'rgba(0,245,212,0.75)' : v >= 60 ? 'rgba(0,245,212,0.45)' : v >= 40 ? 'rgba(245,158,11,0.55)' : 'rgba(244,63,94,0.55)';
  const textColor = '#0a0f1e';
  return (
    <div className="flex flex-col items-center gap-1">
      <div title={`${topic}: ${v}%`} className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-display font-bold cursor-help" style={{ backgroundColor: bg, color: textColor }}>{v}</div>
      <p className="text-xs text-center truncate w-10" style={{ color: 'var(--text-dim)', fontSize: '10px' }} title={topic}>{topic.length > 6 ? topic.slice(0,5)+'…' : topic}</p>
    </div>
  );
}

export default function PerformanceHub() {
  usePageTitle('Performance Hub');
  const { user } = useAuth();
  const [perf, setPerf] = useState(null);
  const [risk, setRisk] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    const uid = user?._id || user?.user_id;
    if (!uid) { setLoading(false); return; }
    Promise.all([quizAPI.getPerformance(uid), tutorAPI.risk()])
      .then(([pRes, rRes]) => { setPerf(pRes.data); setRisk(rRes.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <Layout><div className="page-center"><Spinner size="lg" /></div></Layout>;

  const stats     = perf?.stats     || {};
  const history   = perf?.history   || [];
  const breakdown = perf?.breakdown || [];

  const scoreHistory = [...history].reverse().map((r, i) => ({ name: `#${i+1}`, Score: +(r.accuracy || r.score || 0).toFixed(1) }));
  const radarData    = breakdown.slice(0, 8).map(t => ({ subject: t.topic.length > 10 ? t.topic.slice(0,9)+'…' : t.topic, score: t.accuracy }));
  const pieData      = [
    { name: 'Correct',   value: stats.total_correct || 0, color: '#00f5d4' },
    { name: 'Incorrect', value: Math.max(0, (stats.total_questions || 0) - (stats.total_correct || 0)), color: '#f43f5e' },
  ].filter(d => d.value > 0);

  const RISK_COLOR = { low: 'text-emerald', medium: 'text-amber', high: 'text-rose', critical: 'text-rose', unknown: '' };

  const TABS = [
    { id: 'overview', label: 'Overview',      icon: Activity },
    { id: 'topics',   label: 'Topic Heatmap', icon: Target },
    { id: 'risk',     label: 'Risk Analysis', icon: Shield },
  ];

  return (
    <Layout>
      <div className="page max-w-6xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div>
            <div className="badge-neon inline-flex mb-2"><Activity size={10} /> Live Analytics</div>
            <h1 className="text-3xl font-display font-bold" style={{ color: 'var(--text)' }}>Performance Hub</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Scores, topic mastery & exam readiness</p>
          </div>
          <Link to="/recommendations" className="btn-primary text-sm shrink-0"><Zap size={14} /> Get Study Plan</Link>
        </div>

        {/* Stats */}
        {stats.total_exams > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard icon={Trophy}      label="Best Score"    value={`${(stats.best_score||0).toFixed(1)}%`} color="text-amber" />
            <StatCard icon={Activity}    label="Average Score" value={`${(stats.avg_score||0).toFixed(1)}%`}  color="text-neon" />
            <StatCard icon={BookOpen}    label="Total Exams"   value={stats.total_exams || 0}                 color="text-violet-300" />
            <StatCard icon={CheckCircle} label="Total Correct" value={stats.total_correct || 0}               color="text-emerald" />
          </div>
        ) : (
          <EmptyState icon={BarChart3} title="No exam data yet" desc="Take a few exams to unlock your analytics."
            action={<Link to="/countries" className="btn-primary text-sm">Take Your First Exam <ArrowRight size={13} /></Link>} />
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl mb-6 w-fit flex-wrap" style={{ backgroundColor: 'var(--surface)' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-display font-semibold transition-all ${tab === t.id ? 'bg-neon text-ink' : ''}`}
              style={tab !== t.id ? { color: 'var(--text-muted)' } : {}}>
              <t.icon size={13} />{t.label}
            </button>
          ))}
        </div>

        {/* ── Overview ───────────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass p-6">
              <h3 className="font-display font-semibold mb-4" style={{ color: 'var(--text)' }}>Score History</h3>
              {scoreHistory.length > 1 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={scoreHistory} margin={{ top: 5, right: 5, bottom: 0, left: -15 }}>
                    <defs>
                      <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#00f5d4" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#00f5d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" tick={{ fill: 'var(--text-dim)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0,100]} tick={{ fill: 'var(--text-dim)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CT />} />
                    <Area type="monotone" dataKey="Score" stroke="#00f5d4" strokeWidth={2} fill="url(#sg)" name="Score" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-center py-12" style={{ color: 'var(--text-dim)' }}>Take more exams to see your trend</p>}
            </div>

            <div className="glass p-6">
              <h3 className="font-display font-semibold mb-4" style={{ color: 'var(--text)' }}>Accuracy Breakdown</h3>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                      {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip formatter={v => [v, 'Questions']} />
                    <Legend iconType="circle" formatter={v => <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-center py-12" style={{ color: 'var(--text-dim)' }}>No data yet</p>}
            </div>

            {history.length > 0 && (
              <div className="glass p-6 lg:col-span-2">
                <h3 className="font-display font-semibold mb-4" style={{ color: 'var(--text)' }}>Recent Activity</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {history.map((r, i) => {
                    const s = +(r.accuracy || r.score || 0).toFixed(0);
                    return (
                      <div key={i} className="flex items-center gap-4 p-3 rounded-xl" style={{ backgroundColor: 'var(--surface)' }}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-display font-bold shrink-0 ${s >= 70 ? 'bg-neon/15 text-neon' : s >= 50 ? 'bg-amber/15 text-amber' : 'bg-rose/15 text-rose'}`}>{s}%</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate" style={{ color: 'var(--text)' }}>{r.exam_name || 'Exam'}</p>
                          <p className="text-xs" style={{ color: 'var(--text-dim)' }}>{r.correct_answers}/{r.total_questions} correct</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Topics ─────────────────────────────────────────────────────── */}
        {tab === 'topics' && (
          <div className="space-y-5">
            {breakdown.length > 0 ? (
              <>
                <div className="glass p-6">
                  <h3 className="font-display font-semibold mb-4" style={{ color: 'var(--text)' }}>Mastery Heatmap</h3>
                  <div className="flex flex-wrap gap-2">
                    {breakdown.map((t, i) => <HeatCell key={i} value={t.accuracy} topic={t.topic} />)}
                  </div>
                  <div className="flex items-center gap-4 mt-5 text-xs flex-wrap" style={{ color: 'var(--text-dim)' }}>
                    {[['rgba(244,63,94,0.55)', '0–39%'], ['rgba(245,158,11,0.55)', '40–59%'], ['rgba(0,245,212,0.45)', '60–79%'], ['rgba(0,245,212,0.75)', '80–100%']].map(([c, l]) => (
                      <span key={l} className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{ backgroundColor: c }} />{l}</span>
                    ))}
                  </div>
                </div>

                {radarData.length >= 3 && (
                  <div className="glass p-6">
                    <h3 className="font-display font-semibold mb-4" style={{ color: 'var(--text)' }}>Skills Radar</h3>
                    <ResponsiveContainer width="100%" height={280}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="var(--border)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                        <Radar name="Score" dataKey="score" stroke="#00f5d4" fill="#00f5d4" fillOpacity={0.2} strokeWidth={2} />
                        <Tooltip formatter={v => [`${v.toFixed(1)}%`, 'Score']} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <div className="glass p-5">
                  <h3 className="font-display font-semibold mb-4" style={{ color: 'var(--text)' }}>Topic Breakdown</h3>
                  <div className="space-y-2">
                    {breakdown.map((t, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <div className="shrink-0 text-xs font-semibold w-12 text-right" style={{ color: t.mastery === 'high' ? '#00f5d4' : t.mastery === 'medium' ? '#f59e0b' : '#f43f5e' }}>{t.accuracy}%</div>
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${t.accuracy}%`, backgroundColor: t.mastery === 'high' ? '#00f5d4' : t.mastery === 'medium' ? '#f59e0b' : '#f43f5e' }} />
                        </div>
                        <p className="text-sm w-28 truncate" style={{ color: 'var(--text-muted)' }}>{t.topic}</p>
                        <span className={`badge text-xs ${t.mastery === 'high' ? 'badge-neon' : t.mastery === 'medium' ? 'badge-amber' : 'badge-rose'}`}>{t.mastery}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : <EmptyState icon={Target} title="No topic data" desc="Take exams with topic-tagged questions to see your heatmap." />}
          </div>
        )}

        {/* ── Risk ───────────────────────────────────────────────────────── */}
        {tab === 'risk' && (
          <div className="space-y-5">
            {risk ? (
              <>
                <div className="glass p-6">
                  <div className="flex items-start gap-4 mb-5">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--surface)' }}>
                      <Shield size={24} className={RISK_COLOR[risk.risk_level || 'unknown']} />
                    </div>
                    <div>
                      <h2 className="font-display font-bold text-xl capitalize" style={{ color: 'var(--text)' }}>{risk.risk_level || 'Unknown'} Risk</h2>
                      {risk.pass_probability != null && (
                        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                          Pass probability: <span className="font-semibold" style={{ color: 'var(--text)' }}>{risk.pass_probability.toFixed(0)}%</span>
                        </p>
                      )}
                    </div>
                  </div>
                  {risk.alerts?.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {risk.alerts.map((a, i) => (
                        <div key={i} className="flex items-start gap-2 p-3 rounded-xl" style={{ backgroundColor: 'var(--surface)' }}>
                          <AlertCircle size={14} className={a.type === 'warning' ? 'text-amber' : 'text-neon'} style={{ marginTop: 2 }} />
                          <p className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>{a.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {risk.intervention_plan && (
                    <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(0,245,212,0.04)', border: '1px solid rgba(0,245,212,0.12)' }}>
                      <p className="text-xs text-neon/60 mb-1 font-semibold uppercase tracking-wider">Intervention Plan</p>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{risk.intervention_plan}</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  <Link to="/practice"        className="btn-primary  flex-1 justify-center"><Zap  size={14} /> Start Practice</Link>
                  <Link to="/recommendations" className="btn-secondary flex-1 justify-center"><Brain size={14} /> Study Plan</Link>
                </div>
              </>
            ) : <EmptyState icon={Shield} title="No risk data" desc="Take at least 3 exams to unlock risk analysis." />}
          </div>
        )}
      </div>
    </Layout>
  );
}
