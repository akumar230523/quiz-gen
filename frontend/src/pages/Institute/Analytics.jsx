/**
 * Analytics.jsx  ─  Institute exam analytics
 * Fix: auto-loads institute's own exams in a dropdown + manual ID search
 */
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '@/components/common/Layout';
import Spinner from '@/components/common/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import StatCard from '@/components/ui/StatCard';
import { instituteAPI, getErrMsg } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Search, Users, TrendingUp, Trophy, CheckCircle, BarChart3, XCircle, ChevronDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/hooks/usePageTitle';

function CT({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return <div className="glass px-3 py-2 text-xs"><p style={{ color: 'var(--text-muted)' }} className="mb-1">{label}</p><p className="text-neon font-semibold">{payload[0]?.value}</p></div>;
}

export default function Analytics() {
  usePageTitle('Analytics');
  const { user }  = useAuth();
  const [params]  = useSearchParams();

  const [myExams,      setMyExams]      = useState([]);
  const [examsLoading, setExamsLoading] = useState(true);
  const [examId,       setExamId]       = useState(params.get('examId') || '');
  const [manualId,     setManualId]     = useState('');
  const [data,         setData]         = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Load institute's own exams
  useEffect(() => {
    if (user?.role === 'institute') {
      instituteAPI.myExams()
        .then(r => {
          const exams = r.data?.exams || [];
          setMyExams(exams);
          // If URL param given, use it; else pre-select first exam
          const urlExamId = params.get('examId');
          if (urlExamId) {
            setExamId(urlExamId);
          } else if (exams.length > 0) {
            setExamId(exams[0].exam_id);
          }
        })
        .catch(() => {})
        .finally(() => setExamsLoading(false));
    } else {
      setExamsLoading(false);
    }
  }, [user]);

  // Auto-fetch when URL has examId
  useEffect(() => {
    const urlExamId = params.get('examId');
    if (urlExamId && !data) {
      fetchAnalytics(urlExamId);
    }
  }, [myExams]);

  async function fetchAnalytics(id) {
    const target = id || examId || manualId;
    if (!target?.trim()) { toast.error('Select or enter an exam ID'); return; }
    setLoading(true); setData(null);
    try {
      const res = await instituteAPI.getAnalytics(target.trim());
      setData(res.data.analytics || res.data);
    } catch (err) {
      toast.error(getErrMsg(err));
    } finally { setLoading(false); }
  }

  const selectedExamInfo = myExams.find(e => e.exam_id === examId);
  const a = data;

  return (
    <Layout>
      <div className="page">
        <h1 className="text-3xl font-display font-bold mb-1" style={{ color: 'var(--text)' }}>Exam Analytics</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>View class performance for your published exams.</p>

        {/* Selector card */}
        <div className="glass p-6 mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* My exams dropdown */}
            {user?.role === 'institute' && (
              <div>
                <label className="label">Your Exams</label>
                {examsLoading ? (
                  <div className="h-12 rounded-xl shimmer" />
                ) : myExams.length === 0 ? (
                  <div className="p-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                    No exams published yet — <a href="/institute/create" className="text-neon">create one</a>.
                  </div>
                ) : (
                  <div className="relative">
                    <button
                      onClick={() => setShowDropdown(d => !d)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all"
                      style={{ backgroundColor: 'var(--surface)', border: `1px solid ${selectedExamInfo ? 'rgba(0,245,212,0.3)' : 'var(--border)'}`, color: 'var(--text)' }}>
                      <span className="truncate text-left">
                        {selectedExamInfo
                          ? <><span className="font-semibold">{selectedExamInfo.name}</span> <span style={{ color: 'var(--text-dim)' }}>({selectedExamInfo.exam_id})</span></>
                          : <span style={{ color: 'var(--text-muted)' }}>Select your exam…</span>}
                      </span>
                      <ChevronDown size={14} className={`shrink-0 ml-2 transition-transform ${showDropdown ? 'rotate-180' : ''}`} style={{ color: 'var(--text-muted)' }} />
                    </button>
                    {showDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 glass rounded-xl py-1 z-30 shadow-xl max-h-64 overflow-y-auto">
                        {myExams.map(ex => (
                          <button key={ex.exam_id}
                            onClick={() => { setExamId(ex.exam_id); setData(null); setShowDropdown(false); }}
                            className="w-full text-left px-4 py-3 text-sm flex items-center justify-between gap-3 transition-all"
                            style={{ backgroundColor: ex.exam_id === examId ? 'rgba(0,245,212,0.06)' : 'transparent', color: ex.exam_id === examId ? '#00f5d4' : 'var(--text)' }}
                            onMouseEnter={e => ex.exam_id !== examId && (e.currentTarget.style.backgroundColor = 'var(--surface)')}
                            onMouseLeave={e => ex.exam_id !== examId && (e.currentTarget.style.backgroundColor = 'transparent')}>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold truncate">{ex.name}</p>
                              <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{ex.exam_id}</p>
                            </div>
                            <span className="text-xs shrink-0 flex items-center gap-1" style={{ color: 'var(--text-dim)' }}>
                              <Users size={10} /> {ex.attempt_count || 0}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Manual ID search */}
            <div>
              <label className="label">Search Any Exam by ID</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} />
                  <input className="input pl-9 text-sm" placeholder="Enter Exam ID…"
                    value={manualId}
                    onChange={e => setManualId(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && fetchAnalytics(manualId)} />
                </div>
                <button onClick={() => fetchAnalytics(manualId)} disabled={loading || !manualId.trim()} className="btn-secondary shrink-0 text-sm">
                  Search
                </button>
              </div>
            </div>
          </div>

          {/* Primary action button */}
          <button
            onClick={() => fetchAnalytics(examId || manualId)}
            disabled={loading || (!examId && !manualId)}
            className="btn-primary text-sm">
            {loading ? <><Spinner size="sm" color="dark" /> Loading…</> : <><BarChart3 size={14} /> Load Analytics</>}
          </button>
        </div>

        {loading && <div className="flex justify-center py-20"><Spinner size="lg" /></div>}

        {a && !loading && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h2 className="font-display font-semibold text-xl" style={{ color: 'var(--text)' }}>{a.exam_name}</h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{a.institute_name}{a.subject ? ` · ${a.subject}` : ''}</p>
            </div>

            {a.total_students === 0 ? (
              <EmptyState icon={Users} title="No attempts yet"
                desc="No students have attempted this exam yet. Share the Exam ID with your students." />
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard icon={Users}       label="Students"  value={a.total_students}                          color="text-neon" />
                  <StatCard icon={TrendingUp}  label="Avg Score" value={`${(a.average_score || 0).toFixed(1)}%`}   color="text-violet-300" />
                  <StatCard icon={Trophy}      label="Highest"   value={`${(a.highest_score || 0).toFixed(1)}%`}   color="text-amber" />
                  <StatCard icon={CheckCircle} label="Pass Rate" value={`${(a.pass_percentage || 0).toFixed(1)}%`} color="text-emerald" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="glass p-6">
                    <h3 className="font-display font-semibold mb-4" style={{ color: 'var(--text)' }}>Score Distribution</h3>
                    {a.score_distribution?.length ? (
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={a.score_distribution} margin={{ left: -20, right: 0 }}>
                          <XAxis dataKey="range" tick={{ fill: 'var(--text-dim)', fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 10 }} axisLine={false} tickLine={false} />
                          <Tooltip content={<CT />} />
                          <Bar dataKey="count" fill="#7c3aed" radius={[4,4,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <p className="text-sm text-center py-10" style={{ color: 'var(--text-dim)' }}>No distribution data</p>}
                  </div>

                  <div className="glass p-6">
                    <h3 className="font-display font-semibold mb-4" style={{ color: 'var(--text)' }}>Pass / Fail</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={[{ name: 'Pass', value: a.pass_count || 0 }, { name: 'Fail', value: a.fail_count || 0 }]}
                          cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                          <Cell fill="#00f5d4" /><Cell fill="#f43f5e" />
                        </Pie>
                        <Tooltip />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {a.student_results?.length > 0 && (
                  <div className="glass p-6">
                    <h3 className="font-display font-semibold mb-4" style={{ color: 'var(--text)' }}>
                      Student Results <span className="badge-grey ml-2">{a.student_results.length}</span>
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border)' }}>
                            {['Rank', 'Student', 'Score', 'Status', 'Time'].map(h => (
                              <th key={h} className="text-left px-3 py-2 text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {a.student_results.map((s, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}
                              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--surface)'}
                              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                              <td className="px-3 py-3 text-sm" style={{ color: 'var(--text-dim)' }}>#{i+1}</td>
                              <td className="px-3 py-3">
                                <div className="font-semibold" style={{ color: 'var(--text)' }}>{s.student_name}</div>
                                <div className="text-xs" style={{ color: 'var(--text-dim)' }}>{s.student_id}</div>
                              </td>
                              <td className="px-3 py-3">
                                <span className={`font-display font-bold ${s.score >= 70 ? 'text-neon' : s.score >= 40 ? 'text-amber' : 'text-rose'}`}>{s.score}%</span>
                              </td>
                              <td className="px-3 py-3">
                                <span className={`badge text-xs ${s.status === 'pass' ? 'badge-emerald' : 'badge-rose'}`}>
                                  {s.status === 'pass' ? <CheckCircle size={10} /> : <XCircle size={10} />} {s.status}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-sm" style={{ color: 'var(--text-dim)' }}>{s.time_taken ? `${s.time_taken}m` : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {!a && !loading && (
          <EmptyState icon={BarChart3} title="Select an exam to view analytics"
            desc="Choose one of your published exams from the dropdown above, or enter an exam ID to search." />
        )}
      </div>
    </Layout>
  );
}