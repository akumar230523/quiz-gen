/**
 * Practice.jsx  ─  AI-powered practice session configurator
 * Student picks country, exam, difficulty, type → AI generates questions.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/common/Layout';
import Spinner from '@/components/common/Spinner';
import { quizAPI, practiceAPI, getErrMsg } from '@/services/api';
import { Globe, Brain, ArrowRight, Sparkles, BookOpen, Clock, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/hooks/usePageTitle';

const EXAM_TYPES  = ['MCQ', 'Descriptive', 'Mixed'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

export default function Practice() {
  usePageTitle('Practice');
  const navigate = useNavigate();

  const [countries,    setCountries]    = useState([]);
  const [exams,        setExams]        = useState([]);
  const [loadingExams, setLoadingExams] = useState(false);
  const [preview,      setPreview]      = useState(null);
  const [generating,   setGenerating]   = useState(false);

  const [form, setForm] = useState({
    countryId: '', examId: '', examName: '',
    examType: 'MCQ', difficulty: 'Medium',
  });

  useEffect(() => {
    quizAPI.getCountries().then(r => setCountries(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!form.countryId) { setExams([]); setPreview(null); setForm(f => ({ ...f, examId: '', examName: '' })); return; }
    setLoadingExams(true);
    practiceAPI.getExams(form.countryId)
      .then(r => {
        const list = r.data?.exams || [];
        setExams(list);
        if (list.length > 0) setForm(f => ({ ...f, examId: list[0].id, examName: list[0].name }));
      })
      .catch(() => toast.error('Failed to load exams'))
      .finally(() => setLoadingExams(false));
  }, [form.countryId]);

  async function generate() {
    if (!form.countryId) { toast.error('Select a country'); return; }
    if (!form.examId)    { toast.error('Select an exam'); return; }
    setGenerating(true); setPreview(null);
    try {
      const res = await practiceAPI.generate({
        country_id: form.countryId, exam_id: form.examId,
        exam_name: form.examName, exam_type: form.examType.toLowerCase(),
        difficulty: form.difficulty.toLowerCase(), count: 10,
      });
      const data      = res.data?.practice || res.data;
      const questions = (data?.questions || []).map(q => ({
        ...q,
        text:          q.text          || q.question_text || '',
        question_text: q.question_text || q.text          || '',
      }));
      if (!questions.length) { toast.error('No questions generated. Try again.'); return; }
      setPreview({ ...data, questions });
      toast.success(`${questions.length} questions ready!`);
    } catch (err) {
      toast.error(getErrMsg(err));
    } finally { setGenerating(false); }
  }

  function start() {
    navigate('/practice/session', {
      state: {
        practiceData: preview,
        countryId: form.countryId, examId: form.examId,
        examName: form.examName,   examType: form.examType,
        difficulty: form.difficulty,
      },
    });
  }

  const selectedExam = exams.find(e => e.id === form.examId);

  return (
    <Layout>
      <div className="page max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <div className="badge-violet inline-flex mb-3"><Sparkles size={11} /> AI-Personalised</div>
          <h1 className="text-3xl font-display font-bold mb-1" style={{ color: 'var(--text)' }}>Practice Mode</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Real exam-level questions · AI adapts to your chosen exam</p>
        </div>

        {/* Config card */}
        <div className="glass p-6 mb-6">
          <h2 className="font-semibold mb-5 flex items-center gap-2" style={{ color: 'var(--text)' }}>
            <Globe size={16} className="text-neon" /> Configure Session
          </h2>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            {/* Country */}
            <div>
              <label className="label">Country</label>
              <select className="select" value={form.countryId} onChange={e => setForm(f => ({ ...f, countryId: e.target.value }))}>
                <option value="">Select Country</option>
                {countries.map(c => <option key={c._id} value={c._id}>{c.flag} {c.name}</option>)}
              </select>
            </div>

            {/* Exam */}
            <div>
              <label className="label">Exam</label>
              <div className="relative">
                <select className="select" value={form.examId} disabled={!form.countryId || loadingExams}
                  onChange={e => {
                    const chosen = exams.find(ex => ex.id === e.target.value);
                    setForm(f => ({ ...f, examId: e.target.value, examName: chosen?.name || '' }));
                    setPreview(null);
                  }}>
                  <option value="">{loadingExams ? 'Loading…' : !form.countryId ? 'Select country first' : 'Select Exam'}</option>
                  {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
                {loadingExams && <div className="absolute right-3 top-1/2 -translate-y-1/2"><Spinner size="sm" /></div>}
              </div>
            </div>
          </div>

          {/* Exam info */}
          {selectedExam && (
            <div className="p-3.5 rounded-xl mb-4 flex items-start gap-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <BookOpen size={15} className="text-violet-300 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{selectedExam.name}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{selectedExam.description}</p>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-dim)' }}>
                    <Clock size={10} /> {selectedExam.duration} min full paper
                  </span>
                  <span className={`text-xs font-semibold ${selectedExam.difficulty === 'hard' ? 'text-rose' : selectedExam.difficulty === 'medium' ? 'text-amber' : 'text-emerald'}`}>
                    {selectedExam.difficulty?.charAt(0).toUpperCase() + selectedExam.difficulty?.slice(1)} Level
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Type + Difficulty toggles */}
          <div className="grid md:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="label">Question Type</label>
              <div className="flex gap-2">
                {EXAM_TYPES.map(t => (
                  <button key={t} onClick={() => setForm(f => ({ ...f, examType: t }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${form.examType === t ? 'bg-neon text-ink' : ''}`}
                    style={form.examType !== t ? { backgroundColor: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' } : {}}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Difficulty</label>
              <div className="flex gap-2">
                {DIFFICULTIES.map(d => (
                  <button key={d} onClick={() => setForm(f => ({ ...f, difficulty: d }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                      form.difficulty === d
                        ? d === 'Easy' ? 'bg-emerald text-white' : d === 'Medium' ? 'bg-amber text-ink' : 'bg-rose text-white'
                        : ''}`}
                    style={form.difficulty !== d ? { backgroundColor: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' } : {}}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button onClick={generate} disabled={generating || !form.examId} className="btn-primary disabled:opacity-40">
            {generating ? <><Spinner size="sm" color="dark" /> Generating {form.examName} questions…</>
                        : <><Brain size={16} /> Generate Practice</>}
          </button>
        </div>

        {/* Preview */}
        {preview && (
          <div className="glass p-6">
            <div className="flex items-start justify-between mb-4 gap-4">
              <div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>{preview.session_title || form.examName}</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {preview.total_questions} questions · ~{preview.estimated_minutes} min · {form.difficulty}
                </p>
              </div>
              <span className="badge-neon text-xs">{form.examType}</span>
            </div>

            {/* Question previews */}
            <div className="space-y-3 mb-5">
              {preview.questions.slice(0, 3).map((q, i) => (
                <div key={i} className="p-4 rounded-xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs font-bold text-violet-300">Q{i + 1}</span>
                    {q.subject && <span className="badge-violet text-xs">{q.subject}</span>}
                    {q.topic   && <span className="badge-grey   text-xs">{q.topic}</span>}
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>
                    {q.question_text || q.text || 'Question unavailable'}
                  </p>
                </div>
              ))}
              {preview.questions.length > 3 && (
                <p className="text-xs" style={{ color: 'var(--text-dim)' }}>+ {preview.questions.length - 3} more questions</p>
              )}
            </div>

            <button onClick={start} className="btn-primary">
              Start Practice <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
