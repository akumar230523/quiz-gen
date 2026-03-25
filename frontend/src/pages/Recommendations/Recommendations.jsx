// FILE: frontend/src/pages/Recommendations/Recommendations.jsx
import { useState, useEffect } from 'react';
import Layout from '@/components/common/Layout';
import { tutorAPI, quizAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import {
    Zap, BookOpen, Video, FileText, Brain, Clock,
    Calendar, CheckCircle, TrendingUp, Star, RefreshCw,
    Target, Layers, ChevronRight
} from 'lucide-react';
import Spinner from '@/components/common/Spinner';
import toast from 'react-hot-toast';

const LEARNING_STYLES = [
    { value: 'visual', label: 'Visual', icon: '👁️', desc: 'Diagrams, charts, videos' },
    { value: 'reading', label: 'Reading', icon: '📖', desc: 'Articles, notes, books' },
    { value: 'kinesthetic', label: 'Practice', icon: '✍️', desc: 'Exercises, mock tests' },
    { value: 'auditory', label: 'Auditory', icon: '🎧', desc: 'Lectures, discussions' },
];

const EXAM_TYPES = ['JEE Main', 'NEET', 'UPSC', 'CAT', 'GATE', 'SSC CGL', 'SAT', 'GRE', 'IELTS', 'General'];

const TYPE_ICON = {
    video: { icon: Video, color: 'text-rose', bg: 'bg-rose/10' },
    article: { icon: FileText, color: 'text-neon', bg: 'bg-neon/10' },
    flashcard: { icon: Brain, color: 'text-violet-300', bg: 'bg-violet/10' },
    exercise: { icon: Target, color: 'text-amber', bg: 'bg-amber/10' },
    mock_test: { icon: CheckCircle, color: 'text-emerald', bg: 'bg-emerald/10' },
};
const EFF_COLOR = { high: 'badge-emerald', medium: 'badge-amber', low: 'badge-grey' };

const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Recommendations() {
    const { user } = useAuth();
    const [recs, setRecs] = useState(null);
    const [loading, setLoading] = useState(false);
    const [style, setStyle] = useState('visual');
    const [examType, setExamType] = useState('General');
    const [tab, setTab] = useState('resources'); // resources | plan | strategies

    const generate = async (autoLoad = false) => {
        setLoading(true);
        try {
            const res = await tutorAPI.recommendations({ learning_style: style, exam_type: examType });
            setRecs(res.data);
            if (!autoLoad) toast.success('Recommendations generated!');
        } catch { toast.error('Could not generate recommendations. Check AI config.'); }
        finally { setLoading(false); }
    };

    // Auto-load on mount
    useEffect(() => { generate(true); }, []);

    return (
        <Layout>
            <div className="page max-w-5xl">
                {/* Header */}
                <div className="mb-8">
                    <div className="badge-violet inline-flex mb-3"><Zap size={11} /> AI-Powered</div>
                    <h1 className="text-3xl font-display font-bold mb-1">Smart Recommendations</h1>
                    <p className="text-white/40 text-sm">Personalised study resources, strategies and weekly plan based on your performance</p>
                </div>

                {/* Config */}
                <div className="glass p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                        {/* Learning Style */}
                        <div>
                            <label className="label">Your Learning Style</label>
                            <div className="grid grid-cols-2 gap-2">
                                {LEARNING_STYLES.map(s => (
                                    <button key={s.value} onClick={() => setStyle(s.value)}
                                        className={`p-3 rounded-xl border text-left transition-all ${style === s.value
                                                ? 'bg-neon/10 border-neon/40 text-neon'
                                                : 'bg-white/5 border-white/10 text-white/60 hover:border-white/20'
                                            }`}
                                    >
                                        <span className="text-lg">{s.icon}</span>
                                        <p className="text-xs font-display font-semibold mt-1">{s.label}</p>
                                        <p className="text-xs text-white/30">{s.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Exam Type */}
                        <div>
                            <label className="label">Target Exam</label>
                            <select className="select" value={examType} onChange={e => setExamType(e.target.value)}>
                                {EXAM_TYPES.map(e => <option key={e}>{e}</option>)}
                            </select>

                            <div className="mt-4">
                                <label className="label">Motivational Milestone</label>
                                {recs?.milestone ? (
                                    <div className="p-3 bg-neon/5 border border-neon/15 rounded-xl">
                                        <p className="text-sm text-neon/80 font-body">{recs.milestone}</p>
                                    </div>
                                ) : (
                                    <div className="p-3 bg-white/5 rounded-xl text-white/30 text-sm">Generate to see your milestone →</div>
                                )}
                            </div>
                        </div>
                    </div>

                    <button onClick={() => generate(false)} disabled={loading} className="btn-primary">
                        {loading ? <><Spinner size="sm" /> Generating...</> : <><RefreshCw size={15} /> Regenerate Recommendations</>}
                    </button>

                    {recs?.motivational_message && (
                        <div className="mt-4 p-3 bg-violet/5 border border-violet/15 rounded-xl">
                            <p className="text-sm text-violet-300/80 font-body italic">💬 {recs.motivational_message}</p>
                        </div>
                    )}
                </div>

                {loading && <div className="flex justify-center py-16"><Spinner size="lg" /></div>}

                {recs && !loading && (
                    <>
                        {/* Priority Topics */}
                        {recs.priority_topics?.length > 0 && (
                            <div className="glass p-5 mb-5">
                                <h2 className="font-display font-semibold text-white flex items-center gap-2 mb-3">
                                    <Target size={15} className="text-rose" /> Priority Topics to Focus On
                                </h2>
                                <div className="flex flex-wrap gap-2">
                                    {recs.priority_topics.map((t, i) => (
                                        <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${i === 0 ? 'bg-rose/10 border-rose/30 text-rose' :
                                                i === 1 ? 'bg-amber/10 border-amber/30 text-amber' : 'bg-white/5 border-white/10 text-white/70'
                                            }`}>
                                            <span className="font-display font-bold text-xs">#{i + 1}</span>
                                            <span className="text-sm font-body">{t}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Tabs */}
                        <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-5 w-fit">
                            {[
                                { id: 'resources', label: 'Resources', icon: BookOpen },
                                { id: 'plan', label: 'Weekly Plan', icon: Calendar },
                                { id: 'strategies', label: 'Strategies', icon: Brain },
                            ].map(t => (
                                <button key={t.id} onClick={() => setTab(t.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-display font-semibold transition-all ${tab === t.id ? 'bg-neon text-ink' : 'text-white/50 hover:text-white'
                                        }`}
                                >
                                    <t.icon size={13} /> {t.label}
                                </button>
                            ))}
                        </div>

                        {/* ── Resources Tab ─────────────────────────── */}
                        {tab === 'resources' && (
                            <div className="space-y-3">
                                {recs.resources?.length > 0 ? (
                                    recs.resources.map((r, i) => {
                                        const ti = TYPE_ICON[r.type] || TYPE_ICON.article;
                                        return (
                                            <div key={i} className="glass p-5 flex items-start gap-4 group hover:border-white/20 transition-all">
                                                <div className={`w-11 h-11 rounded-xl ${ti.bg} flex items-center justify-center shrink-0`}>
                                                    <ti.icon size={20} className={ti.color} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2 flex-wrap">
                                                        <h3 className="font-display font-semibold text-white text-sm">{r.title}</h3>
                                                        <div className="flex gap-2 shrink-0">
                                                            <span className={`badge text-xs ${EFF_COLOR[r.effectiveness] || 'badge-grey'}`}>
                                                                {r.effectiveness} priority
                                                            </span>
                                                            <span className="badge-grey text-xs">{r.difficulty}</span>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-white/50 mt-1">{r.topic}</p>
                                                    <p className="text-xs text-white/40 mt-2 italic">{r.why_recommended}</p>
                                                    <div className="flex items-center gap-1 mt-2 text-xs text-white/30">
                                                        <Clock size={11} /> {r.estimated_time}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="glass p-10 text-center text-white/30">
                                        <BookOpen size={32} className="mx-auto mb-2 opacity-50" />
                                        <p>No resources generated yet. Click Regenerate above.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Weekly Plan Tab ───────────────────────── */}
                        {tab === 'plan' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {recs.weekly_plan?.length > 0 ? (
                                    recs.weekly_plan.map((day, i) => (
                                        <div key={i} className={`glass p-5 border-l-2 ${day.day === 'Sunday' ? 'border-emerald/50' :
                                                i < 3 ? 'border-neon/50' : 'border-violet/50'
                                            }`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-display font-bold text-white text-sm">{day.day}</span>
                                                <span className="badge-grey text-xs">{DAYS_SHORT[i]}</span>
                                            </div>
                                            <p className="text-sm text-white/80 font-body mb-2">{day.focus}</p>
                                            <p className="text-xs text-white/40">{day.activity}</p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-2 glass p-10 text-center text-white/30">
                                        <Calendar size={32} className="mx-auto mb-2 opacity-50" />
                                        <p>Weekly plan will appear here.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Strategies Tab ────────────────────────── */}
                        {tab === 'strategies' && (
                            <div className="space-y-4">
                                {recs.study_strategies?.length > 0 ? (
                                    recs.study_strategies.map((s, i) => (
                                        <div key={i} className="glass p-6 flex gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${s.effectiveness === 'high' ? 'bg-neon/15' : 'bg-white/10'
                                                }`}>
                                                {i === 0 ? '🔁' : i === 1 ? '💡' : i === 2 ? '🗺️' : '🎯'}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-display font-semibold text-white">{s.strategy}</h3>
                                                    <span className={`badge text-xs ${EFF_COLOR[s.effectiveness]}`}>
                                                        {s.effectiveness} effectiveness
                                                    </span>
                                                </div>
                                                <p className="text-sm text-white/70 font-body">{s.description}</p>
                                                <div className="flex items-center gap-1 mt-2 text-xs text-white/30">
                                                    <Clock size={11} /> {s.time_required}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="glass p-10 text-center text-white/30">
                                        <Brain size={32} className="mx-auto mb-2 opacity-50" />
                                        <p>Strategies will appear here.</p>
                                    </div>
                                )}

                                {/* Meta-learning tip */}
                                <div className="glass p-5 border border-neon/20 bg-neon/5">
                                    <h3 className="font-display font-semibold text-neon mb-2 flex items-center gap-2">
                                        <Star size={14} /> Meta-Learning Tip
                                    </h3>
                                    <p className="text-sm text-white/70">
                                        Combine <strong className="text-white">spaced repetition</strong> with <strong className="text-white">active recall</strong> —
                                        this combination has been shown to improve long-term retention by up to 200% compared to passive re-reading.
                                        Review each topic after 1 day, 3 days, 7 days, and 21 days.
                                    </p>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </Layout>
    );
}