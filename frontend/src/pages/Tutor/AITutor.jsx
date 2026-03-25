// FILE: frontend/src/pages/Tutor/AITutor.jsx
import { useState, useRef, useEffect } from 'react';
import Layout from '@/components/common/Layout';
import { tutorAPI, quizAPI } from '@/services/api';
import {
    Send, Bot, User, Lightbulb, BookOpen, Sparkles,
    RotateCcw, ChevronDown, Brain, MessageCircle, Zap
} from 'lucide-react';
import Spinner from '@/components/common/Spinner';
import toast from 'react-hot-toast';

const SUBJECTS = [
    'General', 'Mathematics', 'Physics', 'Chemistry', 'Biology',
    'History', 'Geography', 'Economics', 'Computer Science',
    'English Literature', 'Law', 'Accounting',
];

const QUICK_PROMPTS = [
    'Explain this concept step by step',
    'Give me a real-world example',
    'What are common mistakes to avoid?',
    'How does this relate to the exam?',
    'Quiz me on this topic',
    'Create a memory trick for this',
];

function Message({ msg }) {
    const isUser = msg.role === 'user';
    return (
        <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isUser ? 'bg-violet text-white' : 'bg-neon/20 text-neon'
                }`}>
                {isUser ? <User size={15} /> : <Bot size={15} />}
            </div>

            {/* Bubble */}
            <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
                <div className={`px-4 py-3 rounded-2xl text-sm font-body leading-relaxed ${isUser
                        ? 'bg-violet text-white rounded-tr-sm'
                        : 'bg-white/8 border border-white/10 text-white/90 rounded-tl-sm'
                    }`}>
                    {msg.content}
                </div>

                {/* AI extras */}
                {!isUser && msg.meta && (
                    <div className="flex flex-wrap gap-2">
                        {msg.meta.follow_up_question && (
                            <div className="px-3 py-1.5 bg-amber/10 border border-amber/20 rounded-xl text-xs text-amber/80">
                                💭 {msg.meta.follow_up_question}
                            </div>
                        )}
                        {msg.meta.confidence_check && (
                            <div className="px-3 py-1.5 bg-neon/10 border border-neon/20 rounded-xl text-xs text-neon/80">
                                ✅ {msg.meta.confidence_check}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function ConceptCard({ data, onClose }) {
    if (!data) return null;
    return (
        <div className="glass p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-white flex items-center gap-2">
                    <Brain size={16} className="text-neon" /> {data.concept}
                </h3>
                <button onClick={onClose} className="btn-ghost p-1 text-xs">✕</button>
            </div>
            <div className="space-y-3">
                <div className="p-3 bg-neon/5 rounded-xl border border-neon/10">
                    <p className="text-xs text-white/50 mb-1">Simple Explanation</p>
                    <p className="text-sm text-white/80">{data.simple_explanation}</p>
                </div>
                {data.key_points?.length > 0 && (
                    <div>
                        <p className="text-xs text-white/50 mb-2">Key Points</p>
                        <ul className="space-y-1">
                            {data.key_points.map((p, i) => (
                                <li key={i} className="text-xs text-white/70 flex gap-2">
                                    <span className="text-neon mt-0.5">•</span>{p}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {data.memory_tip && (
                    <div className="p-3 bg-amber/5 rounded-xl border border-amber/10">
                        <p className="text-xs text-amber/70 mb-1">🧠 Memory Tip</p>
                        <p className="text-xs text-white/70">{data.memory_tip}</p>
                    </div>
                )}
                {data.practice_question && (
                    <div className="p-3 bg-violet/5 rounded-xl border border-violet/10">
                        <p className="text-xs text-violet-300/70 mb-1">Practice Question</p>
                        <p className="text-xs text-white/70">{data.practice_question}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function AITutor() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [subject, setSubject] = useState('General');
    const [loading, setLoading] = useState(false);
    const [conceptData, setConceptData] = useState(null);
    const [conceptInput, setConceptInput] = useState('');
    const [conceptLoading, setConceptLoading] = useState(false);
    const [tab, setTab] = useState('chat'); // chat | explain
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Welcome message
    useEffect(() => {
        setMessages([{
            role: 'assistant',
            content: `Hello! I'm your AI tutor. I'm here to help you understand any topic, solve problems step by step, and prepare for your exams. What would you like to learn today?`,
            meta: { follow_up_question: 'What subject or topic are you currently studying?' },
        }]);
    }, []);

    const sendMessage = async (text) => {
        const userText = (text || input).trim();
        if (!userText || loading) return;
        setInput('');

        const newMessages = [...messages, { role: 'user', content: userText }];
        setMessages(newMessages);
        setLoading(true);

        try {
            const res = await tutorAPI.chat({ messages: newMessages, subject });
            const { reply, ai_error, ...meta } = res.data;
            if (ai_error) {
                toast.error('AI tutor could not reach Gemini. Verify GEMINI_API_KEY on the server.', { duration: 7000 });
            }
            setMessages(m => [...m, { role: 'assistant', content: reply, meta }]);
        } catch {
            setMessages(m => [...m, {
                role: 'assistant',
                content: "I'm having trouble connecting right now. Please check your internet and try again.",
                meta: {},
            }]);
        } finally {
            setLoading(false);
        }
    };

    const explainConcept = async () => {
        if (!conceptInput.trim()) return;
        setConceptLoading(true);
        try {
            const res = await tutorAPI.explain({ concept: conceptInput, level: 'intermediate' });
            if (res.data?.ai_error) {
                toast.error('Gemini AI unavailable — check GEMINI_API_KEY in backend .env', { duration: 7000 });
            }
            setConceptData(res.data);
        } catch { toast.error('Could not explain concept'); }
        finally { setConceptLoading(false); }
    };

    const clearChat = () => {
        setMessages([{
            role: 'assistant',
            content: 'Chat cleared! What would you like to learn next?',
            meta: {},
        }]);
    };

    return (
        <Layout>
            <div className="page max-w-5xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <div className="badge-neon inline-flex mb-2"><Sparkles size={11} /> AI-Powered</div>
                        <h1 className="text-3xl font-display font-bold">AI Tutor</h1>
                        <p className="text-white/40 text-sm mt-1">24/7 personalised tutoring with step-by-step guidance</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <select
                            className="select text-sm py-2 px-3 w-44"
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                        >
                            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <button onClick={clearChat} className="btn-ghost text-xs gap-1">
                            <RotateCcw size={13} /> Clear
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-6 w-fit">
                    {[
                        { id: 'chat', icon: MessageCircle, label: 'Chat Tutor' },
                        { id: 'explain', icon: Lightbulb, label: 'Explain Concept' },
                    ].map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-display font-semibold transition-all ${tab === t.id ? 'bg-neon text-ink' : 'text-white/50 hover:text-white'
                                }`}
                        >
                            <t.icon size={14} /> {t.label}
                        </button>
                    ))}
                </div>

                {/* ── CHAT TAB ──────────────────────────────────────── */}
                {tab === 'chat' && (
                    <div className="glass flex flex-col" style={{ height: 'calc(100vh - 320px)', minHeight: '500px' }}>
                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-5">
                            {messages.map((msg, i) => <Message key={i} msg={msg} />)}
                            {loading && (
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-neon/20 flex items-center justify-center">
                                        <Bot size={15} className="text-neon" />
                                    </div>
                                    <div className="px-4 py-3 bg-white/8 border border-white/10 rounded-2xl rounded-tl-sm">
                                        <div className="flex gap-1 items-center h-4">
                                            {[0, 1, 2].map(i => (
                                                <div key={i} className="w-1.5 h-1.5 rounded-full bg-neon/60 animate-bounce"
                                                    style={{ animationDelay: `${i * 150}ms` }} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={bottomRef} />
                        </div>

                        {/* Quick prompts */}
                        <div className="px-4 py-2 border-t border-white/8 flex gap-2 overflow-x-auto">
                            {QUICK_PROMPTS.map((p, i) => (
                                <button key={i} onClick={() => sendMessage(p)}
                                    className="shrink-0 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-white/60 hover:text-white hover:border-white/20 transition-all">
                                    {p}
                                </button>
                            ))}
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t border-white/8 flex gap-3">
                            <input
                                className="input flex-1 py-3"
                                placeholder={`Ask me anything about ${subject}…`}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                            />
                            <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
                                className="btn-primary px-4 shrink-0">
                                <Send size={16} />
                            </button>
                        </div>
                    </div>
                )}

                {/* ── EXPLAIN CONCEPT TAB ──────────────────────────── */}
                {tab === 'explain' && (
                    <div className="space-y-5">
                        <div className="glass p-6">
                            <h2 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
                                <Brain size={16} className="text-violet-300" /> Deep Concept Explanation
                            </h2>
                            <div className="flex gap-3">
                                <input
                                    className="input flex-1"
                                    placeholder="Enter any concept, e.g. 'photosynthesis', 'Newton's second law', 'compound interest'…"
                                    value={conceptInput}
                                    onChange={e => setConceptInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && explainConcept()}
                                />
                                <button onClick={explainConcept} disabled={conceptLoading || !conceptInput.trim()}
                                    className="btn-violet shrink-0">
                                    {conceptLoading ? <Spinner size="sm" /> : <><Lightbulb size={15} /> Explain</>}
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-3">
                                {['Photosynthesis', 'Newton\'s Laws', 'Supply and Demand', 'Pythagoras Theorem', 'DNA Replication', 'French Revolution'].map(c => (
                                    <button key={c} onClick={() => { setConceptInput(c); }}
                                        className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-white/50 hover:text-white hover:border-white/20 transition-all">
                                        {c}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {conceptData && (
                            <ConceptCard data={conceptData} onClose={() => setConceptData(null)} />
                        )}

                        {!conceptData && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[
                                    { icon: Zap, title: 'Instant Clarity', desc: 'Get ELI5 explanations in seconds' },
                                    { icon: BookOpen, title: 'Key Points', desc: 'Bullet-point summaries of every concept' },
                                    { icon: Brain, title: 'Memory Techniques', desc: 'Mnemonics and memory aids to remember better' },
                                ].map(c => (
                                    <div key={c.title} className="glass p-5 text-center">
                                        <c.icon size={24} className="text-neon mx-auto mb-3" />
                                        <h3 className="font-display font-semibold text-sm mb-1">{c.title}</h3>
                                        <p className="text-xs text-white/40">{c.desc}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Layout>
    );
}