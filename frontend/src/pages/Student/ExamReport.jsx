/**
 * ExamReport.jsx  ─  Institute exam result report (no login needed)
 */
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { studentAPI } from '@/services/api';
import Spinner from '@/components/common/Spinner';
import { Trophy, CheckCircle, XCircle, Clock, BookOpen, TrendingUp, Lightbulb, ArrowRight, Zap, Brain, Award } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';

function GradeBadge({ grade, pct }) {
  const colors = { 'A+': '#00f5d4', A: '#00f5d4', 'B+': '#b8aaff', B: '#b8aaff', C: '#f59e0b', F: '#f43f5e' };
  const c = colors[grade] || '#ffffff';
  return (
    <div className="w-32 h-32 rounded-full mx-auto flex flex-col items-center justify-center shadow-xl" style={{ border: `4px solid ${c}` }}>
      <span className="text-4xl font-display font-black" style={{ color: c }}>{grade}</span>
      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{pct?.toFixed(1)}%</span>
    </div>
  );
}

export default function ExamReport() {
  const { reportId } = useParams();
  const [report,  setReport]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [tab,     setTab]     = useState('summary');
  usePageTitle('Exam Report');

  useEffect(() => {
    studentAPI.getReport(reportId)
      .then(r => setReport(r.data?.report || r.data))
      .catch(() => setError('Report not found or failed to load.'))
      .finally(() => setLoading(false));
  }, [reportId]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center flex-col gap-4" style={{ backgroundColor: 'var(--bg)' }}>
      <Spinner size="lg" /><p className="text-sm" style={{ color: 'var(--text-muted)' }}>Generating your report…</p>
    </div>
  );

  if (error || !report) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="glass p-8 max-w-sm text-center">
        <XCircle size={36} className="text-rose mx-auto mb-3" />
        <p className="text-rose mb-5">{error || 'Report not found'}</p>
        <Link to="/" className="btn-primary justify-center">Go Home</Link>
      </div>
    </div>
  );

  const perf    = report.performance || {};
  const pct     = perf.marks_percentage || 0;
  const grade   = perf.grade || (pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : 'F');
  const passed  = perf.passed ?? pct >= 40;
  const answers = report.answers_analysis || [];
  const correct = answers.filter(a => a.is_correct === true).length;

  const TABS = [
    { id: 'summary',  label: 'Summary',       icon: Award },
    { id: 'answers',  label: 'Answer Review',  icon: BookOpen },
    { id: 'insights', label: 'AI Insights',    icon: Brain },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="orb w-96 h-96 bg-neon/8 -top-24 -left-24 fixed pointer-events-none" />
      <div className="max-w-2xl mx-auto px-4 py-10 relative z-10">
        {/* Hero */}
        <div className="glass p-8 text-center mb-5 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{ background: passed ? 'radial-gradient(ellipse at 50% 0%, rgba(0,245,212,0.06) 0%, transparent 70%)' : 'radial-gradient(ellipse at 50% 0%, rgba(244,63,94,0.06) 0%, transparent 70%)' }} />
          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--text-dim)' }}>{report.institute_name}</p>
          <p className="font-display font-bold text-lg mb-6" style={{ color: 'var(--text)' }}>{report.exam_name}</p>
          <GradeBadge grade={grade} pct={pct} />
          <div className="mt-5">
            <span className={`inline-flex items-center gap-2 px-5 py-2 rounded-full font-display font-bold text-sm ${passed ? 'bg-neon/15 text-neon border border-neon/30' : 'bg-rose/15 text-rose border border-rose/30'}`}>
              {passed ? <CheckCircle size={14} /> : <XCircle size={14} />} {passed ? 'PASSED' : 'FAILED'}
            </span>
          </div>
          <div className="flex justify-center gap-8 mt-7">
            {[{ v: correct, l: 'Correct', c: 'text-neon' }, { v: answers.length - correct, l: 'Wrong', c: 'text-rose' }, { v: answers.length, l: 'Total', c: '' }].map(s => (
              <div key={s.l} className="text-center">
                <p className={`text-xl font-display font-bold ${s.c}`} style={!s.c ? { color: 'var(--text-muted)' } : {}}>{s.v}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl mb-5 w-full" style={{ backgroundColor: 'var(--surface)' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-display font-semibold transition-all ${tab === t.id ? 'bg-neon text-ink' : ''}`}
              style={tab !== t.id ? { color: 'var(--text-muted)' } : {}}>
              <t.icon size={12} />{t.label}
            </button>
          ))}
        </div>

        {/* Summary */}
        {tab === 'summary' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Trophy,      label: 'Score',    value: `${pct.toFixed(1)}%`,           color: 'text-amber' },
                { icon: CheckCircle, label: 'Correct',  value: perf.correct_answers || correct, color: 'text-neon' },
                { icon: BookOpen,    label: 'Questions',value: perf.total_questions || answers.length, color: 'text-violet-300' },
                { icon: Clock,       label: 'Time',     value: perf.time_taken ? `${perf.time_taken}m` : '—', color: 'text-emerald' },
              ].map(s => (
                <div key={s.label} className="glass p-5 text-center">
                  <s.icon size={20} className={`${s.color} mx-auto mb-2`} />
                  <p className="text-2xl font-display font-bold" style={{ color: 'var(--text)' }}>{s.value}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
                </div>
              ))}
            </div>
            {report.study_plan && (
              <div className="glass p-5">
                <h3 className="font-display font-semibold mb-3" style={{ color: 'var(--text)' }}>Recommended Study Plan</h3>
                <div className="space-y-2">
                  {[{ l: 'Today', v: report.study_plan.immediate, c: 'rgba(0,245,212,0.06)' }, { l: 'This Week', v: report.study_plan.short_term, c: 'rgba(124,58,237,0.06)' }, { l: 'This Month', v: report.study_plan.long_term, c: 'rgba(245,158,11,0.06)' }].filter(p => p.v).map(p => (
                    <div key={p.l} className="p-3 rounded-xl" style={{ backgroundColor: p.c }}>
                      <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-dim)' }}>{p.l}</p>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{p.v}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Answers */}
        {tab === 'answers' && (
          <div className="space-y-3">
            {answers.length === 0 ? <p className="text-center py-8" style={{ color: 'var(--text-dim)' }}>No breakdown available.</p>
            : answers.map((a, i) => (
              <div key={i} className="glass p-4 border" style={{ borderColor: a.is_correct === true ? 'rgba(0,245,212,0.15)' : 'rgba(244,63,94,0.15)' }}>
                <div className="flex items-start gap-3">
                  {a.is_correct === true ? <CheckCircle size={15} className="text-neon shrink-0 mt-0.5" /> : <XCircle size={15} className="text-rose shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-relaxed mb-1" style={{ color: 'var(--text)' }}>{a.question_text}</p>
                    {!a.is_correct && a.correct_answer != null && (
                      <p className="text-xs text-neon/70">✓ Correct: Option {typeof a.correct_answer === 'number' ? a.correct_answer + 1 : a.correct_answer}</p>
                    )}
                    {a.topic && <span className="text-xs" style={{ color: 'var(--text-dim)' }}>{a.topic}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Insights */}
        {tab === 'insights' && (
          <div className="space-y-4">
            {report.insights?.length > 0 && (
              <div className="glass p-5">
                <h3 className="font-display font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
                  <Lightbulb size={15} className="text-amber" /> AI Insights
                </h3>
                <div className="space-y-3">
                  {report.insights.map((ins, i) => (
                    <div key={i} className="flex gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--surface)' }}>
                      <div className="w-5 h-5 rounded-full bg-amber/15 text-amber flex items-center justify-center text-xs font-bold shrink-0">{i+1}</div>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{ins}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {report.recommendations?.length > 0 && (
              <div className="glass p-5">
                <h3 className="font-display font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
                  <TrendingUp size={15} className="text-neon" /> Recommendations
                </h3>
                <div className="space-y-2">
                  {report.recommendations.map((r, i) => (
                    <div key={i} className="flex gap-3 p-3 rounded-xl" style={{ backgroundColor: 'rgba(0,245,212,0.04)', border: '1px solid rgba(0,245,212,0.1)' }}>
                      <Zap size={12} className="text-neon shrink-0 mt-0.5" />
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{r}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!report.insights?.length && !report.recommendations?.length && (
              <p className="text-center py-8" style={{ color: 'var(--text-dim)' }}>AI insights are being generated. Refresh shortly.</p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <Link to="/student/exams" className="btn-primary flex-1 justify-center">Find Another Exam <ArrowRight size={13} /></Link>
          <Link to="/practice"      className="btn-secondary flex-1 justify-center"><Zap size={13} /> Practice</Link>
        </div>
      </div>
    </div>
  );
}
