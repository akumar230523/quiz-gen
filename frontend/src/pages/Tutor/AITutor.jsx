/**
 * AITutor.jsx  ─  AI tutoring interface
 * Two tabs: Chat (multi-turn conversation) and Explain (concept deep-dives).
 */

import { useState, useRef, useEffect } from 'react';
import Layout from '@/components/common/Layout';
import Spinner from '@/components/common/Spinner';
import { tutorAPI, getErrMsg } from '@/services/api';
import { Send, Bot, User, Lightbulb, Brain, Sparkles, RotateCcw, MessageCircle, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/hooks/usePageTitle';

const SUBJECTS = ['General', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'History', 'Geography', 'Economics', 'Computer Science', 'English Literature', 'Law', 'Accounting'];
const QUICK_PROMPTS = ['Explain this step by step', 'Give me a real-world example', 'What are common mistakes?', 'Quiz me on this topic', 'Create a memory trick', 'How is this tested in exams?'];
const CONCEPT_CHIPS = ['Photosynthesis', "Newton's Laws", 'Supply and Demand', 'Pythagorean Theorem', 'DNA Replication', 'French Revolution'];

function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isUser ? 'bg-violet text-white' : 'bg-neon/20 text-neon'}`}>
        {isUser ? <User size={15} /> : <Bot size={15} />}
      </div>
      <div className={`max-w-[80%] flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`px-4 py-3 rounded-2xl text-sm font-body leading-relaxed ${isUser ? 'bg-violet text-white rounded-tr-sm' : 'rounded-tl-sm'}`}
          style={!isUser ? { backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' } : {}}>
          {msg.content}
        </div>
        {!isUser && msg.meta?.follow_up_question && (
          <div className="px-3 py-1.5 rounded-xl text-xs" style={{ backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }}>
            💭 {msg.meta.follow_up_question}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AITutor() {
  usePageTitle('AI Tutor');
  const [messages,       setMessages]       = useState([]);
  const [input,          setInput]          = useState('');
  const [subject,        setSubject]        = useState('General');
  const [chatLoading,    setChatLoading]    = useState(false);
  const [tab,            setTab]            = useState('chat');
  const [conceptInput,   setConceptInput]   = useState('');
  const [conceptData,    setConceptData]    = useState(null);
  const [conceptLoading, setConceptLoading] = useState(false);
  const bottomRef = useRef(null);

  // Welcome message
  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: "Hello! I'm your AI tutor, available 24/7. I can explain any concept, solve problems step by step, and help you prepare for your exams. What would you like to learn today?",
      meta: { follow_up_question: 'What subject or topic are you studying right now?' },
    }]);
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function sendMessage(text) {
    const msg = (text || input).trim();
    if (!msg || chatLoading) return;
    setInput('');
    const newMessages = [...messages, { role: 'user', content: msg }];
    setMessages(newMessages);
    setChatLoading(true);
    try {
      const res = await tutorAPI.chat({ messages: newMessages, subject });
      const { reply, ai_error, ...meta } = res.data;
      if (ai_error) toast.error('AI tutor temporarily unavailable');
      setMessages(m => [...m, { role: 'assistant', content: reply || "I'm having trouble connecting. Please try again.", meta }]);
    } catch (err) {
      setMessages(m => [...m, { role: 'assistant', content: "I'm having trouble connecting right now. Please try again shortly.", meta: {} }]);
    } finally { setChatLoading(false); }
  }

  async function explainConcept() {
    if (!conceptInput.trim()) return;
    setConceptLoading(true);
    try {
      const res = await tutorAPI.explain({ concept: conceptInput, level: 'intermediate' });
      setConceptData(res.data);
    } catch (err) {
      toast.error(getErrMsg(err));
    } finally { setConceptLoading(false); }
  }

  function clearChat() {
    setMessages([{ role: 'assistant', content: 'Chat cleared! What would you like to learn next?', meta: {} }]);
  }

  return (
    <Layout>
      <div className="page max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <div className="badge-neon inline-flex mb-2"><Sparkles size={11} /> AI-Powered</div>
            <h1 className="text-3xl font-display font-bold" style={{ color: 'var(--text)' }}>AI Tutor</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>24/7 personalised tutoring with step-by-step guidance</p>
          </div>
          <div className="flex items-center gap-3">
            <select className="select text-sm py-2 px-3 w-44" value={subject} onChange={e => setSubject(e.target.value)}>
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={clearChat} className="btn-ghost text-xs gap-1"><RotateCcw size={13} /> Clear</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl mb-6 w-fit" style={{ backgroundColor: 'var(--surface)' }}>
          {[{ id: 'chat', icon: MessageCircle, label: 'Chat Tutor' }, { id: 'explain', icon: Lightbulb, label: 'Explain Concept' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-display font-semibold transition-all ${tab === t.id ? 'bg-neon text-ink' : ''}`}
              style={tab !== t.id ? { color: 'var(--text-muted)' } : {}}>
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        {/* ── Chat tab ─────────────────────────────────────────────────────── */}
        {tab === 'chat' && (
          <div className="glass flex flex-col" style={{ height: 'calc(100vh - 340px)', minHeight: '500px' }}>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {messages.map((msg, i) => <Message key={i} msg={msg} />)}
              {chatLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-neon/20 flex items-center justify-center">
                    <Bot size={15} className="text-neon" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl rounded-tl-sm" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <div className="flex gap-1 items-center h-4">
                      {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-neon/60 animate-bounce" style={{ animationDelay: `${i*150}ms` }} />)}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick prompts */}
            <div className="px-4 py-2 flex gap-2 overflow-x-auto" style={{ borderTop: '1px solid var(--border)' }}>
              {QUICK_PROMPTS.map((p, i) => (
                <button key={i} onClick={() => sendMessage(p)}
                  className="shrink-0 px-3 py-1 rounded-full text-xs transition-all"
                  style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                  {p}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="p-4 flex gap-3" style={{ borderTop: '1px solid var(--border)' }}>
              <input className="input flex-1 py-3"
                placeholder={`Ask me anything about ${subject}…`}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              />
              <button onClick={() => sendMessage()} disabled={!input.trim() || chatLoading} className="btn-primary px-4 shrink-0">
                <Send size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── Explain tab ──────────────────────────────────────────────────── */}
        {tab === 'explain' && (
          <div className="space-y-5">
            <div className="glass p-6">
              <h2 className="font-display font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
                <Brain size={16} className="text-violet-300" /> Deep Concept Explanation
              </h2>
              <div className="flex gap-3 mb-3">
                <input className="input flex-1"
                  placeholder="Enter any concept, e.g. 'photosynthesis', 'Newton's 2nd law'…"
                  value={conceptInput}
                  onChange={e => setConceptInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && explainConcept()}
                />
                <button onClick={explainConcept} disabled={conceptLoading || !conceptInput.trim()} className="btn-violet shrink-0">
                  {conceptLoading ? <Spinner size="sm" /> : <><Lightbulb size={15} /> Explain</>}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {CONCEPT_CHIPS.map(c => (
                  <button key={c} onClick={() => setConceptInput(c)}
                    className="px-2.5 py-1 rounded-full text-xs transition-all"
                    style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {conceptData && (
              <div className="glass p-6 animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
                    <Brain size={16} className="text-neon" /> {conceptData.concept}
                  </h3>
                  <button onClick={() => setConceptData(null)} className="btn-ghost p-1 text-xs" style={{ color: 'var(--text-dim)' }}>✕</button>
                </div>
                <div className="space-y-4">
                  {conceptData.simple_explanation && (
                    <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(0,245,212,0.05)', border: '1px solid rgba(0,245,212,0.12)' }}>
                      <p className="text-xs text-neon/70 mb-1 font-semibold">Simple Explanation</p>
                      <p className="text-sm" style={{ color: 'var(--text)' }}>{conceptData.simple_explanation}</p>
                    </div>
                  )}
                  {conceptData.key_points?.length > 0 && (
                    <div>
                      <p className="text-xs mb-2 font-semibold" style={{ color: 'var(--text-muted)' }}>Key Points</p>
                      <ul className="space-y-1">
                        {conceptData.key_points.map((p, i) => (
                          <li key={i} className="text-xs flex gap-2" style={{ color: 'var(--text-muted)' }}>
                            <span className="text-neon mt-0.5">•</span>{p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {conceptData.memory_tip && (
                    <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.12)' }}>
                      <p className="text-xs mb-1 font-semibold" style={{ color: 'rgba(245,158,11,0.7)' }}>🧠 Memory Tip</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{conceptData.memory_tip}</p>
                    </div>
                  )}
                  {conceptData.practice_question && (
                    <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.12)' }}>
                      <p className="text-xs mb-1 font-semibold text-violet-300">Practice Question</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{conceptData.practice_question}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!conceptData && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { icon: Zap,    title: 'Instant Clarity',    desc: 'ELI5 explanations in seconds' },
                  { icon: Brain,  title: 'Key Points',         desc: 'Bullet-point concept summaries' },
                  { icon: Sparkles,title: 'Memory Techniques', desc: 'Mnemonics and memory aids' },
                ].map(c => (
                  <div key={c.title} className="glass p-5 text-center">
                    <c.icon size={24} className="text-neon mx-auto mb-3" />
                    <h3 className="font-display font-semibold text-sm mb-1" style={{ color: 'var(--text)' }}>{c.title}</h3>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.desc}</p>
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
