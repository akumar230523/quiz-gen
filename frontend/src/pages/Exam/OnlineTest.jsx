/**
 * OnlineTest.jsx  ─  Timed online exam interface
 * Features: question navigator, flag-for-review, countdown timer,
 * submit modal, MCQ + descriptive question types.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { quizAPI } from '@/services/api';
import Spinner from '@/components/common/Spinner';
import {
  Clock, Send, ChevronLeft, ChevronRight, Flag,
  RotateCcw, AlertTriangle, CheckCircle, ShieldAlert,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/hooks/usePageTitle';

/**
 * useExamLockdown — prevents tab switching, back navigation, and new windows during exam.
 * @param {boolean} active  – only applies locks when true (exam loaded)
 * @param {Function} onViolation – called when a violation is detected
 */
function useExamLockdown(active, onViolation) {
  const violationCount = useRef(0);

  useEffect(() => {
    if (!active) return;

    // 1. Block browser back button by pushing a dummy history entry
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
      onViolation('back_navigation');
    };

    // 2. Detect tab/window visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) onViolation('tab_switch');
    };

    // 3. Detect window blur (user switched to another app/window)
    const handleBlur = () => onViolation('window_blur');

    // 4. Block right-click context menu
    const handleContextMenu = e => e.preventDefault();

    // 5. Block common keyboard shortcuts (F12, Ctrl+T, Ctrl+N, Alt+Tab hint, etc.)
    const handleKeyDown = e => {
      const blocked = (
        e.key === 'F12' ||
        (e.ctrlKey && ['t', 'n', 'w', 'Tab'].includes(e.key)) ||
        (e.altKey && e.key === 'Tab') ||
        (e.metaKey && ['t', 'n', 'w'].includes(e.key))
      );
      if (blocked) e.preventDefault();
    };

    // 6. Warn before unload (refresh / close tab)
    const handleBeforeUnload = e => {
      e.preventDefault();
      e.returnValue = 'Your exam is in progress. Are you sure you want to leave?';
      return e.returnValue;
    };

    window.addEventListener('popstate',          handlePopState);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur',              handleBlur);
    document.addEventListener('contextmenu',     handleContextMenu);
    document.addEventListener('keydown',         handleKeyDown);
    window.addEventListener('beforeunload',      handleBeforeUnload);

    return () => {
      window.removeEventListener('popstate',          handlePopState);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur',              handleBlur);
      document.removeEventListener('contextmenu',     handleContextMenu);
      document.removeEventListener('keydown',         handleKeyDown);
      window.removeEventListener('beforeunload',      handleBeforeUnload);
    };
  }, [active, onViolation]);
}

// Question status constants
const S = { NONE: 'none', VISITED: 'visited', ANSWERED: 'answered', REVIEW: 'review', ANS_REV: 'answered_review' };
const S_STYLE = {
  none:             'border text-xs font-bold rounded-lg',
  visited:          'border text-xs font-bold rounded-lg',
  answered:         'bg-neon/20 text-neon border-neon/40 text-xs font-bold rounded-lg',
  review:           'bg-rose/20 text-rose border-rose/40 text-xs font-bold rounded-lg',
  answered_review:  'bg-blue-500/20 text-blue-400 border-blue-400/40 text-xs font-bold rounded-lg',
};

function fmt(s) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function SubmitModal({ total, answered, flagged, onConfirm, onCancel, submitting }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="glass p-8 max-w-sm w-full animate-slide-up">
        <AlertTriangle size={36} className="text-amber mx-auto mb-4" />
        <h2 className="text-xl font-display font-bold text-center mb-2" style={{ color: 'var(--text)' }}>Submit Exam?</h2>
        <p className="text-sm text-center mb-5" style={{ color: 'var(--text-muted)' }}>This action cannot be undone.</p>
        <div className="grid grid-cols-2 gap-2.5 mb-6">
          {[
            { l: 'Answered', v: answered, c: 'bg-neon' },
            { l: 'Skipped',  v: total - answered, c: 'bg-white/25' },
            { l: 'Flagged',  v: flagged,  c: 'bg-rose' },
            { l: 'Total',    v: total,    c: 'bg-white/10' },
          ].map(s => (
            <div key={s.l} className="flex items-center gap-2 p-3 rounded-xl" style={{ backgroundColor: 'var(--surface)' }}>
              <div className={`w-3 h-3 rounded-full ${s.c} shrink-0`} />
              <div>
                <p className="text-lg font-display font-bold" style={{ color: 'var(--text)' }}>{s.v}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.l}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={onConfirm} disabled={submitting} className="btn-primary flex-1 justify-center">
            {submitting ? <Spinner size="sm" color="dark" /> : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OnlineTest() {
  const { examId }      = useParams();
  const [params]        = useSearchParams();
  const navigate        = useNavigate();
  const { user }        = useAuth();
  const mode            = params.get('mode') || 'mcq';

  const [exam,       setExam]       = useState(null);
  const [questions,  setQuestions]  = useState([]);
  const [answers,    setAnswers]    = useState({});
  const [statuses,   setStatuses]   = useState({});
  const [current,    setCurrent]    = useState(0);
  const [timeLeft,   setTimeLeft]   = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal,  setShowModal]  = useState(false);
  const [violations,  setViolations]  = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMsg,  setWarningMsg]  = useState('');
  const timerRef = useRef(null);

  // Exam lockdown
  const examActive = questions.length > 0 && !submitting;
  const handleViolation = useCallback((type) => {
    setViolations(v => v + 1);
    const msgs = {
      tab_switch:     '⚠️ Tab switching detected! This will be flagged.',
      window_blur:    '⚠️ Stay focused on the exam window.',
      back_navigation:'⚠️ Browser navigation is disabled during the exam.',
    };
    setWarningMsg(msgs[type] || '⚠️ Suspicious activity detected.');
    setShowWarning(true);
    setTimeout(() => setShowWarning(false), 4000);
  }, []);
  useExamLockdown(examActive, handleViolation);

  usePageTitle(exam?.name || 'Exam');

  useEffect(() => {
    quizAPI.getQuestions(examId, { count: 20, type: mode, difficulty: 'medium' })
      .then(r => {
        setExam(r.data.exam);
        setQuestions(r.data.questions);
        setTimeLeft((r.data.exam?.duration || 60) * 60);
        const a = {}, st = {};
        r.data.questions.forEach(q => { a[q.id] = null; st[q.id] = S.NONE; });
        setAnswers(a); setStatuses(st);
      })
      .catch(() => toast.error('Failed to load exam'))
      .finally(() => setLoading(false));
  }, [examId, mode]);

  // Countdown timer
  useEffect(() => {
    if (!questions.length || timeLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); handleSubmit(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [questions.length]);

  // Mark question as visited
  useEffect(() => {
    const qId = questions[current]?.id;
    if (qId) setStatuses(p => p[qId] === S.NONE ? { ...p, [qId]: S.VISITED } : p);
  }, [current, questions]);

  function selectAnswer(qId, idx) {
    const deselect = answers[qId] === idx;
    setAnswers(p => ({ ...p, [qId]: deselect ? null : idx }));
    setStatuses(p => {
      const cur = p[qId], inReview = cur === S.REVIEW || cur === S.ANS_REV;
      if (deselect) return { ...p, [qId]: S.VISITED };
      return { ...p, [qId]: inReview ? S.ANS_REV : S.ANSWERED };
    });
  }

  function toggleReview(qId) {
    setStatuses(p => {
      const cur = p[qId];
      if (cur === S.ANSWERED)    return { ...p, [qId]: S.ANS_REV };
      if (cur === S.ANS_REV)     return { ...p, [qId]: S.ANSWERED };
      if (cur === S.REVIEW)      return { ...p, [qId]: S.VISITED };
      return { ...p, [qId]: S.REVIEW };
    });
  }

  const handleSubmit = useCallback(async (auto = false) => {
    if (submitting) return;
    clearInterval(timerRef.current);
    setSubmitting(true); setShowModal(false);
    try {
      const correct   = questions.filter(q => answers[q.id] === q.correctAnswer).length;
      const score     = questions.length ? (correct / questions.length) * 100 : 0;
      const breakdown = questions.map(q => ({
        question_id: q.id, question_text: q.text,
        user_answer: answers[q.id], correct_answer: q.correctAnswer,
        is_correct: answers[q.id] === q.correctAnswer, topic: q.topic,
      }));
      const res = await quizAPI.submit({
        exam_id: examId, exam_name: exam?.name || 'Exam',
        score: +score.toFixed(2), total_questions: questions.length,
        correct_answers: correct, question_breakdown: breakdown,
        exam_type: 'online', difficulty: 'medium',
        time_taken: Math.round(((exam?.duration || 60) * 60 - timeLeft) / 60),
      });
      toast.success('Exam submitted!');
      navigate(`/report/${res.data.result_id}`);
    } catch { toast.error('Submission failed'); setSubmitting(false); }
  }, [answers, questions, exam, examId, timeLeft, submitting, navigate]);

  // Warning banner component (rendered inside JSX below)
  const ViolationWarning = showWarning ? (
    <div className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center py-3 text-sm font-semibold animate-fade-in"
      style={{ backgroundColor: 'rgba(244,63,94,0.95)', color: 'white', backdropFilter: 'blur(8px)' }}>
      <ShieldAlert size={16} className="mr-2 shrink-0" />
      {warningMsg}
      {violations > 1 && <span className="ml-3 px-2 py-0.5 rounded-full bg-white/20 text-xs">{violations} violation{violations !== 1 ? 's' : ''}</span>}
    </div>
  ) : null;

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}><Spinner size="lg" /></div>;
  if (!questions.length) return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)', color: 'var(--text-muted)' }}>No questions available.</div>;

  const q         = questions[current];
  const urgent    = timeLeft < 300;
  const answered  = Object.values(statuses).filter(s => s === S.ANSWERED || s === S.ANS_REV).length;
  const flagged   = Object.values(statuses).filter(s => s === S.REVIEW   || s === S.ANS_REV).length;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      {ViolationWarning}
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-sm truncate" style={{ color: 'var(--text)' }}>{exam?.name}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{answered}/{questions.length} answered</p>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-sm font-bold border shrink-0 ${urgent ? 'bg-rose/20 text-rose border-rose/30 animate-pulse' : 'bg-neon/10 text-neon border-neon/20'}`}>
            <Clock size={14} />{fmt(timeLeft)}
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary text-sm shrink-0 py-2">
            <Send size={13} /> Submit
          </button>
        </div>
        <div className="h-0.5" style={{ backgroundColor: 'var(--border)' }}>
          <div className="h-full bg-neon transition-all duration-300" style={{ width: `${(answered / questions.length) * 100}%` }} />
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 pt-14">
        {/* Question panel */}
        <div className="flex-1 min-w-0 p-3 md:p-5 max-w-3xl mx-auto w-full">
          <div className="glass p-6 md:p-8 mt-1">
            {/* Question header */}
            <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="badge-neon font-mono text-xs">Q {current + 1} / {questions.length}</span>
                {q.topic && <span className="badge-grey text-xs">{q.topic}</span>}
                {q.difficulty && (
                  <span className={`badge text-xs ${q.difficulty === 'hard' ? 'badge-rose' : q.difficulty === 'medium' ? 'badge-amber' : 'badge-emerald'}`}>
                    {q.difficulty}
                  </span>
                )}
              </div>
              <button onClick={() => toggleReview(q.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  statuses[q.id] === S.REVIEW || statuses[q.id] === S.ANS_REV
                    ? 'bg-rose/15 border-rose/40 text-rose'
                    : 'hover:border-white/20'
                }`}
                style={statuses[q.id] !== S.REVIEW && statuses[q.id] !== S.ANS_REV ? { borderColor: 'var(--border)', color: 'var(--text-muted)' } : {}}>
                <Flag size={11} />
                {statuses[q.id] === S.REVIEW || statuses[q.id] === S.ANS_REV ? 'Marked' : 'Mark for Review'}
              </button>
            </div>

            <h2 className="text-base md:text-lg font-body leading-relaxed mb-7" style={{ color: 'var(--text)' }}>{q.text}</h2>

            {/* MCQ options */}
            {q.type === 'mcq' && q.options?.length > 0 && (
              <div className="space-y-2.5">
                {q.options.map((opt, idx) => {
                  const sel = answers[q.id] === idx;
                  return (
                    <button key={idx} onClick={() => selectAnswer(q.id, idx)}
                      className="w-full text-left flex items-start gap-3 px-4 py-3.5 rounded-xl border transition-all group"
                      style={sel
                        ? { backgroundColor: 'rgba(0,245,212,0.08)', borderColor: 'rgba(0,245,212,0.4)' }
                        : { backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                      onMouseEnter={e => !sel && (e.currentTarget.style.borderColor = 'var(--border-h)')}
                      onMouseLeave={e => !sel && (e.currentTarget.style.borderColor = 'var(--border)')}>
                      <span className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-display font-bold shrink-0 ${sel ? 'bg-neon text-ink' : ''}`}
                        style={!sel ? { backgroundColor: 'var(--border)', color: 'var(--text-muted)' } : {}}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="flex-1 text-sm leading-relaxed" style={{ color: sel ? '#00f5d4' : 'var(--text)' }}>{opt}</span>
                      {sel && <CheckCircle size={15} className="text-neon shrink-0 mt-0.5" />}
                    </button>
                  );
                })}
                {answers[q.id] !== null && (
                  <button onClick={() => selectAnswer(q.id, answers[q.id])} className="flex items-center gap-1.5 text-xs mt-1 transition-colors" style={{ color: 'var(--text-dim)' }}>
                    <RotateCcw size={11} /> Clear selection
                  </button>
                )}
              </div>
            )}

            {/* Descriptive */}
            {q.type === 'descriptive' && (
              <textarea className="input min-h-48 resize-y text-sm"
                placeholder="Write your detailed answer here…"
                value={answers[q.id] || ''}
                onChange={e => {
                  const v = e.target.value;
                  setAnswers(p => ({ ...p, [q.id]: v }));
                  setStatuses(p => ({ ...p, [q.id]: v.trim() ? (p[q.id] === S.REVIEW ? S.ANS_REV : S.ANSWERED) : S.VISITED }));
                }}
              />
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-7 pt-5 border-t" style={{ borderColor: 'var(--border)' }}>
              <button onClick={() => current > 0 && setCurrent(c => c - 1)} disabled={current === 0} className="btn-secondary text-sm disabled:opacity-30">
                <ChevronLeft size={14} /> Prev
              </button>
              <div className="flex gap-2">
                {current < questions.length - 1 ? (
                  <button onClick={() => setCurrent(c => c + 1)} className="btn-primary text-sm">
                    Next <ChevronRight size={14} />
                  </button>
                ) : (
                  <button onClick={() => setShowModal(true)} className="btn-violet text-sm">
                    <Send size={13} /> Submit
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Side panel — question navigator */}
        <div className="hidden md:flex flex-col w-52 shrink-0 p-3 gap-3 pt-4">
          <div className="glass p-4">
            <p className="font-display font-semibold text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Navigate</p>
            <div className="grid grid-cols-5 gap-1.5">
              {questions.map((qq, i) => (
                <button key={qq.id} onClick={() => setCurrent(i)}
                  className={`aspect-square ${S_STYLE[statuses[qq.id] || S.NONE]} ${i === current ? 'ring-2 ring-offset-1 ring-white/30 scale-110' : ''} transition-all`}
                  style={statuses[qq.id] === S.NONE ? { backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-muted)' }
                       : statuses[qq.id] === S.VISITED ? { backgroundColor: 'var(--border)', borderColor: 'var(--border-h)', color: 'var(--text)' } : {}}>
                  {i + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="glass p-4">
            <p className="font-display font-semibold text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Legend</p>
            <div className="space-y-2">
              {[
                { l: 'Answered',  cls: 'bg-neon/20 text-neon' },
                { l: 'Flagged',   cls: 'bg-rose/20 text-rose' },
                { l: 'Ans+Flag',  cls: 'bg-blue-500/20 text-blue-400' },
                { l: 'Visited',   cls: '' },
              ].map(x => (
                <div key={x.l} className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded text-xs flex items-center justify-center ${x.cls}`}
                    style={!x.cls ? { backgroundColor: 'var(--border)', color: 'var(--text-muted)' } : {}}>·</div>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{x.l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="glass p-4">
            <p className="font-display font-semibold text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Summary</p>
            <div className="space-y-1.5">
              {[
                { l: 'Total',    v: questions.length, c: 'bg-white/25' },
                { l: 'Done',     v: answered,         c: 'bg-neon' },
                { l: 'Flagged',  v: flagged,          c: 'bg-rose' },
              ].map(s => (
                <div key={s.l} className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${s.c}`} />
                    <span style={{ color: 'var(--text-muted)' }}>{s.l}</span>
                  </div>
                  <span className="font-display font-bold" style={{ color: 'var(--text)' }}>{s.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <SubmitModal total={questions.length} answered={answered} flagged={flagged}
          onConfirm={() => handleSubmit(false)} onCancel={() => setShowModal(false)} submitting={submitting} />
      )}
    </div>
  );
}