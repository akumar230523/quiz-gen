/**
 * PracticeSession.jsx  ─  Active practice session UI
 * Timed or untimed, supports MCQ and descriptive. Shows results on completion.
 */

import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Layout from '@/components/common/Layout';
import Spinner from '@/components/common/Spinner';
import { practiceAPI } from '@/services/api';
import { ChevronLeft, ChevronRight, Send, Clock, CheckCircle, TrendingUp, BarChart3, Brain, Zap, Flag, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/hooks/usePageTitle';

function fmt(s) { return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; }
function getQ(q) { return q?.question_text || q?.text || ''; }

export default function PracticeSession() {
  usePageTitle('Practice Session');
  const { state }  = useLocation();
  const navigate   = useNavigate();
  const { user }   = useAuth();

  const practice  = state?.practiceData;
  const examName  = state?.examName  || 'Practice';
  const examType  = state?.examType  || 'MCQ';
  const difficulty= state?.difficulty|| 'Medium';

  const rawQs     = practice?.questions || [];
  const questions = rawQs.map(q => ({ ...q, text: q.text||q.question_text||'', question_text: q.question_text||q.text||'' }));
  const totalSecs = (practice?.estimated_minutes || Math.ceil(questions.length * 1.5)) * 60;

  const [current,    setCurrent]    = useState(0);
  const [answers,    setAnswers]    = useState({});
  const [skipped,    setSkipped]    = useState(new Set());
  const [timeLeft,   setTimeLeft]   = useState(totalSecs);
  const [elapsed,    setElapsed]    = useState(0);
  const [done,       setDone]       = useState(false);
  const [results,    setResults]    = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => { if (!practice || !questions.length) navigate('/practice'); }, []);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(t => { if (t <= 1) { clearInterval(timerRef.current); finish(); return 0; } return t - 1; });
      setElapsed(e => e + 1);
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  if (!practice || !questions.length) return null;

  const q = questions[current];
  const answeredCount = Object.keys(answers).length;
  const isLowTime = timeLeft < totalSecs * 0.2;

  function setAnswer(val) {
    const deselect = answers[current] === val;
    setAnswers(p => { const n = { ...p }; if (deselect) delete n[current]; else n[current] = val; return n; });
  }

  async function finish() {
    clearInterval(timerRef.current);
    setSubmitting(true);
    const topics     = [...new Set(questions.map(q => q.topic).filter(Boolean))];
    const correct    = questions.filter((q, i) => answers[i] === (q.correctAnswer ?? q.correct_answer ?? 0)).length;
    const totalMarks = questions.reduce((s, q) => s + (q.marks || 1), 0);
    const score_pct  = totalMarks > 0 ? Math.round((correct / questions.length) * 100) : 0;

    try {
      await practiceAPI.save({
        exam_name: examName, exam_type: examType, difficulty,
        questions_attempted: answeredCount + skipped.size,
        total_questions: questions.length,
        questions_correct: correct,
        time_taken: Math.round(elapsed / 60),
        topics_covered: topics,
      });
    } catch { /* saving is non-critical */ }

    setResults({
      correct, total: questions.length, score_pct,
      time: elapsed, topics,
      review: questions.map((q, i) => ({
        text: getQ(q), topic: q.topic,
        selected: answers[i], correct: q.correctAnswer ?? q.correct_answer ?? 0,
        options: q.options || [], explanation: q.explanation || '',
        isCorrect: answers[i] === (q.correctAnswer ?? q.correct_answer ?? 0),
        isSkipped: skipped.has(i),
        isDescriptive: !Array.isArray(q.options) || q.options.length === 0,
      })),
    });
    setDone(true);
    setSubmitting(false);
  }

  // ── Done screen ───────────────────────────────────────────────────────────
  if (done && results) {
    const grade      = results.score_pct >= 80 ? 'A' : results.score_pct >= 60 ? 'B' : results.score_pct >= 40 ? 'C' : 'D';
    const gradeColor = { A: 'text-neon', B: 'text-emerald', C: 'text-amber', D: 'text-rose' }[grade];
    return (
      <Layout noFooter>
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="glass p-8 text-center mb-5 animate-slide-up">
            <div className={`text-5xl font-display font-black mb-2 ${gradeColor}`}>{grade}</div>
            <p className="text-2xl font-display font-bold mb-1" style={{ color: 'var(--text)' }}>{results.score_pct}%</p>
            <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>{examName}</p>
            <p className="text-xs mb-6" style={{ color: 'var(--text-dim)' }}>{results.correct}/{results.total} correct · {fmt(results.time)}</p>
            <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
              <button onClick={() => navigate('/practice')} className="btn-primary justify-center"><Zap size={14} /> New Session</button>
              <button onClick={() => navigate('/performance')} className="btn-secondary justify-center"><BarChart3 size={14} /> Performance</button>
            </div>
            <button onClick={() => navigate('/tutor')} className="btn-ghost w-full justify-center mt-3 text-sm">
              <Brain size={14} /> Ask AI Tutor about these questions
            </button>
          </div>

          {/* Answer review */}
          <div className="glass p-5">
            <h3 className="font-semibold mb-4" style={{ color: 'var(--text)' }}>Question Review</h3>
            <div className="space-y-4">
              {results.review.map((r, i) => (
                <div key={i} className="p-4 rounded-xl border" style={{
                  borderColor: r.isDescriptive ? 'rgba(124,58,237,0.2)' : r.isSkipped ? 'rgba(245,158,11,0.2)' : r.isCorrect ? 'rgba(0,245,212,0.2)' : 'rgba(244,63,94,0.2)',
                  backgroundColor: r.isDescriptive ? 'rgba(124,58,237,0.04)' : r.isSkipped ? 'rgba(245,158,11,0.04)' : r.isCorrect ? 'rgba(0,245,212,0.04)' : 'rgba(244,63,94,0.04)',
                }}>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>Q{i+1}</span>
                    {r.topic && <span className="badge-grey text-xs">{r.topic}</span>}
                    <span className={`text-xs ml-auto font-semibold ${r.isDescriptive ? 'text-violet-300' : r.isSkipped ? 'text-amber' : r.isCorrect ? 'text-neon' : 'text-rose'}`}>
                      {r.isDescriptive ? 'Descriptive' : r.isSkipped ? 'Skipped' : r.isCorrect ? 'Correct' : 'Wrong'}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed mb-2" style={{ color: 'var(--text)' }}>{r.text}</p>
                  {!r.isDescriptive && r.options.length > 0 && (
                    <div className="grid grid-cols-1 gap-1 mb-2">
                      {r.options.map((opt, oi) => (
                        <div key={oi} className="px-3 py-1.5 rounded-lg text-xs flex items-center gap-2"
                          style={{
                            backgroundColor: oi === r.correct && oi === r.selected ? 'rgba(0,245,212,0.15)' : oi === r.correct ? 'rgba(0,245,212,0.08)' : oi === r.selected ? 'rgba(244,63,94,0.15)' : 'var(--surface)',
                            color: oi === r.correct ? '#00f5d4' : oi === r.selected ? '#f43f5e' : 'var(--text-muted)',
                          }}>
                          <span className="font-bold">{String.fromCharCode(65+oi)}.</span> {opt}
                          {oi === r.correct  && <span className="ml-auto">✓ Correct</span>}
                          {oi === r.selected && oi !== r.correct && <span className="ml-auto">✗ Your answer</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {r.explanation && (
                    <div className="p-2 rounded-lg text-xs" style={{ backgroundColor: 'rgba(0,245,212,0.05)', border: '1px solid rgba(0,245,212,0.1)', color: 'rgba(0,245,212,0.7)' }}>
                      💡 {r.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // ── Active session ────────────────────────────────────────────────────────
  return (
    <Layout noFooter>
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-40 backdrop-blur-xl border-b" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>{practice.session_title || examName}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{answeredCount}/{questions.length} answered</p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-sm shrink-0 ${isLowTime ? 'bg-amber/15 border-amber/30 text-amber' : ''}`}
            style={!isLowTime ? { backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-muted)' } : {}}>
            <Clock size={13} /> {fmt(timeLeft)}
          </div>
          <button onClick={finish} disabled={submitting} className="btn-primary text-sm shrink-0 py-2">
            {submitting ? <Spinner size="sm" color="dark" /> : <><Send size={13} /> Submit</>}
          </button>
        </div>
        <div className="h-1" style={{ backgroundColor: 'var(--border)' }}>
          <div className="h-full bg-neon/40 transition-all" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
        </div>
      </div>

      <div className="flex flex-1 pt-14 max-w-6xl mx-auto w-full px-3 md:px-5 gap-4 py-4">
        {/* Question */}
        <div className="flex-1 min-w-0">
          <div className="glass p-6 md:p-8">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="badge-violet font-mono text-xs">Q {current + 1} / {questions.length}</span>
                {q.subject && <span className="badge-grey text-xs">{q.subject}</span>}
                {q.topic   && <span className="badge-grey text-xs">{q.topic}</span>}
              </div>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>+{q.marks || 1} mark{(q.marks||1)>1?'s':''}</span>
            </div>

            <h2 className="text-base md:text-lg font-body leading-relaxed mb-6" style={{ color: 'var(--text)' }}>{getQ(q)}</h2>

            {/* MCQ */}
            {Array.isArray(q.options) && q.options.length > 0 && (
              <div className="grid gap-2 mb-5">
                {q.options.map((opt, oi) => (
                  <button key={oi} onClick={() => setAnswer(oi)}
                    className="w-full text-left px-4 py-3 rounded-xl text-sm border transition-all"
                    style={answers[current] === oi
                      ? { backgroundColor: 'rgba(0,245,212,0.1)', borderColor: 'rgba(0,245,212,0.4)', color: '#00f5d4' }
                      : { backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    onMouseEnter={e => answers[current] !== oi && (e.currentTarget.style.borderColor = 'var(--border-h)')}
                    onMouseLeave={e => answers[current] !== oi && (e.currentTarget.style.borderColor = 'var(--border)')}>
                    <span className="font-bold mr-2">{String.fromCharCode(65+oi)}.</span>{opt}
                  </button>
                ))}
              </div>
            )}

            {/* Descriptive */}
            {(!Array.isArray(q.options) || q.options.length === 0) && (
              <textarea className="input min-h-36 resize-y text-sm mb-5"
                placeholder="Type your answer here…"
                value={answers[current] || ''}
                onChange={e => setAnswers(p => ({ ...p, [current]: e.target.value }))} />
            )}

            {/* Nav */}
            <div className="flex items-center justify-between pt-5 border-t" style={{ borderColor: 'var(--border)' }}>
              <button onClick={() => current > 0 && setCurrent(c => c - 1)} disabled={current === 0} className="btn-secondary text-sm disabled:opacity-30">
                <ChevronLeft size={14} /> Prev
              </button>
              <div className="flex gap-2">
                <button onClick={() => { setSkipped(s => new Set([...s, current])); current < questions.length - 1 && setCurrent(c => c + 1); }}
                  className="btn-ghost text-sm gap-1.5">
                  <Flag size={13} /> Skip
                </button>
                {current < questions.length - 1 ? (
                  <button onClick={() => setCurrent(c => c + 1)} className="btn-primary text-sm">Next <ChevronRight size={14} /></button>
                ) : (
                  <button onClick={finish} disabled={submitting} className="btn-violet text-sm">
                    {submitting ? <Spinner size="sm" /> : <><Send size={13} /> Submit</>}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Side panel */}
        <div className="hidden lg:flex flex-col w-52 shrink-0 gap-3 pt-1">
          <div className="glass p-4">
            <p className="font-display font-semibold text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Questions</p>
            <div className="grid grid-cols-5 gap-1.5">
              {questions.map((_, i) => (
                <button key={i} onClick={() => setCurrent(i)}
                  className={`aspect-square rounded-lg text-xs font-bold transition-all ${i === current ? 'ring-2 ring-white/30 scale-110' : ''}`}
                  style={{
                    backgroundColor: answers[i] !== undefined ? 'rgba(0,245,212,0.15)' : skipped.has(i) ? 'rgba(245,158,11,0.15)' : 'var(--surface)',
                    color: answers[i] !== undefined ? '#00f5d4' : skipped.has(i) ? '#f59e0b' : 'var(--text-muted)',
                    border: `1px solid ${answers[i] !== undefined ? 'rgba(0,245,212,0.3)' : skipped.has(i) ? 'rgba(245,158,11,0.3)' : 'var(--border)'}`,
                  }}>
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
          <div className="glass p-4">
            <p className="font-display font-semibold text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Progress</p>
            <div className="space-y-2">
              {[
                { l: 'Answered',  v: answeredCount, c: 'bg-neon' },
                { l: 'Skipped',   v: skipped.size,  c: 'bg-amber' },
                { l: 'Remaining', v: questions.length - answeredCount - skipped.size, c: 'bg-white/20' },
              ].map(s => (
                <div key={s.l} className="flex justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${s.c}`} />
                    <span style={{ color: 'var(--text-muted)' }}>{s.l}</span>
                  </div>
                  <span className="font-bold" style={{ color: 'var(--text)' }}>{s.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
