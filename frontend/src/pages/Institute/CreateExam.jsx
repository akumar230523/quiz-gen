import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/common/Layout';
import { instituteAPI } from '@/services/api';
import {
    Building2, Wand2, Plus, Trash2, CheckCircle, Copy, ArrowRight,
    ChevronLeft, ChevronRight, Settings, BookOpen, Eye
} from 'lucide-react';
import Spinner from '@/components/common/Spinner';
import toast from 'react-hot-toast';

const STEPS = ['Exam Details', 'Questions', 'Review & Publish'];

const BLANK_Q = (type = 'mcq') => ({
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    type, text: '', marks: 1,
    options: type === 'mcq' ? ['', '', '', ''] : [],
    correctAnswer: 0,
});

export default function CreateExam() {
    const navigate = useNavigate();
    const [step, setStep] = useState(0);
    const [form, setForm] = useState({
        instituteName: '', name: '', description: '', type: 'mcq',
        duration: 60, totalMarks: 0, passingMarks: 0,
        subject: '', difficulty: 'medium',
        enableCheatingDetection: false, aiGenerate: false,
        questions: [],
    });
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiCount, setAiCount] = useState(5);
    const [aiLoading, setAiLoading] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [published, setPublished] = useState(null);

    const set = k => v => setForm(f => ({ ...f, [k]: typeof v === 'object' && v?.target ? v.target.value : v }));

    const addQ = type => setForm(f => ({ ...f, questions: [...f.questions, BLANK_Q(type)] }));
    const removeQ = i => setForm(f => ({ ...f, questions: f.questions.filter((_, j) => j !== i) }));
    const updateQ = (i, field, val) => setForm(f => {
        const qs = [...f.questions];
        qs[i] = { ...qs[i], [field]: val };
        return { ...f, questions: qs };
    });
    const updateOpt = (qi, oi, val) => setForm(f => {
        const qs = [...f.questions];
        const opts = [...qs[qi].options]; opts[oi] = val;
        qs[qi] = { ...qs[qi], options: opts };
        return { ...f, questions: qs };
    });

    const generateAI = async () => {
        if (!aiPrompt.trim()) { toast.error('Enter a prompt'); return; }
        setAiLoading(true);
        try {
            const res = await instituteAPI.generateQuestions({
                topic: aiPrompt, type: form.type, difficulty: form.difficulty,
                count: aiCount, description: form.description,
            });
            setForm(f => ({ ...f, questions: [...f.questions, ...(res.data.questions || [])] }));
            toast.success(`${res.data.count || aiCount} questions added!`);
        } catch { toast.error('AI generation failed'); }
        finally { setAiLoading(false); }
    };

    const publish = async () => {
        if (!form.instituteName || !form.name || !form.questions.length) {
            toast.error('Fill all required fields and add at least one question'); return;
        }
        setPublishing(true);
        const totalMarks = form.questions.reduce((s, q) => s + (q.marks || 1), 0);
        const examId = `${form.instituteName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
        try {
            const res = await instituteAPI.createExam({
                ...form, examId, totalMarks, passingMarks: Math.round(totalMarks * 0.4),
            });
            setPublished(res.data);
            toast.success('Exam published!');
        } catch (e) { toast.error(e.response?.data?.error || 'Failed to publish'); }
        finally { setPublishing(false); }
    };

    // ── Success screen ─────────────────────────────────────────
    if (published) {
        return (
            <Layout>
                <div className="page-center">
                    <div className="glass p-12 max-w-md text-center animate-slide-up">
                        <CheckCircle size={56} className="text-neon mx-auto mb-6 animate-float" />
                        <h1 className="text-2xl font-display font-bold mb-2">Exam Published!</h1>
                        <p className="text-white/50 mb-6">Share this Exam ID with your students.</p>
                        <div className="flex items-center gap-3 p-4 bg-neon/5 border border-neon/20 rounded-xl mb-6">
                            <span className="font-mono text-neon flex-1 text-sm break-all">{published.examId}</span>
                            <button onClick={() => { navigator.clipboard.writeText(published.examId); toast.success('Copied!'); }}
                                className="btn-ghost p-2 shrink-0">
                                <Copy size={16} />
                            </button>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => navigate('/institute/exams')} className="btn-primary flex-1 justify-center">
                                My Exams <ArrowRight size={14} />
                            </button>
                            <button onClick={() => { setPublished(null); setStep(0); setForm(f => ({ ...f, questions: [], name: '' })); }}
                                className="btn-secondary flex-1 justify-center">
                                Create Another
                            </button>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="page max-w-4xl">
                <h1 className="text-3xl font-display font-bold mb-2">Create Exam</h1>
                <p className="text-white/40 mb-8">Build and publish an exam for your students in minutes.</p>

                {/* Stepper */}
                <div className="flex items-center gap-2 mb-8">
                    {STEPS.map((s, i) => (
                        <div key={i} className="flex items-center gap-2 flex-1">
                            <button onClick={() => i < step && setStep(i)}
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-display font-bold transition-all ${i < step ? 'bg-neon text-ink cursor-pointer' : i === step ? 'bg-violet text-white' : 'bg-white/10 text-white/30'
                                    }`}
                            >{i < step ? <CheckCircle size={14} /> : i + 1}</button>
                            <span className={`text-sm font-display ${i === step ? 'text-white' : 'text-white/30'} hidden sm:block`}>{s}</span>
                            {i < STEPS.length - 1 && <div className={`flex-1 h-px ${i < step ? 'bg-neon' : 'bg-white/10'}`} />}
                        </div>
                    ))}
                </div>

                {/* ── Step 0: Details ─────────────────────────────── */}
                {step === 0 && (
                    <div className="glass p-8 space-y-5 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div><label className="label">Institute Name *</label><input className="input" placeholder="e.g. ABC College" value={form.instituteName} onChange={set('instituteName')} /></div>
                            <div><label className="label">Exam Name *</label><input className="input" placeholder="e.g. Midterm Test" value={form.name} onChange={set('name')} /></div>
                            <div className="md:col-span-2"><label className="label">Description</label><textarea className="input" rows={3} placeholder="Exam description..." value={form.description} onChange={set('description')} /></div>
                            <div>
                                <label className="label">Exam Type</label>
                                <select className="select" value={form.type} onChange={set('type')}>
                                    <option value="mcq">MCQ Only</option>
                                    <option value="descriptive">Descriptive Only</option>
                                    <option value="mixed">Mixed</option>
                                </select>
                            </div>
                            <div><label className="label">Duration (minutes)</label><input className="input" type="number" min={10} value={form.duration} onChange={set('duration')} /></div>
                            <div><label className="label">Subject</label><input className="input" placeholder="e.g. Mathematics" value={form.subject} onChange={set('subject')} /></div>
                            <div>
                                <label className="label">Difficulty</label>
                                <select className="select" value={form.difficulty} onChange={set('difficulty')}>
                                    <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl">
                            <input type="checkbox" id="cheat" checked={form.enableCheatingDetection}
                                onChange={e => set('enableCheatingDetection')(e.target.checked)} className="w-4 h-4 accent-neon" />
                            <label htmlFor="cheat" className="text-sm font-body text-white/70">Enable AI Cheating Detection (webcam monitoring)</label>
                        </div>

                        <button onClick={() => setStep(1)} className="btn-primary">
                            Next: Add Questions <ChevronRight size={16} />
                        </button>
                    </div>
                )}

                {/* ── Step 1: Questions ───────────────────────────── */}
                {step === 1 && (
                    <div className="space-y-5 animate-fade-in">
                        {/* AI Generator */}
                        <div className="glass p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Wand2 size={16} className="text-violet-300" />
                                <h2 className="font-display font-semibold text-white">AI Question Generator</h2>
                            </div>
                            <div className="flex gap-3 mb-3">
                                <input className="input flex-1" placeholder="Topic or instructions, e.g. 'JavaScript closures medium difficulty'" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} />
                                <input className="input w-20 text-center" type="number" min={1} max={20} value={aiCount} onChange={e => setAiCount(+e.target.value)} />
                                <button onClick={generateAI} disabled={aiLoading} className="btn-violet shrink-0">
                                    {aiLoading ? <Spinner size="sm" /> : <><Wand2 size={14} /> Generate</>}
                                </button>
                            </div>
                        </div>

                        {/* Questions list */}
                        <div className="space-y-4">
                            {form.questions.map((q, qi) => (
                                <div key={q.id} className="glass p-5">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="badge-violet text-xs">Q{qi + 1} · {q.type.toUpperCase()}</span>
                                        <button onClick={() => removeQ(qi)} className="btn-ghost p-1.5 text-rose/60 hover:text-rose">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <textarea className="input mb-3 resize-none" rows={2} placeholder="Question text..." value={q.text}
                                        onChange={e => updateQ(qi, 'text', e.target.value)} />
                                    {q.type === 'mcq' && q.options.map((opt, oi) => (
                                        <div key={oi} className="flex items-center gap-2 mb-2">
                                            <input type="radio" name={`correct-${qi}`} checked={q.correctAnswer === oi}
                                                onChange={() => updateQ(qi, 'correctAnswer', oi)} className="accent-neon" />
                                            <input className="input text-sm py-2" placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                                                value={opt} onChange={e => updateOpt(qi, oi, e.target.value)} />
                                        </div>
                                    ))}
                                    <div className="flex items-center gap-2 mt-2">
                                        <label className="text-xs text-white/40">Marks:</label>
                                        <input className="input w-16 text-center py-1.5 text-sm" type="number" min={1} value={q.marks}
                                            onChange={e => updateQ(qi, 'marks', +e.target.value)} />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Add buttons */}
                        <div className="flex gap-3">
                            {(form.type === 'mcq' || form.type === 'mixed') && (
                                <button onClick={() => addQ('mcq')} className="btn-secondary flex-1 justify-center">
                                    <Plus size={14} /> Add MCQ
                                </button>
                            )}
                            {(form.type === 'descriptive' || form.type === 'mixed') && (
                                <button onClick={() => addQ('descriptive')} className="btn-secondary flex-1 justify-center">
                                    <Plus size={14} /> Add Descriptive
                                </button>
                            )}
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setStep(0)} className="btn-ghost"><ChevronLeft size={16} /> Back</button>
                            <button onClick={() => setStep(2)} className="btn-primary" disabled={!form.questions.length}>
                                Review <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Step 2: Review ───────────────────────────────── */}
                {step === 2 && (
                    <div className="space-y-5 animate-fade-in">
                        <div className="glass p-6">
                            <h2 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
                                <Eye size={16} className="text-neon" /> Exam Summary
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { label: 'Institute', v: form.instituteName },
                                    { label: 'Exam Name', v: form.name },
                                    { label: 'Type', v: form.type.toUpperCase() },
                                    { label: 'Duration', v: `${form.duration} min` },
                                    { label: 'Difficulty', v: form.difficulty },
                                    { label: 'Subject', v: form.subject || '—' },
                                    { label: 'Questions', v: form.questions.length },
                                    { label: 'Total Marks', v: form.questions.reduce((s, q) => s + (q.marks || 1), 0) },
                                ].map(i => (
                                    <div key={i.label} className="p-3 bg-white/5 rounded-xl">
                                        <p className="text-xs text-white/40 mb-1">{i.label}</p>
                                        <p className="text-sm font-display font-semibold text-white truncate">{i.v}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="glass p-6 max-h-72 overflow-y-auto">
                            <h3 className="font-display font-semibold text-sm text-white/60 uppercase tracking-widest mb-4">Questions Preview</h3>
                            {form.questions.map((q, i) => (
                                <div key={q.id} className="flex gap-3 mb-3 text-sm">
                                    <span className="badge-grey shrink-0">Q{i + 1}</span>
                                    <p className="text-white/70 line-clamp-1">{q.text || '(empty question)'}</p>
                                    <span className="text-white/30 shrink-0">{q.marks}mk</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setStep(1)} className="btn-ghost"><ChevronLeft size={16} /> Back</button>
                            <button onClick={publish} disabled={publishing} className="btn-primary flex-1 justify-center">
                                {publishing ? <><Spinner size="sm" /> Publishing...</> : <><CheckCircle size={16} /> Publish Exam</>}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}