/**
 * Dashboard.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Two completely separate UIs based on user.role:
 *
 *  STUDENT   →  Greeting, risk alert, performance stats (Best/Avg/Exams/Correct),
 *               score trend chart, quick-action cards, recent history, risk widget.
 *
 *  INSTITUTE →  Greeting, institute stats (exams published, total attempts),
 *               quick-action cards, recent exam list with copy-ID + analytics link.
 *               NO student metrics (best score / avg score / total correct).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Layout from '@/components/common/Layout';
import StatCard from '@/components/ui/StatCard';
import { quizAPI, tutorAPI, instituteAPI } from '@/services/api';
import {
  Trophy, Zap, BookOpen, TrendingUp, ArrowRight, Target,
  Brain, Building2, GraduationCap, BarChart3, Globe, Sparkles,
  AlertTriangle, CheckCircle, Activity, Shield, Users, Copy,
  PlusCircle, Clock,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { usePageTitle } from '@/hooks/usePageTitle';
import toast from 'react-hot-toast';

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass px-3 py-2 text-xs">
      <p className="mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-neon font-semibold">{payload[0]?.value?.toFixed(1)}%</p>
    </div>
  );
}

const RISK_BORDER = {
  low: 'border-emerald/25', medium: 'border-amber/25',
  high: 'border-rose/25', critical: 'border-rose/40', unknown: '',
};

const STUDENT_ACTIONS = [
  { href: '/countries', icon: Globe, color: 'text-neon', bg: 'bg-neon/10', title: 'Take Exam', desc: 'Country-based AI exams' },
  { href: '/practice', icon: Zap, color: 'text-violet-300', bg: 'bg-violet/10', title: 'AI Practice', desc: 'Targets your weak areas' },
  { href: '/tutor', icon: Brain, color: 'text-amber', bg: 'bg-amber/10', title: 'AI Tutor', desc: '24/7 tutoring + explainer' },
  { href: '/adaptive', icon: Target, color: 'text-rose', bg: 'bg-rose/10', title: 'Adaptive Quiz', desc: 'Live difficulty adjustment' },
  { href: '/performance', icon: TrendingUp, color: 'text-emerald', bg: 'bg-emerald/10', title: 'Performance Hub', desc: 'Heatmaps, trends & risk' },
  { href: '/recommendations', icon: Sparkles, color: 'text-neon', bg: 'bg-neon/10', title: 'Recommendations', desc: 'AI study plan & resources' },
  { href: '/student/exams', icon: GraduationCap, color: 'text-amber', bg: 'bg-amber/10', title: 'Find Institute Exam', desc: 'Search by institute or ID' },
];

const INSTITUTE_ACTIONS = [
  { href: '/institute/create', icon: Building2, color: 'text-violet-300', bg: 'bg-violet/10', title: 'Create Exam', desc: 'Build & publish in minutes' },
  { href: '/institute/exams', icon: BookOpen, color: 'text-neon', bg: 'bg-neon/10', title: 'My Exams', desc: 'Manage published exams' },
  { href: '/institute/analytics', icon: BarChart3, color: 'text-emerald', bg: 'bg-emerald/10', title: 'Analytics', desc: 'Class performance & insights' },
  { href: '/tutor', icon: Brain, color: 'text-amber', bg: 'bg-amber/10', title: 'AI Question Gen', desc: 'AI-generated questions' },
];

/* ── Student Dashboard ──────────────────────────────────────────────────────── */
function StudentDashboard({ user, greeting }) {
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [risk, setRisk] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = user?._id || user?.user_id;
    if (!uid) { setLoading(false); return; }
    Promise.all([quizAPI.getPerformance(uid), tutorAPI.risk()])
      .then(([p, r]) => {
        setStats(p.data?.stats || null);
        setHistory(p.data?.history?.slice(0, 10) || []);
        setRisk(r.data || null);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [user]);

  const chartData = [...history].reverse().map((r, i) => ({
    name: `#${i + 1}`,
    score: +(r.accuracy || r.score || 0).toFixed(1),
  }));

  return (
    <div className="page max-w-6xl">
      {/* Greeting */}
      <div className="mb-8">
        <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>{greeting},</p>
        <h1 className="text-3xl font-display font-bold" style={{ color: 'var(--text)' }}>
          {user?.profile?.display_name || user?.username} <span style={{ color: 'var(--text-dim)' }}>👋</span>
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Track your progress, practise smarter, and ace your exams.
        </p>
      </div>

      {/* Risk alert — only medium/high/critical */}
      {risk && risk.risk_level && risk.risk_level !== 'low' && (
        <div className={`glass p-4 mb-6 border ${RISK_BORDER[risk.risk_level] || ''} animate-fade-in`}>
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className={risk.risk_level === 'medium' ? 'text-amber' : 'text-rose'} />
            <div className="flex-1">
              <p className="text-sm font-display font-semibold" style={{ color: 'var(--text)' }}>
                {risk.risk_level === 'critical' ? 'Critical Risk' :
                  risk.risk_level === 'high' ? 'High Risk' : 'Needs Attention'}
              </p>
              {risk.alerts?.[0] && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{risk.alerts[0].message}</p>
              )}
            </div>
            <Link to="/performance" className="btn-ghost text-xs shrink-0">View Details</Link>
          </div>
        </div>
      )}

      {/* Student-only performance stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Trophy} label="Best Score" value={stats?.best_score ? `${stats.best_score.toFixed(1)}%` : '—'} color="text-amber" loading={loading} />
        <StatCard icon={Activity} label="Avg Score" value={stats?.avg_score ? `${stats.avg_score.toFixed(1)}%` : '—'} color="text-neon" loading={loading} />
        <StatCard icon={BookOpen} label="Exams Taken" value={stats?.total_exams || 0} color="text-violet-300" loading={loading} />
        <StatCard icon={CheckCircle} label="Total Correct" value={stats?.total_correct || 0} color="text-emerald" loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {chartData.length > 1 && (
            <div className="glass p-5 animate-fade-in">
              <h2 className="font-display font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
                <TrendingUp size={15} className="text-neon" /> Score Trend
              </h2>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -15 }}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00f5d4" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#00f5d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-dim)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-dim)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip />} />
                  <Area type="monotone" dataKey="score" stroke="#00f5d4" strokeWidth={2} fill="url(#grad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="glass p-5">
            <h2 className="font-display font-semibold mb-4" style={{ color: 'var(--text)' }}>Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {STUDENT_ACTIONS.map(a => (
                <Link key={a.href} to={a.href}
                  className="flex items-center gap-3 p-3.5 rounded-xl border transition-all"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-h)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                  <div className={`w-9 h-9 rounded-xl ${a.bg} flex items-center justify-center shrink-0`}>
                    <a.icon size={16} className={a.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-display font-semibold" style={{ color: 'var(--text)' }}>{a.title}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{a.desc}</p>
                  </div>
                  <ArrowRight size={13} style={{ color: 'var(--text-dim)' }} />
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-sm" style={{ color: 'var(--text)' }}>Recent Exams</h3>
              <Link to="/performance" className="text-xs text-neon hover:underline">See all →</Link>
            </div>
            {loading ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-12 rounded-xl shimmer" />)}</div>
            ) : history.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: 'var(--text-dim)' }}>No exams yet</p>
            ) : (
              <div className="space-y-2">
                {history.slice(0, 5).map((r, i) => {
                  const s = +(r.accuracy || r.score || 0).toFixed(0);
                  return (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ backgroundColor: 'var(--surface)' }}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${s >= 70 ? 'bg-neon/10 text-neon' : s >= 50 ? 'bg-amber/10 text-amber' : 'bg-rose/10 text-rose'}`}>{s}%</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs truncate" style={{ color: 'var(--text)' }}>{r.exam_name || 'Exam'}</p>
                        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>{r.correct_answers}/{r.total_questions} correct</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {risk && (
            <div className={`glass p-5 border ${RISK_BORDER[risk.risk_level || 'unknown']}`}>
              <h3 className="font-display font-semibold text-sm flex items-center gap-2 mb-2" style={{ color: 'var(--text)' }}>
                <Shield size={13} className={risk.risk_level === 'low' ? 'text-emerald' : risk.risk_level === 'medium' ? 'text-amber' : 'text-rose'} />
                Performance Health
              </h3>
              <p className="text-xs capitalize mb-1" style={{ color: 'var(--text-muted)' }}>{risk.risk_level || 'unknown'} risk level</p>
              {risk.pass_probability != null && (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Pass probability: <span className="font-semibold" style={{ color: 'var(--text)' }}>{risk.pass_probability.toFixed(0)}%</span>
                </p>
              )}
              <Link to="/performance" className="btn-ghost text-xs mt-3 w-full justify-center">Full Analysis <ArrowRight size={11} /></Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Institute Dashboard ─────────────────────────────────────────────────────
   Completely different UI — no student performance metrics at all.
   Shows: total exams, total attempts, quick actions, recent exam list.
────────────────────────────────────────────────────────────────────────────── */
function InstituteDashboard({ user, greeting }) {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    instituteAPI.myExams()
      .then(r => setExams(r.data?.exams || []))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  const totalAttempts = exams.reduce((sum, e) => sum + (e.attempt_count || 0), 0);

  return (
    <div className="page max-w-6xl">
      {/* Greeting */}
      <div className="mb-8">
        <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>{greeting},</p>
        <h1 className="text-3xl font-display font-bold flex items-center gap-3 flex-wrap" style={{ color: 'var(--text)' }}>
          {user?.profile?.display_name || user?.username}
          <span className="badge-violet text-sm"><Building2 size={11} /> Institute</span>
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Manage your exams, view class analytics, and generate AI-powered questions.
        </p>
      </div>

      {/* Institute-specific stats — NOT student metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={BookOpen} label="Exams Published" value={exams.length} color="text-neon" loading={loading} />
        <StatCard icon={Users} label="Total Attempts" value={totalAttempts} color="text-violet-300" loading={loading} />
        <StatCard icon={PlusCircle} label="Create Exam" value="→ New" color="text-amber" loading={false} />
        <StatCard icon={BarChart3} label="Analytics" value="→ View" color="text-emerald" loading={false} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">

          {/* Quick actions */}
          <div className="glass p-5">
            <h2 className="font-display font-semibold mb-4" style={{ color: 'var(--text)' }}>Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {INSTITUTE_ACTIONS.map(a => (
                <Link key={a.href} to={a.href}
                  className="flex items-center gap-3 p-3.5 rounded-xl border transition-all"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-h)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                  <div className={`w-9 h-9 rounded-xl ${a.bg} flex items-center justify-center shrink-0`}>
                    <a.icon size={16} className={a.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-display font-semibold" style={{ color: 'var(--text)' }}>{a.title}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{a.desc}</p>
                  </div>
                  <ArrowRight size={13} style={{ color: 'var(--text-dim)' }} />
                </Link>
              ))}
            </div>
          </div>

          {/* Institute tips */}
          <div className="glass p-5" style={{ border: '1px solid rgba(0,245,212,0.12)', background: 'rgba(0,245,212,0.02)' }}>
            <h3 className="font-display font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text)' }}>
              <Brain size={15} className="text-neon" /> AI Exam Creation Tips
            </h3>
            <ul className="space-y-2">
              {[
                'Use the AI generator — enter a topic to create 10–20 questions in seconds.',
                'Enable cheating detection for high-stakes assessments.',
                'Share the Exam ID with students — each student can attempt only once.',
                'Check Analytics after students submit to see class-wide performance instantly.',
              ].map((tip, i) => (
                <li key={i} className="flex gap-2 items-start text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span className="text-neon font-bold shrink-0 mt-0.5">•</span>{tip}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right: recent exams with copy + analytics */}
        <div className="glass p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-sm" style={{ color: 'var(--text)' }}>Recent Exams</h3>
            <Link to="/institute/exams" className="text-xs text-neon hover:underline">See all →</Link>
          </div>

          {loading ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl shimmer" />)}</div>
          ) : exams.length === 0 ? (
            <div className="text-center py-6">
              <BookOpen size={32} className="mx-auto mb-2" style={{ color: 'var(--text-dim)' }} />
              <p className="text-xs mb-3" style={{ color: 'var(--text-dim)' }}>No exams yet</p>
              <Link to="/institute/create" className="btn-primary text-xs py-2">
                <PlusCircle size={12} /> Create First Exam
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {exams.slice(0, 5).map((ex, i) => (
                <div key={ex._id || i} className="p-3 rounded-xl" style={{ backgroundColor: 'var(--surface)' }}>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-sm font-display font-semibold truncate flex-1" style={{ color: 'var(--text)' }}>{ex.name}</p>
                    <span className="badge-grey text-xs shrink-0 flex items-center gap-1">
                      <Users size={9} /> {ex.attempt_count || 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="font-mono text-xs truncate flex-1" style={{ color: 'var(--text-dim)' }}>{ex.exam_id}</span>
                    <button onClick={() => { navigator.clipboard.writeText(ex.exam_id); toast.success('Exam ID copied!'); }}
                      className="p-1 rounded transition-colors" style={{ color: 'var(--text-dim)' }} title="Copy">
                      <Copy size={11} />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/institute/analytics?examId=${ex.exam_id}`}
                      className="text-xs flex items-center gap-1 transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#00f5d4'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                      <BarChart3 size={11} /> Analytics
                    </Link>
                    <span style={{ color: 'var(--border)' }}>|</span>
                    <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-dim)' }}>
                      <Clock size={11} /> {ex.duration}m
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Root export ─────────────────────────────────────────────────────────────
   Renders the appropriate dashboard based on the authenticated user's role.
────────────────────────────────────────────────────────────────────────────── */
export default function Dashboard() {
  usePageTitle('Dashboard');
  const { user } = useAuth();

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  })();

  return (
    <Layout>
      {user?.role === 'institute'
        ? <InstituteDashboard user={user} greeting={greeting} />
        : <StudentDashboard user={user} greeting={greeting} />
      }
    </Layout>
  );
}