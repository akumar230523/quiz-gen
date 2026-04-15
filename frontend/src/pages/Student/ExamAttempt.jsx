/**
 * ExamAttempt.jsx  ─  Institute exam attempt (no login required)
 * Student enters name/ID → takes exam → submits to /student/submit/:attemptId
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studentAPI, getErrMsg } from '@/services/api';
import Spinner from '@/components/common/Spinner';
import { Clock, Send, ChevronLeft, ChevronRight, Flag, RotateCcw, User, Mail, CreditCard, CheckCircle, BookOpen, Zap, AlertTriangle, ShieldAlert } from 'lucide-react';

/**
 * useExamLockdown — prevents tab switching, back navigation, new windows during exam.
 */
function useExamLockdown(active, onViolation) {
  useEffect(() => {
    if (!active) return;

    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
      onViolation('back_navigation');
    };
    const handleVisibilityChange = () => {
      if (document.hidden) onViolation('tab_switch');
    };
    const handleBlur = () => onViolation('window_blur');
    const handleContextMenu = e => e.preventDefault();
    const handleKeyDown = e => {
      const blocked = (
        e.key === 'F12' ||
        (e.ctrlKey && ['t', 'n', 'w', 'Tab'].includes(e.key)) ||
        (e.altKey && e.key === 'Tab') ||
        (e.metaKey && ['t', 'n', 'w'].includes(e.key))
      );
      if (blocked) e.preventDefault();
    };
    const handleBeforeUnload = e => {
      e.preventDefault();
      e.returnValue = 'Your exam is in progress. Are you sure you want to leave?';
      return e.returnValue;
    };

    window.addEventListener('popstate',           handlePopState);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur',               handleBlur);
    document.addEventListener('contextmenu',      handleContextMenu);
    document.addEventListener('keydown',          handleKeyDown);
    window.addEventListener('beforeunload',       handleBeforeUnload);

    return () => {
      window.removeEventListener('popstate',           handlePopState);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur',               handleBlur);
      document.removeEventListener('contextmenu',      handleContextMenu);
      document.removeEventListener('keydown',          handleKeyDown);
      window.removeEventListener('beforeunload',       handleBeforeUnload);
    };
  }, [active, onViolation]);
}
import toast from 'react-hot-toast';

const S = { NONE: 'none', VISITED: 'visited', ANSWERED: 'answered', REVIEW: 'review', ANS_REV: 'answered_review' };
function fmt(s) { return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; }

// ── Student registration form ────────────────────────────────────────────────
function StudentForm({ onStart, err, loading }) {
  const [f, sf] = useState({ student_id: '', student_name: '', student_email: '' });
  const set = k => e => sf(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="orb w-96 h-96 bg-neon/10 -top-24 -left-24 fixed" />
      <div className="orb w-72 h-72 bg-violet/15 bottom-0 right-0 fixed" />
      <div className="relative z-10 w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-neon/15 border border-neon/30 flex items-center justify-center mx-auto mb-4">
            <BookOpen size={28} className="text-neon" />
          </div>
          <h1 className="text-2xl font-display font-bold mb-1" style={{ color: 'var(--text)' }}>Exam Registration</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Enter your details to begin</p>
        </div>
        <div className="glass p-8 space-y-4">
          <div>
            <label className="label">Student ID *</label>
            <div className="relative">
              <CreditCard size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} />
              <input className="input pl-10" placeholder="Roll number / student ID" value={f.student_id} onChange={set('student_id')} />
            </div>
          </div>
          <div>
            <label className="label">Full Name *</label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} />
              <input className="input pl-10" placeholder="Your full name" value={f.student_name} onChange={set('student_name')} />
            </div>
          </div>
          <div>
            <label className="label">Email <span className="font-normal normal-case" style={{ color: 'var(--text-dim)' }}>(optional)</span></label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} />
              <input className="input pl-10" type="email" placeholder="you@example.com" value={f.student_email} onChange={set('student_email')} />
            </div>
          </div>
          {err && <div className="p-3 rounded-xl text-sm text-rose" style={{ backgroundColor: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)' }}>{err}</div>}
          <button onClick={() => onStart(f)} disabled={loading || !f.student_id.trim() || !f.student_name.trim()} className="btn-primary w-full justify-center py-3.5">
            {loading ? <><Spinner size="sm" color="dark" /> Starting…</> : <><Zap size={15} /> Begin Exam</>}
          </button>
          <p className="text-xs text-center" style={{ color: 'var(--text-dim)' }}>Each exam can only be attempted once.</p>
        </div>
      </div>
    </div>
  );
}

export default function ExamAttempt() {
  const { examId }     = useParams();
  const navigate       = useNavigate();

  const [phase,      setPhase]      = useState('info');
  const [infoErr,    setInfoErr]    = useState('');
  const [exam,       setExam]       = useState(null);
  const [questions,  setQuestions]  = useState([]);
  const [attemptId,  setAttemptId]  = useState(null);
  const [student,    setStudent]    = useState(null);
  const [answers,    setAnswers]    = useState({});
  const [statuses,   setStatuses]   = useState({});
  const [current,    setCurrent]    = useState(0);
  const [timeLeft,   setTimeLeft]   = useState(0);
  const [showModal,  setShowModal]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [violations,  setViolations]  = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMsg,  setWarningMsg]  = useState('');
  const timerRef = useRef(null);

  // Exam lockdown — active once in exam phase and not yet submitted
  const examActive = phase === 'exam' && !submitting;
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

  async function startExam(info) {
    if (!info.student_id.trim() || !info.student_name.trim()) { setInfoErr('Student ID and Name are required.'); return; }
    setInfoErr(''); setPhase('loading');
    try {
      const res = await studentAPI.startAttempt(examId, info);
      if (!res.data.success) throw new Error(res.data.error || 'Failed to start');
      const e = res.data.exam; const qs = e.questions || [];
      setExam(e); setQuestions(qs); setAttemptId(res.data.attempt_id); setStudent(info);
      setTimeLeft(e.duration * 60);
      const a = {}, st = {};
      qs.forEach(q => { a[q.id] = null; st[q.id] = S.NONE; });
      setAnswers(a); setStatuses(st); setPhase('exam');
    } catch (err) {
      const msg = getErrMsg(err);
      setInfoErr(msg.toLowerCase().includes('already') ? 'You have already attempted this exam.' : msg);
      setPhase('info');
    }
  }

  useEffect(() => {
    if (phase !== 'exam' || timeLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => { if (t <= 1) { clearInterval(timerRef.current); handleSubmit(true); return 0; } return t - 1; });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

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
      if (cur === S.ANSWERED)  return { ...p, [qId]: S.ANS_REV };
      if (cur === S.ANS_REV)   return { ...p, [qId]: S.ANSWERED };
      if (cur === S.REVIEW)    return { ...p, [qId]: S.VISITED };
      return { ...p, [qId]: S.REVIEW };
    });
  }

  const handleSubmit = useCallback(async (auto = false) => {
    if (submitting) return;
    clearInterval(timerRef.current);
    setSubmitting(true); setShowModal(false);
    try {
      const timeTaken = Math.round(((exam?.duration || 60) * 60 - timeLeft) / 60);
      const res = await studentAPI.submitAttempt(attemptId, { answers, time_taken: timeTaken });
      if (res.data.success) {
        toast.success('Exam submitted! Generating report…');
        navigate(`/exam/report/${res.data.report_id}`);
      } else throw new Error(res.data.error || 'Failed');
    } catch (err) {
      toast.error(getErrMsg(err));
      setSubmitting(false);
    }
  }, [submitting, attemptId, answers, exam, timeLeft, navigate]);

  // Violation warning overlay
  const ViolationWarning = showWarning ? (
    <div className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center py-3 text-sm font-semibold animate-fade-in"
      style={{ backgroundColor: 'rgba(244,63,94,0.95)', color: 'white', backdropFilter: 'blur(8px)' }}>
      <ShieldAlert size={16} className="mr-2 shrink-0" />
      {warningMsg}
      {violations > 1 && <span className="ml-3 px-2 py-0.5 rounded-full bg-white/20 text-xs">{violations} violation{violations !== 1 ? 's' : ''}</span>}
    </div>
  ) : null;

  if (phase === 'info')    return <StudentForm onStart={startExam} err={infoErr} loading={false} />;
  if (phase === 'loading') return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}><Spinner size="lg" /></div>;
  if (!exam || !questions.length) return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)', color: 'var(--text-muted)' }}>No questions</div>;

  const q          = questions[current];
  const urgent     = timeLeft < 300;
  const answeredCt = Object.values(statuses).filter(s => s === S.ANSWERED || s === S.ANS_REV).length;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      {ViolationWarning}
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-sm truncate" style={{ color: 'var(--text)' }}>{exam.name}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{student?.student_name} · {answeredCt}/{questions.length} answered</p>
          </div>
          {violations > 0 && (
            <div className="hidden md:flex items-center gap-1 px-2 py-1 rounded-lg text-xs" style={{ backgroundColor: "rgba(244,63,94,0.12)", border: "1px solid rgba(244,63,94,0.25)", color: "#f43f5e" }}>
              <ShieldAlert size={11} /> {violations} flag{violations !== 1 ? "s" : ""}
            </div>
          )}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-sm font-bold border transition-all ${urgent ? 'bg-rose/20 text-rose border-rose/30 animate-pulse' : 'bg-neon/10 text-neon border-neon/20'}`}>
            <Clock size={14} />{fmt(timeLeft)}
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary text-sm shrink-0 py-2"><Send size={13} /> Submit</button>
        </div>
        <div className="h-0.5" style={{ backgroundColor: 'var(--border)' }}>
          <div className="h-full bg-neon transition-all" style={{ width: `${(answeredCt/questions.length)*100}%` }} />
        </div>
      </div>

      <div className="flex flex-1 pt-14">
        <div className="flex-1 min-w-0 p-3 md:p-5 max-w-3xl mx-auto w-full">
          <div className="glass p-6 md:p-8 mt-1">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="badge-neon font-mono text-xs">Q {current+1}/{questions.length}</span>
                {q.topic && <span className="badge-grey text-xs">{q.topic}</span>}
              </div>
              <button onClick={() => toggleReview(q.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${statuses[q.id]===S.REVIEW||statuses[q.id]===S.ANS_REV ? 'bg-rose/15 border-rose/40 text-rose' : ''}`}
                style={statuses[q.id]!==S.REVIEW&&statuses[q.id]!==S.ANS_REV ? { borderColor:'var(--border)', color:'var(--text-muted)' } : {}}>
                <Flag size={11} />{statuses[q.id]===S.REVIEW||statuses[q.id]===S.ANS_REV ? 'Marked' : 'Mark for Review'}
              </button>
            </div>
            <p className="text-sm mb-2" style={{ color:'var(--text-dim)' }}>{q.marks||1} mark{(q.marks||1)>1?'s':''}</p>
            <h2 className="text-base md:text-lg font-body leading-relaxed mb-7" style={{ color:'var(--text)' }}>{q.text}</h2>

            {q.type==='mcq' && q.options?.length>0 && (
              <div className="space-y-2.5">
                {q.options.map((opt,idx) => {
                  const sel = answers[q.id]===idx;
                  return (
                    <button key={idx} onClick={() => selectAnswer(q.id,idx)}
                      className="w-full text-left flex items-start gap-3 px-4 py-3.5 rounded-xl border transition-all"
                      style={sel ? {backgroundColor:'rgba(0,245,212,0.08)',borderColor:'rgba(0,245,212,0.4)'} : {backgroundColor:'var(--surface)',borderColor:'var(--border)'}}
                      onMouseEnter={e => !sel&&(e.currentTarget.style.borderColor='var(--border-h)')}
                      onMouseLeave={e => !sel&&(e.currentTarget.style.borderColor='var(--border)')}>
                      <span className="mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                        style={sel ? {backgroundColor:'#00f5d4',color:'#0a0f1e'} : {backgroundColor:'var(--border)',color:'var(--text-muted)'}}>
                        {String.fromCharCode(65+idx)}
                      </span>
                      <span className="flex-1 text-sm" style={{color: sel?'#00f5d4':'var(--text)'}}>{opt}</span>
                      {sel && <CheckCircle size={15} className="text-neon shrink-0 mt-0.5" />}
                    </button>
                  );
                })}
                {answers[q.id]!==null && (
                  <button onClick={() => selectAnswer(q.id,answers[q.id])} className="flex items-center gap-1.5 text-xs mt-1" style={{color:'var(--text-dim)'}}>
                    <RotateCcw size={11} /> Clear
                  </button>
                )}
              </div>
            )}

            {q.type==='descriptive' && (
              <textarea className="input min-h-48 resize-y text-sm"
                placeholder="Write your answer here…" value={answers[q.id]||''}
                onChange={e => {
                  setAnswers(p=>({...p,[q.id]:e.target.value}));
                  setStatuses(p=>({...p,[q.id]:e.target.value.trim()?(p[q.id]===S.REVIEW?S.ANS_REV:S.ANSWERED):S.VISITED}));
                }} />
            )}

            <div className="flex items-center justify-between mt-7 pt-5 border-t" style={{borderColor:'var(--border)'}}>
              <button onClick={() => current>0&&setCurrent(c=>c-1)} disabled={current===0} className="btn-secondary text-sm disabled:opacity-30">
                <ChevronLeft size={14} /> Prev
              </button>
              {current<questions.length-1 ? (
                <button onClick={() => setCurrent(c=>c+1)} className="btn-primary text-sm">Next <ChevronRight size={14} /></button>
              ) : (
                <button onClick={() => setShowModal(true)} className="btn-violet text-sm"><Send size={13} /> Submit</button>
              )}
            </div>
          </div>
        </div>

        {/* Side navigator */}
        <div className="hidden md:flex flex-col w-52 shrink-0 p-3 gap-3 pt-4">
          <div className="glass p-4">
            <p className="font-display font-semibold text-xs uppercase tracking-widest mb-3" style={{color:'var(--text-muted)'}}>Navigate</p>
            <div className="grid grid-cols-5 gap-1.5">
              {questions.map((qq,i) => (
                <button key={qq.id} onClick={()=>setCurrent(i)}
                  className={`aspect-square rounded-lg text-xs font-bold transition-all ${i===current?'ring-2 ring-white/30 scale-110':''}`}
                  style={{
                    backgroundColor:statuses[qq.id]===S.ANSWERED||statuses[qq.id]===S.ANS_REV?'rgba(0,245,212,0.15)':statuses[qq.id]===S.REVIEW?'rgba(244,63,94,0.15)':'var(--surface)',
                    borderColor:statuses[qq.id]===S.ANSWERED||statuses[qq.id]===S.ANS_REV?'rgba(0,245,212,0.3)':statuses[qq.id]===S.REVIEW?'rgba(244,63,94,0.3)':'var(--border)',
                    color:statuses[qq.id]===S.ANSWERED||statuses[qq.id]===S.ANS_REV?'#00f5d4':statuses[qq.id]===S.REVIEW?'#f43f5e':'var(--text-muted)',
                    border:'1px solid',
                  }}>
                  {i+1}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{backgroundColor:'rgba(0,0,0,0.7)',backdropFilter:'blur(4px)'}}>
          <div className="glass p-8 max-w-sm w-full animate-slide-up">
            <AlertTriangle size={36} className="text-amber mx-auto mb-4" />
            <h2 className="text-xl font-display font-bold text-center mb-2" style={{color:'var(--text)'}}>Submit Exam?</h2>
            <p className="text-sm text-center mb-6" style={{color:'var(--text-muted)'}}>This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={()=>setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={()=>handleSubmit(false)} disabled={submitting} className="btn-primary flex-1 justify-center">
                {submitting?<Spinner size="sm" color="dark"/>:'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}