// FILE: frontend/src/pages/Exam/AdaptiveQuiz.jsx
import { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/common/Layout';
import { tutorAPI, quizAPI } from '@/services/api';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    Brain, ChevronRight, ChevronLeft, Send, TrendingUp,
    TrendingDown, Minus, Zap, Target, CheckCircle, XCircle
} from 'lucide-react';
import Spinner from '@/components/common/Spinner';
import toast from 'react-hot-toast';

const DIFF_ICON = { easy: TrendingDown, medium: Minus, hard: TrendingUp };
const DIFF_COLOR = { easy: 'text-emerald', medium: 'text-amber', hard: 'text-rose' };
const DIFF_BG = { easy: 'bg-emerald/10 border-emerald/20', medium: 'bg-amber/10 border-amber/20', hard: 'bg-rose/10 border-rose/20' };

export default function AdaptiveQuiz() {
    const [sp] = useSearchParams();
    const navigate = useNavigate();
    const topic = sp.get('topic') || 'General Knowledge';

    const [questions, setQuestions] = useState([]);
    const [answered, setAnswered] = useState([]);   // [{question, correct, difficulty, topic}]
    const [current, setCurrent] = useState(0);
    const [selected, setSelected] = useState(null);
    const [revealed, setRevealed] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [done, setDone] = useState(false);
    const [score, setScore] = useState({ correct: 0, total: 0 });

    // Load initial questions
    useEffect(() => {
        tutorAPI.adaptive({ topic, answered: [], count: 5 })
            .then(r => setQuestions(r.data.questions || []))
            .catch(() => toast.error('Failed to load adaptive quiz'))
            .finally(() => setLoading(false));
    }, [topic]);

    const q = questions[current];
    const accuracy = score.total ? score.correct / score.total : 1;
    const lastDiff = answered.at(-1)?.difficulty || 'medium';
    const nextDiff = accuracy >= 0.85 && lastDiff !== 'hard' ? 'hard'
        : accuracy < 0.5 && lastDiff !== 'easy' ? 'easy'
            : lastDiff;

    const DiffIcon = DIFF_ICON[nextDiff] || Minus;

    const confirmAnswer = () => {
        if (selected === null) return;
        const isCorrect = selected === q.correctAnswer;
        setRevealed(true);
        setScore(s => ({ correct: s.correct + (isCorrect ? 1 : 0), total: s.total + 1 }));
        setAnswered(a => [...a, {
            question: q.text, correct: isCorrect, difficulty: q.difficulty || 'medium', topic: q.topic || topic,
        }]);
    };

    const nextQuestion = async () => {
        setSelected(null); setRevealed(false);

        if (current < questions.length - 1) {
            setCurrent(c => c + 1);
        } else if (score.total >= 15) {
            setDone(true);
        } else {
            // Load more adaptive questions
            setLoadingMore(true);
            try {
                const res = await tutorAPI.adaptive({ topic, answered, count: 5 });
                setQuestions(prev => [...prev, ...(res.data.questions || [])]);
                setCurrent(c => c + 1);
            } catch { toast.error('Could not load next questions'); }
            finally { setLoadingMore(false); }
        }
    };

    // ── Done screen ────────────────────────────────────────────
    if (done) {
        const pct = score.total ? Math.round(score.correct / score.total * 100) : 0;
        return (
            <Layout>
                <div className="page-center">
                    <div className="glass p-12 max-w-md text-center animate-slide-up">
                        <div className={`w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center ${pct >= 80 ? 'bg-neon/20' : pct >= 60 ? 'bg-amber/20' : 'bg-rose/20'
                            }`}>
                            <span className="text-3xl font-display font-black">{pct}%</span>
                        </div>
                        <h1 className="text-2xl font-display font-bold mb-2">Adaptive Session Complete!</h1>
                        <p className="text-white/50 mb-2">{score.correct}/{score.total} correct · The quiz adapted to your level</p>
                        <div className="flex gap-3 mt-8">
                            <button onClick={() => window.location.reload()} className="btn-primary flex-1 justify-center">Try Again</button>
                            <button onClick={() => navigate('/practice')} className="btn-secondary flex-1 justify-center">Practice Mode</button>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    if (loading) return <Layout><div className="page-center"><Spinner size="lg" /></div></Layout>;
    if (!q) return <Layout><div className="page-center text-white/40">No questions available</div></Layout>;

    return (
        <Layout>
            {/* Top Bar */}
            <div className="fixed top-16 left-0 right-0 z-40 bg-ink/90 backdrop-blur-xl border-b border-white/8 px-4">
                <div className="max-w-3xl mx-auto h-14 flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Brain size={16} className="text-neon" />
                        <span className="font-display font-semibold text-sm">Adaptive Quiz — {topic}</span>
                    </div>
                    <div className="flex-1" />
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-semibold ${DIFF_BG[nextDiff]}`}>
                        <DiffIcon size={12} className={DIFF_COLOR[nextDiff]} />
                        <span className={DIFF_COLOR[nextDiff] + ' capitalize'}>{nextDiff}</span>
                    </div>
                    <span className="text-xs text-white/40">{score.correct}/{score.total} · Q{current + 1}</span>
                </div>
                <div className="h-1 bg-white/5">
                    <div className="h-full bg-gradient-to-r from-neon to-violet transition-all duration-500"
                        style={{ width: `${Math.min(100, (score.total / 15) * 100)}%` }} />
                </div>
            </div>

            <div className="pt-16 page max-w-3xl">
                <div className="glass p-8 mt-4 animate-fade-in">
                    {/* Question meta */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <span className="badge-neon text-xs">Q{current + 1}</span>
                            <span className="text-xs text-white/40">{q.topic || topic}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-white/40">
                            <Zap size={11} className="text-neon" /> AI adapted to your performance
                        </div>
                    </div>

                    <h2 className="text-lg font-display font-semibold text-white leading-relaxed mb-8">{q.text}</h2>

                    {/* Options */}
                    {q.options?.length > 0 && (
                        <div className="space-y-3 mb-6">
                            {q.options.map((opt, idx) => {
                                let cls = 'bg-white/5 border-white/10 text-white/80 hover:bg-white/8 hover:border-white/20';
                                if (revealed) {
                                    if (idx === q.correctAnswer) cls = 'bg-neon/15 border-neon/50 text-neon';
                                    else if (idx === selected) cls = 'bg-rose/15 border-rose/50 text-rose';
                                    else cls = 'bg-white/5 border-white/5 text-white/30';
                                } else if (selected === idx) cls = 'bg-neon/10 border-neon/50 text-neon';
                                return (
                                    <button key={idx} disabled={revealed}
                                        onClick={() => !revealed && setSelected(idx)}
                                        className={`w-full text-left px-5 py-4 rounded-xl border font-body text-sm transition-all duration-200 ${cls}`}
                                    >
                                        <span className={`inline-flex w-7 h-7 rounded-lg items-center justify-center text-xs font-display font-bold mr-3 ${revealed && idx === q.correctAnswer ? 'bg-neon text-ink'
                                                : revealed && idx === selected && idx !== q.correctAnswer ? 'bg-rose text-white'
                                                    : selected === idx ? 'bg-neon/20 text-neon' : 'bg-white/10 text-white/50'
                                            }`}>
                                            {revealed && idx === q.correctAnswer ? <CheckCircle size={13} />
                                                : revealed && idx === selected ? <XCircle size={13} />
                                                    : String.fromCharCode(65 + idx)}
                                        </span>
                                        {opt}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Explanation on reveal */}
                    {revealed && q.explanation && (
                        <div className="p-4 bg-neon/5 border border-neon/15 rounded-xl mb-6 animate-fade-in">
                            <p className="text-xs text-neon/70 font-display font-semibold mb-1">Explanation</p>
                            <p className="text-sm text-white/70 font-body">{q.explanation}</p>
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex justify-between">
                        <div />
                        {!revealed ? (
                            <button onClick={confirmAnswer} disabled={selected === null} className="btn-primary">
                                Confirm <Send size={14} />
                            </button>
                        ) : (
                            <button onClick={nextQuestion} disabled={loadingMore} className="btn-primary">
                                {loadingMore ? <Spinner size="sm" /> : <>Next <ChevronRight size={14} /></>}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}