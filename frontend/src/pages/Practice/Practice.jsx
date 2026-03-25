// FILE: frontend/src/pages/Practice/Practice.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/common/Layout';
import { quizAPI, practiceAPI } from '@/services/api';
import { Zap, Globe, Brain, RefreshCw, ArrowRight, Clock, BookOpen, Target, Sparkles } from 'lucide-react';
import Spinner from '@/components/common/Spinner';
import toast from 'react-hot-toast';

const EXAM_TYPES = ['MCQ', 'Descriptive', 'Mixed'];
const DIFFICULTY = ['Easy', 'Medium', 'Hard'];

export default function Practice() {
    const navigate = useNavigate();
    const [countries, setCountries] = useState([]);
    const [form, setForm] = useState({ country: '', examType: 'MCQ', difficulty: 'Medium' });
    const [preview, setPreview] = useState(null);
    const [generating, setGenerating] = useState(false);
    const [history, setHistory] = useState([]);

    useEffect(() => {
        quizAPI.getCountries().then(r => setCountries(r.data)).catch(() => { });
        practiceAPI.history({ page: 1, limit: 5 }).then(r => setHistory(r.data.sessions || [])).catch(() => { });
    }, []);

    const generate = async () => {
        if (!form.country) { toast.error('Select a country'); return; }
        setGenerating(true);
        try {
            const res = await practiceAPI.generate(form);
            setPreview(res.data.practice);
            toast.success('Practice session ready!');
        } catch { toast.error('AI generation failed. Check your GEMINI_API_KEY.'); }
        finally { setGenerating(false); }
    };

    const start = () => navigate('/practice/session', { state: { practiceData: preview, ...form } });

    return (
        <Layout>
            <div className="page max-w-5xl">
                <div className="mb-8">
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: '9999px', padding: '4px 12px', fontSize: '12px', color: '#b8aaff', marginBottom: '12px' }}>
                        <Sparkles size={11} /> AI-Personalised
                    </div>
                    <h1 className="text-3xl font-display font-bold mb-1">Practice Mode</h1>
                    <p className="text-white/40 text-sm">AI builds a session targeting your weak areas from past performance — no time limit.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                        {/* Config */}
                        <div className="glass p-6">
                            <h2 className="font-display font-semibold text-white mb-5 flex items-center gap-2"><Globe size={15} className="text-neon" />Configure Session</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                                <div><label className="label">Country</label>
                                    <select className="select" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}>
                                        <option value="">Select…</option>
                                        {countries.map(c => <option key={c._id} value={c.name}>{c.flag} {c.name}</option>)}
                                    </select>
                                </div>
                                <div><label className="label">Exam Type</label>
                                    <div className="flex rounded-xl overflow-hidden border border-white/10">
                                        {EXAM_TYPES.map(t => (
                                            <button key={t} onClick={() => setForm(f => ({ ...f, examType: t }))}
                                                className={`flex-1 py-3 text-xs font-display font-semibold transition-all ${form.examType === t ? 'bg-neon text-ink' : 'bg-white/5 text-white/50 hover:text-white'}`}>
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div><label className="label">Difficulty</label>
                                    <div className="flex rounded-xl overflow-hidden border border-white/10">
                                        {DIFFICULTY.map(d => (
                                            <button key={d} onClick={() => setForm(f => ({ ...f, difficulty: d }))}
                                                className={`flex-1 py-3 text-xs font-display font-semibold transition-all ${form.difficulty === d ? 'bg-violet text-white' : 'bg-white/5 text-white/50 hover:text-white'}`}>
                                                {d}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <button onClick={generate} disabled={generating || !form.country} className="btn-primary">
                                {generating ? <><Spinner size="sm" />Generating…</> : <><Brain size={15} />Generate Practice</>}
                            </button>
                        </div>

                        {/* Preview */}
                        {preview && (
                            <div className="glass p-6 animate-slide-up">
                                <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
                                    <div>
                                        <h2 className="font-display font-bold text-white">{preview.session_title || 'Practice Session'}</h2>
                                        <p className="text-xs text-white/40 mt-1">{preview.personalization_note}</p>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 600, background: 'rgba(0,245,212,0.15)', color: '#00f5d4', border: '1px solid rgba(0,245,212,0.2)' }}>
                                            {preview.total_questions || preview.questions?.length || 0} questions
                                        </span>
                                        <span style={{ display: 'inline-flex', padding: '4px 10px', borderRadius: '9999px', fontSize: '11px', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
                                            ~{preview.estimated_minutes || 20} min
                                        </span>
                                    </div>
                                </div>

                                {preview.message && (
                                    <div className="p-3 bg-neon/5 border border-neon/15 rounded-xl mb-4">
                                        <p className="text-xs text-neon/80">{preview.message}</p>
                                    </div>
                                )}

                                {/* Sample questions */}
                                <div className="space-y-2 mb-5">
                                    {(preview.questions || []).slice(0, 3).map((q, i) => (
                                        <div key={i} className="flex gap-3 p-3 bg-white/5 rounded-xl">
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 600, background: 'rgba(124,58,237,0.15)', color: '#b8aaff', border: '1px solid rgba(124,58,237,0.2)', shrink: 0 }}>Q{q.question_number || i + 1}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-white line-clamp-2">{q.question_text}</p>
                                                <div className="flex gap-3 mt-1 text-xs text-white/30">
                                                    <span>{q.topic}</span>
                                                    <span className={q.difficulty === 'Hard' ? 'text-rose' : q.difficulty === 'Medium' ? 'text-amber' : 'text-emerald'}>{q.difficulty}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {(preview.questions?.length || 0) > 3 && <p className="text-xs text-white/30 text-center">+{preview.questions.length - 3} more questions</p>}
                                </div>

                                <div className="flex gap-3">
                                    <button onClick={start} className="btn-primary flex-1 justify-center">Start Practice<ArrowRight size={14} /></button>
                                    <button onClick={() => { setPreview(null); }} className="btn-secondary">Regenerate</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        <div className="glass p-5">
                            <h3 className="font-display font-semibold text-sm text-white mb-4 flex items-center gap-2"><Clock size={13} className="text-neon" />How It Works</h3>
                            <div className="space-y-3">
                                {[
                                    { icon: Brain, title: 'AI Analyses', desc: 'Looks at your exam history to find weak topics' },
                                    { icon: Target, title: 'Targets Gaps', desc: '60% weak areas, 30% moderate, 10% strong' },
                                    { icon: Zap, title: 'No Time Limit', desc: 'Practice at your own pace — no pressure' },
                                    { icon: BookOpen, title: 'Explanations', desc: 'Every question has an AI learning objective' },
                                ].map(c => (
                                    <div key={c.title} className="flex gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-neon/10 flex items-center justify-center shrink-0">
                                            <c.icon size={14} className="text-neon" />
                                        </div>
                                        <div><p className="text-xs font-display font-semibold text-white">{c.title}</p><p className="text-xs text-white/40">{c.desc}</p></div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Past sessions */}
                        {history.length > 0 && (
                            <div className="glass p-5">
                                <h3 className="font-display font-semibold text-sm text-white mb-3">Recent Sessions</h3>
                                <div className="space-y-2">
                                    {history.map((s, i) => (
                                        <div key={i} className="p-2.5 bg-white/5 rounded-lg">
                                            <p className="text-xs font-body text-white truncate">{s.exam_name || 'Practice Session'}</p>
                                            <p className="text-xs text-white/30 mt-0.5">{s.questions_attempted || 0} attempted</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}