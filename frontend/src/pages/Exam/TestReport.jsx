/**
 * TestReport.jsx  ─  Quiz result report page
 * Shows grade, stats, AI insights, and answer-by-answer review.
 */

import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Layout from '@/components/common/Layout';
import Spinner from '@/components/common/Spinner';
import { quizAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Trophy, CheckCircle, XCircle, Lightbulb, TrendingUp, ArrowRight, Zap, Brain, Clock } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';

function GradeBadge({ pct }) {
  const grade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : 'F';
  const color = pct >= 70 ? '#00f5d4' : pct >= 50 ? '#f59e0b' : '#f43f5e';
  return (
    <div className="w-28 h-28 rounded-full mx-auto flex flex-col items-center justify-center shadow-xl"
      style={{ background: `conic-gradient(${color} ${pct}%, var(--border) 0)` }}>
      <div className="w-22 h-22 rounded-full flex flex-col items-center justify-center"
        style={{ background: 'var(--bg)', width: '80%', height: '80%' }}>
        <span className="text-2xl font-display font-black" style={{ color }}>{grade}</span>
        <span className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>{pct.toFixed(0)}%</span>
      </div>
    </div>
  );
}

export default function TestReport() {
  const { resultId } = useParams();
  const navigate     = useNavigate();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  usePageTitle('Test Report');

  useEffect(() => {
    quizAPI.getReport(resultId)
      .then(r => setData(r.data))
      .catch(() => navigate('/dashboard'))
      .finally(() => setLoading(false));
  }, [resultId]);

  if (loading) return <Layout><div className="page-center"><Spinner size="lg" /></div></Layout>;
  if (!data)   return <Layout><div className="page-center" style={{ color: 'var(--text-muted)' }}>Report not found</div></Layout>;

  const result   = data.result || {};
  const insights = data.insights || {};
  const pct      = result.score || result.accuracy || 0;
  const bd       = result.question_breakdown || [];
  const correct  = result.correct_answers || bd.filter(q => q.is_correct).length;

  return (
    <Layout>
      <div className="page max-w-2xl">
        {/* Hero */}
        <div className="glass p-8 text-center mb-5 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(0,245,212,0.06) 0%, transparent 70%)' }} />
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>{result.exam_name}</p>
          <GradeBadge pct={pct} />
          <div className="flex justify-center gap-10 mt-7">
            {[
              { v: correct,                           label: 'Correct', c: 'text-neon' },
              { v: result.total_questions - correct,  label: 'Wrong',   c: 'text-rose' },
              { v: result.total_questions,            label: 'Total',   c: '' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className={`text-2xl font-display font-bold ${s.c}`} style={!s.c ? { color: 'var(--text-muted)' } : {}}>{s.v}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
              </div>
            ))}
          </div>
          {result.time_taken && (
            <p className="text-xs mt-4 flex items-center justify-center gap-1" style={{ color: 'var(--text-dim)' }}>
              <Clock size={11} /> {result.time_taken} min
            </p>
          )}
        </div>

        {/* AI Insights */}
        {insights.insights?.length > 0 && (
          <div className="glass p-6 mb-5">
            <h3 className="font-display font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
              <Lightbulb size={15} className="text-amber" /> AI Insights
            </h3>
            <div className="space-y-3">
              {insights.insights.map((ins, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--surface)' }}>
                  <div className="w-5 h-5 rounded-full bg-amber/15 text-amber flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                  <p className="text-xs font-body leading-relaxed" style={{ color: 'var(--text-muted)' }}>{ins}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {insights.recommendations?.length > 0 && (
          <div className="glass p-6 mb-5">
            <h3 className="font-display font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
              <TrendingUp size={15} className="text-neon" /> Recommendations
            </h3>
            <div className="space-y-2">
              {insights.recommendations.map((r, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-xl" style={{ border: '1px solid rgba(0,245,212,0.12)', backgroundColor: 'rgba(0,245,212,0.03)' }}>
                  <Zap size={12} className="text-neon shrink-0 mt-0.5" />
                  <p className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>{r}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Answer review */}
        {bd.length > 0 && (
          <div className="glass p-6 mb-5">
            <h3 className="font-display font-semibold mb-4" style={{ color: 'var(--text)' }}>Answer Review</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {bd.map((a, i) => (
                <div key={i} className="p-4 rounded-xl border" style={{
                  borderColor: a.is_correct ? 'rgba(0,245,212,0.15)' : 'rgba(244,63,94,0.15)',
                  backgroundColor: a.is_correct ? 'rgba(0,245,212,0.03)' : 'rgba(244,63,94,0.03)',
                }}>
                  <div className="flex items-start gap-3">
                    {a.is_correct
                      ? <CheckCircle size={14} className="text-neon shrink-0 mt-0.5" />
                      : <XCircle    size={14} className="text-rose shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-body leading-relaxed line-clamp-2" style={{ color: 'var(--text)' }}>{a.question_text}</p>
                      {!a.is_correct && a.correct_answer != null && (
                        <p className="text-xs text-neon/70 mt-1">✓ Correct: Option {typeof a.correct_answer === 'number' ? a.correct_answer + 1 : a.correct_answer}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-3 gap-3">
          <Link to="/countries"       className="btn-primary  justify-center text-sm">Retake <ArrowRight size={12} /></Link>
          <Link to="/practice"        className="btn-secondary justify-center text-sm"><Zap size={13} /> Practice</Link>
          <Link to="/recommendations" className="btn-ghost    justify-center text-sm"><Brain size={13} /> Study Plan</Link>
        </div>
      </div>
    </Layout>
  );
}
