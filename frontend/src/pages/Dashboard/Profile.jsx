/**
 * Profile.jsx
 * Same base layout for both Student and Institute.
 * - Shared: glass card, avatar + color picker, display name, email, username (read-only), save button
 * - Student extra: performance stats row + topic mastery bars
 * - Institute extra: exam stats row + recent exams list
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Layout from '@/components/common/Layout';
import { authAPI, quizAPI, instituteAPI, getErrMsg } from '@/services/api';
import Spinner from '@/components/common/Spinner';
import StatCard from '@/components/ui/StatCard';
import {
  User, Mail, Shield, Save, Calendar, Trophy, BookOpen,
  Target, Building2, BarChart3, Users, CheckCircle,
  TrendingUp, Clock, Copy,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/hooks/usePageTitle';

const AVATAR_COLORS = [
  '#7c3aed', '#00f5d4', '#f43f5e', '#f59e0b',
  '#10b981', '#3b82f6', '#ec4899', '#8b5cf6',
];

export default function Profile() {
  usePageTitle('Profile');
  const { user, refreshUser } = useAuth();

  // ── Form state ──────────────────────────────────────────────────────────
  const [displayName, setDisplayName] = useState('');
  const [email,       setEmail]       = useState('');
  const [avatarColor, setAvatarColor] = useState('#7c3aed');
  const [saving,      setSaving]      = useState(false);

  // ── Student data ────────────────────────────────────────────────────────
  const [stats,        setStats]        = useState(null);
  const [breakdown,    setBreakdown]    = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);

  // ── Institute data ──────────────────────────────────────────────────────
  const [exams,        setExams]        = useState([]);
  const [examsLoading, setExamsLoading] = useState(true);

  // Sync form fields when user loads
  useEffect(() => {
    if (!user) return;
    setDisplayName(user.profile?.display_name || user.username || '');
    setEmail(user.email || '');
    setAvatarColor(user.profile?.avatar_color || '#7c3aed');
  }, [user]);

  // Load role-specific data
  useEffect(() => {
    if (!user) return;
    if (user.role === 'institute') {
      instituteAPI.myExams()
        .then(r => setExams(r.data?.exams || []))
        .catch(() => {})
        .finally(() => setExamsLoading(false));
    } else {
      const uid = user._id || user.user_id;
      if (!uid) { setStatsLoading(false); return; }
      quizAPI.getPerformance(uid)
        .then(r => {
          setStats(r.data?.stats || {});
          setBreakdown(r.data?.breakdown || []);
        })
        .catch(() => {})
        .finally(() => setStatsLoading(false));
    }
  }, [user]);

  async function handleSave() {
    setSaving(true);
    try {
      await authAPI.updateProfile({
        profile: { display_name: displayName, avatar_color: avatarColor },
        email: email || undefined,
      });
      await refreshUser();
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error(getErrMsg(err));
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return (
      <Layout>
        <div className="page-center"><Spinner size="lg" /></div>
      </Layout>
    );
  }

  const isInstitute  = user.role === 'institute';
  const initial      = (displayName || user.username || '?')[0].toUpperCase();
  const memberSince  = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    : '—';

  // Student derived values
  const avg     = stats?.avg_score    || 0;
  const best    = stats?.best_score   || 0;
  const total   = stats?.total_exams  || 0;
  const correct = stats?.total_correct || 0;
  const strongTopics = breakdown.filter(t => t.mastery === 'high').slice(0, 4);
  const weakTopics   = breakdown.filter(t => t.mastery === 'low').slice(0, 4);

  // Institute derived values
  const totalAttempts = exams.reduce((s, e) => s + (e.attempt_count || 0), 0);

  return (
    <Layout>
      <div className="page max-w-3xl">
        <h1 className="text-3xl font-display font-bold mb-2" style={{ color: 'var(--text)' }}>
          My Profile
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
          Manage your account and preferences
        </p>

        {/* ── Stats row ─────────────────────────────────────────────────── */}
        {isInstitute ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard icon={BookOpen}  label="Exams Published" value={examsLoading ? '…' : exams.length}        color="text-neon"       loading={examsLoading} />
            <StatCard icon={Users}     label="Total Attempts"  value={examsLoading ? '…' : totalAttempts}        color="text-violet-300" loading={examsLoading} />
            <StatCard icon={Building2} label="Role"            value="Institute"                                  color="text-amber"      loading={false} />
            <StatCard icon={Calendar}  label="Member Since"    value={memberSince}                                color="text-emerald"    loading={false} />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard icon={BookOpen}    label="Exams Taken"   value={statsLoading ? '…' : total}                           color="text-violet-300" loading={statsLoading} />
            <StatCard icon={Trophy}      label="Best Score"    value={statsLoading ? '…' : best  ? `${best.toFixed(0)}%`  : '—'} color="text-amber"      loading={statsLoading} />
            <StatCard icon={Target}      label="Avg Score"     value={statsLoading ? '…' : avg   ? `${avg.toFixed(0)}%`   : '—'} color="text-neon"       loading={statsLoading} />
            <StatCard icon={Calendar}   label="Member Since"   value={memberSince}                                           color="text-emerald"    loading={false} />
          </div>
        )}

        {/* ── Main profile card ──────────────────────────────────────────── */}
        <div className="glass p-8 space-y-6">

          {/* Avatar + name header */}
          <div className="flex items-center gap-5 flex-wrap">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-display font-black text-white shrink-0 transition-colors duration-300"
              style={{ backgroundColor: avatarColor }}
            >
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-display font-bold" style={{ color: 'var(--text)' }}>
                {displayName || user.username}
              </h2>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                @{user.username}
              </p>
              <span className="badge-violet mt-2 inline-flex">
                {isInstitute ? <Building2 size={10} className="mr-1" /> : <User size={10} className="mr-1" />}
                {user.role}
              </span>
            </div>
          </div>

          {/* Avatar colour picker */}
          <div>
            <p className="label">Avatar Colour</p>
            <div className="flex gap-2 flex-wrap">
              {AVATAR_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setAvatarColor(c)}
                  className="w-8 h-8 rounded-lg transition-all duration-200"
                  style={{
                    backgroundColor: c,
                    outline: avatarColor === c ? `3px solid ${c}` : 'none',
                    outlineOffset: '2px',
                    transform: avatarColor === c ? 'scale(1.1)' : 'scale(1)',
                  }}
                  aria-label={`Avatar color ${c}`}
                />
              ))}
            </div>
          </div>

          <div className="divider" />

          {/* Editable fields */}
          <div>
            <label className="label">Display Name</label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} />
              <input
                className="input pl-10"
                placeholder="Your display name"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label">Email</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} />
              <input
                className="input pl-10"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label">Username</label>
            <div className="relative">
              <Shield size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} />
              <input
                className="input pl-10 opacity-50 cursor-not-allowed"
                value={user.username}
                readOnly
                disabled
              />
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
              Username cannot be changed after registration.
            </p>
          </div>

          {/* Save button */}
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving
              ? <><Spinner size="sm" color="dark" /> Saving…</>
              : <><Save size={15} /> Save Changes</>
            }
          </button>
        </div>

        {/* ── Role-specific extra section ────────────────────────────────── */}
        {isInstitute ? (
          /* Institute: recent exams list */
          <div className="glass p-8 mt-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-semibold text-lg" style={{ color: 'var(--text)' }}>
                Published Exams
              </h3>
              {/* <a href="/institute/exams" className="text-xs text-neon hover:underline">Manage all →</a> */}
            </div>

            {examsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-xl shimmer" />)}
              </div>
            ) : exams.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen size={32} className="mx-auto mb-2" style={{ color: 'var(--text-dim)' }} />
                <p className="text-sm mb-4" style={{ color: 'var(--text-dim)' }}>No exams published yet.</p>
                <a href="/institute/create" className="btn-primary text-sm inline-flex">Create First Exam</a>
              </div>
            ) : (
              <div className="space-y-3">
                {exams.slice(0, 5).map((ex, i) => (
                  <div key={ex._id || i} className="flex items-center gap-4 p-4 rounded-xl"
                    style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <div className="w-10 h-10 rounded-xl bg-neon/10 flex items-center justify-center shrink-0">
                      <BookOpen size={16} className="text-neon" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{ex.name}</p>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>{ex.exam_id}</span>
                        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-dim)' }}>
                          <Users size={10} /> {ex.attempt_count || 0}
                        </span>
                        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-dim)' }}>
                          <Clock size={10} /> {ex.duration}m
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => { navigator.clipboard.writeText(ex.exam_id); toast.success('Exam ID copied!'); }}
                      className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-dim)' }}
                      title="Copy Exam ID">
                      <Copy size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Student: topic mastery */
          (strongTopics.length > 0 || weakTopics.length > 0) && (
            <div className="glass p-8 mt-5">
              <h3 className="font-display font-semibold text-lg mb-5" style={{ color: 'var(--text)' }}>
                Topic Mastery
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {strongTopics.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-3 text-neon">Strong Areas</p>
                    <div className="space-y-3">
                      {strongTopics.map((t, i) => (
                        <div key={i}>
                          <div className="flex justify-between text-xs mb-1">
                            <span style={{ color: 'var(--text-muted)' }}>{t.topic}</span>
                            <span className="font-semibold text-neon">{t.accuracy}%</span>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                            <div className="h-full rounded-full bg-neon transition-all duration-700" style={{ width: `${t.accuracy}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {weakTopics.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-3 text-rose">Needs Work</p>
                    <div className="space-y-3">
                      {weakTopics.map((t, i) => (
                        <div key={i}>
                          <div className="flex justify-between text-xs mb-1">
                            <span style={{ color: 'var(--text-muted)' }}>{t.topic}</span>
                            <span className="font-semibold text-rose">{t.accuracy}%</span>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                            <div className="h-full rounded-full bg-rose transition-all duration-700" style={{ width: `${t.accuracy}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </div>
    </Layout>
  );
}