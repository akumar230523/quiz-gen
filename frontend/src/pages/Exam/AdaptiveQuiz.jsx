/**
 * AdaptiveQuiz.jsx  ─  Adaptive difficulty quiz
 * Difficulty auto-adjusts based on the student's running accuracy.
 * Questions are fetched in batches of 5 from the AI tutor endpoint.
 */

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/common/Layout';
import Spinner from '@/components/common/Spinner';
import { tutorAPI } from '@/services/api';
import { Brain, ChevronRight, Send, TrendingDown, TrendingUp, Minus, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/hooks/usePageTitle';

const DIFF_ICON  = { easy: TrendingDown, medium: Minus, hard: TrendingUp };
const DIFF_COLOR = { easy: 'text-emerald', medium: 'text-amber', hard: 'text-rose' };
const DIFF_BG    = { easy: 'bg-emerald/10 border-emerald/20', medium: 'bg-amber/10 border-amber/20', hard: 'bg-rose/10 border-rose/20' };

export default function AdaptiveQuiz() {
  usePageTitle('Adaptive Quiz');
  const [sp]     = useSearchParams();
  const navigate = useNavigate();
  const topic    = sp.get('topic') || 'General Knowledge';

  const [questions,    setQuestions]    = useState([]);
  const [answered,     setAnswered]     = useState([]);   // [{correct, difficulty, topic}]
  const [current,      setCurrent]      = useState(0);
  const [selected,     setSelected]     = useState(null);
  const [revealed,     setRevealed]     = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [loadingMore,  setLoadingMore]  = useState(false);
  const [done,         setDone]         = useState(false);
  const [score,        setScore]        = useState({ correct: 0, total: 0 });

  // Load first batch on mount
  useEffect(() => {
    tutorAPI.adaptive({ topic, answered: [], count: 5 })
      .then(r => setQuestions(r.data.questions || []))
      .catch(() => toast.error('Failed to load adaptive quiz'))
      .finally(() => setLoading(false));
  }, [topic]);

  const q            = questions[current];
  const accuracy     = score.total ? score.correct / score.total : 1;
  const lastDiff     = answered.at(-1)?.difficulty || 'medium';
  const nextDiff     = accuracy >= 0.85 && lastDiff !== 'hard' ? (lastDiff === 'easy' ? 'medium' : 'hard')
                     : accuracy < 0.5  && lastDiff !== 'easy' ? (lastDiff === 'hard' ? 'medium' : 'easy')
                     : lastDiff;
  const DiffIcon     = DIFF_ICON[nextDiff] || Minus;

  // Confirm answer
  function confirm() {
    if (selected === null) return;
    const isCorrect = selected === q.correctAnswer;
    setRevealed(true);
    setScore(s => ({ correct: s.correct + (isCorrect ? 1 : 0), total: s.total + 1 }));
    setAnswered(a => [...a, { correct: isCorrect, difficulty: q.difficulty || 'medium', topic: q.topic || topic }]);
  }

  // Move to next question or load more
  async function next() {
    setSelected(null);
    setRevealed(false);
    if (score.total >= 15) { setDone(true); return; }
    if (current < questions.length - 1) { setCurrent(c => c + 1); return; }
    setLoadingMore(true);
    try {
      const res = await tutorAPI.adaptive({ topic, answered, count: 5 });
      setQuestions(prev => [...prev, ...(res.data.questions || [])]);
      setCurrent(c => c + 1);
    } catch { toast.error('Could not load next questions'); }
    finally { setLoadingMore(false); }
  }

  // ── Done screen ───────────────────────────────────────────────────────
  if (done) {
    const pct = score.total ? Math.round(score.correct / score.total * 100) : 0;
    return (
      <Layout>
        <div className="page-center">
          <div className="glass p-12 max-w-md text-center animate-slide-up">
            <div className={`w-24 h-24 rounded-full mx-auto mb-6 flex flex-col items-center justify-center ${pct >= 80 ? 'bg-neon/15' : pct >= 60 ? 'bg-amber/15' : 'bg-rose/15'}`}>
              <span className={`text-3xl font-display font-black ${pct >= 80 ? 'text-neon' : pct >= 60 ? 'text-amber' : 'text-rose'}`}>{pct}%</span>
            </div>
            <h1 className="text-2xl font-display font-bold mb-2" style={{ color: 'var(--text)' }}>Session Complete!</h1>
            <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
              {score.correct}/{score.total} correct · Quiz adapted to your level
            </p>
            <div className="flex gap-3 mt-8">
              <button onClick={() => window.location.reload()} className="btn-primary flex-1 justify-center">Try Again</button>
              <button onClick={() => navigate('/practice')} className="btn-secondary flex-1 justify-center">Practice</button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (loading) return <Layout><div className="page-center"><Spinner size="lg" /></div></Layout>;
  if (!q)      return <Layout><div className="page-center" style={{ color: 'var(--text-muted)' }}>No questions available</div></Layout>;

  return (
    <Layout>
      {/* Top bar */}
      <div className="fixed top-16 left-0 right-0 z-40 backdrop-blur-xl border-b" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}>
        <div className="max-w-3xl mx-auto h-14 px-4 flex items-center gap-4">
          <Brain size={16} className="text-neon" />
          <span className="font-display font-semibold text-sm" style={{ color: 'var(--text)' }}>Adaptive Quiz — {topic}</span>
          <div className="flex-1" />
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-semibold ${DIFF_BG[nextDiff]}`}>
            <DiffIcon size={12} className={DIFF_COLOR[nextDiff]} />
            <span className={`${DIFF_COLOR[nextDiff]} capitalize`}>{nextDiff}</span>
          </div>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{score.correct}/{score.total} · Q{current + 1}</span>
        </div>
        <div className="h-1" style={{ backgroundColor: 'var(--border)' }}>
          <div className="h-full bg-neon transition-all duration-500" style={{ width: `${Math.min(100, score.total / 15 * 100)}%` }} />
        </div>
      </div>

      <div className="pt-16 page max-w-3xl">
        <div className="glass p-8 mt-4 animate-fade-in">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="badge-neon text-xs">Q{current + 1}</span>
              {q.topic && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{q.topic}</span>}
            </div>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>AI adapts to your performance</span>
          </div>

          <h2 className="text-lg font-display font-semibold leading-relaxed mb-8" style={{ color: 'var(--text)' }}>{q.text}</h2>

          {/* Options */}
          {q.options?.length > 0 && (
            <div className="space-y-3 mb-6">
              {q.options.map((opt, idx) => {
                let cls = 'border transition-all cursor-pointer';
                if (revealed) {
                  if (idx === q.correctAnswer) cls += ' bg-neon/10 border-neon/40 text-neon';
                  else if (idx === selected)    cls += ' bg-rose/10 border-rose/40 text-rose';
                  else                          cls += ' opacity-40';
                } else if (selected === idx)    cls += ' bg-neon/10 border-neon/40 text-neon';
                else                            cls += ' hover:border-white/20';

                return (
                  <button key={idx} disabled={revealed}
                    onClick={() => !revealed && setSelected(idx)}
                    className={`w-full text-left px-5 py-4 rounded-xl font-body text-sm ${cls}`}
                    style={!revealed && selected !== idx ? { borderColor: 'var(--border)', color: 'var(--text)' } : {}}
                  >
                    <span className="inline-flex w-7 h-7 rounded-lg items-center justify-center text-xs font-display font-bold mr-3"
                      style={revealed && idx === q.correctAnswer ? { background: '#00f5d4', color: '#0a0f1e' }
                           : revealed && idx === selected ? { background: '#f43f5e', color: 'white' }
                           : selected === idx ? { background: 'rgba(0,245,212,0.15)', color: '#00f5d4' }
                           : { backgroundColor: 'var(--surface)', color: 'var(--text-muted)' }}>
                      {revealed && idx === q.correctAnswer ? <CheckCircle size={13} />
                       : revealed && idx === selected      ? <XCircle size={13} />
                       : String.fromCharCode(65 + idx)}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>
          )}

          {/* Explanation */}
          {revealed && q.explanation && (
            <div className="p-4 rounded-xl mb-6 animate-fade-in" style={{ background: 'rgba(0,245,212,0.05)', border: '1px solid rgba(0,245,212,0.15)' }}>
              <p className="text-xs font-display font-semibold text-neon mb-1">Explanation</p>
              <p className="text-sm font-body" style={{ color: 'var(--text-muted)' }}>{q.explanation}</p>
            </div>
          )}

          <div className="flex justify-end">
            {!revealed ? (
              <button onClick={confirm} disabled={selected === null} className="btn-primary">
                Confirm <Send size={14} />
              </button>
            ) : (
              <button onClick={next} disabled={loadingMore} className="btn-primary">
                {loadingMore ? <Spinner size="sm" color="dark" /> : <>Next <ChevronRight size={14} /></>}
              </button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
