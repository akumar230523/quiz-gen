/**
 * Recommendations.jsx  ─  AI-powered study recommendations
 */

import { useState, useEffect } from 'react';
import Layout from '@/components/common/Layout';
import Spinner from '@/components/common/Spinner';
import { tutorAPI, getErrMsg } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Zap, BookOpen, Video, FileText, Brain, Clock, Calendar, CheckCircle, TrendingUp, Star, RefreshCw, Target } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/hooks/usePageTitle';

const LEARNING_STYLES = [
  { value: 'visual',      label: 'Visual',   icon: '👁️', desc: 'Diagrams, videos' },
  { value: 'reading',     label: 'Reading',  icon: '📖', desc: 'Articles, books' },
  { value: 'kinesthetic', label: 'Practice', icon: '✍️', desc: 'Exercises, tests' },
  { value: 'auditory',    label: 'Auditory', icon: '🎧', desc: 'Lectures, audio' },
];

const EXAM_TYPES = ['JEE Main','NEET','UPSC CSE','CAT','GATE','SSC CGL','SAT','GRE','IELTS','General'];
const EFF_BADGE  = { high: 'badge-emerald', medium: 'badge-amber', low: 'badge-grey' };
const TYPE_ICON  = { video:'📹', article:'📄', flashcard:'🃏', exercise:'✏️', mock_test:'📝' };

export default function Recommendations() {
  usePageTitle('Recommendations');
  const [recs,    setRecs]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [style,   setStyle]   = useState('visual');
  const [examType,setExamType]= useState('General');
  const [tab,     setTab]     = useState('resources');

  async function generate(autoLoad = false) {
    setLoading(true);
    try {
      const res = await tutorAPI.recommendations({ learning_style: style, exam_type: examType });
      setRecs(res.data);
      if (!autoLoad) toast.success('Recommendations updated!');
    } catch (err) {
      toast.error(getErrMsg(err));
    } finally { setLoading(false); }
  }

  useEffect(() => { generate(true); }, []);

  return (
    <Layout>
      <div className="page max-w-5xl">
        <div className="mb-8">
          <div className="badge-violet inline-flex mb-3"><Zap size={11} /> AI-Powered</div>
          <h1 className="text-3xl font-display font-bold mb-1" style={{ color: 'var(--text)' }}>Smart Recommendations</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Personalised study resources and strategy based on your performance</p>
        </div>

        {/* Config */}
        <div className="glass p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div>
              <label className="label">Learning Style</label>
              <div className="grid grid-cols-2 gap-2">
                {LEARNING_STYLES.map(s => (
                  <button key={s.value} onClick={() => setStyle(s.value)}
                    className="p-3 rounded-xl border text-left transition-all"
                    style={style === s.value
                      ? { backgroundColor: 'rgba(0,245,212,0.08)', borderColor: 'rgba(0,245,212,0.4)', color: '#00f5d4' }
                      : { backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                    <span className="text-lg block">{s.icon}</span>
                    <p className="text-xs font-display font-semibold mt-1" style={{ color: style === s.value ? '#00f5d4' : 'var(--text)' }}>{s.label}</p>
                    <p className="text-xs" style={{ color: 'var(--text-dim)' }}>{s.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Target Exam</label>
              <select className="select mb-4" value={examType} onChange={e => setExamType(e.target.value)}>
                {EXAM_TYPES.map(e => <option key={e}>{e}</option>)}
              </select>
              {recs?.milestone && (
                <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(0,245,212,0.05)', border: '1px solid rgba(0,245,212,0.12)' }}>
                  <p className="text-sm" style={{ color: '#00f5d4' }}>{recs.milestone}</p>
                </div>
              )}
            </div>
          </div>

          <button onClick={() => generate(false)} disabled={loading} className="btn-primary">
            {loading ? <><Spinner size="sm" color="dark" /> Generating…</> : <><RefreshCw size={15} /> Regenerate</>}
          </button>

          {recs?.motivational_message && (
            <div className="mt-4 p-3 rounded-xl" style={{ backgroundColor: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.12)' }}>
              <p className="text-sm font-body italic text-violet-300">💬 {recs.motivational_message}</p>
            </div>
          )}
        </div>

        {loading && <div className="flex justify-center py-16"><Spinner size="lg" /></div>}

        {recs && !loading && (
          <>
            {recs.priority_topics?.length > 0 && (
              <div className="glass p-5 mb-5">
                <h2 className="font-display font-semibold flex items-center gap-2 mb-3" style={{ color: 'var(--text)' }}>
                  <Target size={15} className="text-rose" /> Priority Topics
                </h2>
                <div className="flex flex-wrap gap-2">
                  {recs.priority_topics.map((t, i) => (
                    <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm ${i === 0 ? 'bg-rose/10 border-rose/30 text-rose' : i === 1 ? 'bg-amber/10 border-amber/30 text-amber' : ''}`}
                      style={i > 1 ? { backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-muted)' } : {}}>
                      <span className="font-bold text-xs">#{i+1}</span> {t}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-xl mb-5 w-fit" style={{ backgroundColor: 'var(--surface)' }}>
              {[{ id: 'resources', label: 'Resources', icon: BookOpen }, { id: 'plan', label: 'Weekly Plan', icon: Calendar }, { id: 'strategies', label: 'Strategies', icon: Brain }].map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-display font-semibold transition-all ${tab === t.id ? 'bg-neon text-ink' : ''}`}
                  style={tab !== t.id ? { color: 'var(--text-muted)' } : {}}>
                  <t.icon size={13} /> {t.label}
                </button>
              ))}
            </div>

            {/* Resources */}
            {tab === 'resources' && (
              <div className="space-y-3">
                {recs.resources?.length > 0 ? recs.resources.map((r, i) => (
                  <div key={i} className="glass p-5 flex items-start gap-4">
                    <div className="text-2xl shrink-0">{TYPE_ICON[r.type] || '📚'}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <h3 className="font-display font-semibold text-sm" style={{ color: 'var(--text)' }}>{r.title}</h3>
                        <div className="flex gap-2 shrink-0">
                          {r.effectiveness && <span className={`badge text-xs ${EFF_BADGE[r.effectiveness] || 'badge-grey'}`}>{r.effectiveness}</span>}
                        </div>
                      </div>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{r.topic}</p>
                      {r.why_recommended && <p className="text-xs mt-1.5 italic" style={{ color: 'var(--text-dim)' }}>{r.why_recommended}</p>}
                      {r.estimated_time && <p className="flex items-center gap-1 text-xs mt-2" style={{ color: 'var(--text-dim)' }}><Clock size={10} /> {r.estimated_time}</p>}
                    </div>
                  </div>
                )) : <p className="text-sm text-center py-8" style={{ color: 'var(--text-dim)' }}>No resources generated yet. Click Regenerate.</p>}
              </div>
            )}

            {/* Weekly plan */}
            {tab === 'plan' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recs.weekly_plan?.length > 0 ? recs.weekly_plan.map((day, i) => (
                  <div key={i} className="glass p-5 border-l-2" style={{ borderLeftColor: i < 3 ? '#00f5d4' : i === 6 ? '#10b981' : '#7c3aed' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-display font-bold text-sm" style={{ color: 'var(--text)' }}>{day.day}</span>
                    </div>
                    <p className="text-sm mb-1" style={{ color: 'var(--text)' }}>{day.focus}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{day.activity}</p>
                    {day.duration_minutes && <p className="flex items-center gap-1 text-xs mt-2" style={{ color: 'var(--text-dim)' }}><Clock size={10} /> {day.duration_minutes} min</p>}
                  </div>
                )) : <p className="col-span-2 text-sm text-center py-8" style={{ color: 'var(--text-dim)' }}>Weekly plan will appear here after generating.</p>}
              </div>
            )}

            {/* Strategies */}
            {tab === 'strategies' && (
              <div className="space-y-4">
                {recs.study_strategies?.length > 0 ? recs.study_strategies.map((s, i) => (
                  <div key={i} className="glass p-6 flex gap-4">
                    <div className="text-2xl shrink-0">{i === 0 ? '🔁' : i === 1 ? '💡' : i === 2 ? '🗺️' : '🎯'}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-display font-semibold" style={{ color: 'var(--text)' }}>{s.strategy}</h3>
                        {s.effectiveness && <span className={`badge text-xs ${EFF_BADGE[s.effectiveness] || 'badge-grey'}`}>{s.effectiveness}</span>}
                      </div>
                      <p className="text-sm font-body" style={{ color: 'var(--text-muted)' }}>{s.description}</p>
                      {s.time_required && <p className="flex items-center gap-1 text-xs mt-2" style={{ color: 'var(--text-dim)' }}><Clock size={10} /> {s.time_required}</p>}
                    </div>
                  </div>
                )) : <p className="text-sm text-center py-8" style={{ color: 'var(--text-dim)' }}>Strategies will appear after generating.</p>}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
