// FILE: frontend/src/pages/Landing.jsx

import { Link } from 'react-router-dom';
import Footer from '@/components/common/Footer';
import {
    Zap, Brain, BarChart3, Shield, ArrowRight, Star, Users,
    BookOpen, Trophy, Target, CheckCircle, Globe, Building2,
    TrendingUp, Sparkles, Play, ChevronRight
} from 'lucide-react';

const FEATURES = [
    { icon: Brain, color: 'text-neon', bg: 'bg-neon/10', title: 'AI Question Generation', desc: 'Google Gemini creates exam-quality MCQs and descriptive questions in seconds, tailored to any subject and difficulty.' },
    { icon: BarChart3, color: 'text-violet-300', bg: 'bg-violet/10', title: 'Deep Performance Analytics', desc: 'Trend graphs, topic heatmaps, radar charts and predictive risk alerts — every student gets a personal data dashboard.' },
    { icon: Zap, color: 'text-amber', bg: 'bg-amber/10', title: 'Adaptive Practice Mode', desc: 'AI analyses your weak areas and builds practice sessions that evolve with you — no two sessions are the same.' },
    { icon: Shield, color: 'text-emerald', bg: 'bg-emerald/10', title: 'AI Cheating Detection', desc: 'Webcam-based monitoring flags face absence, multiple faces, and suspicious objects in real-time during exams.' },
    { icon: Users, color: 'text-rose', bg: 'bg-rose/10', title: 'Institute Management', desc: 'Create exams, share a single exam ID, view class-wide analytics and leaderboards — zero setup overhead.' },
    { icon: BookOpen, color: 'text-neon', bg: 'bg-neon/10', title: 'AI Tutor 24/7', desc: 'Students chat with Gemini AI for concept explanations, step-by-step hints, memory tricks and personalised study plans.' },
];

const STATS = [
    { n: '50K+', label: 'Questions Generated' },
    { n: '200+', label: 'Exam Types' },
    { n: '12', label: 'Countries' },
    { n: '98%', label: 'Satisfaction' },
];

const HOW_IT_WORKS = [
    { step: '01', title: 'Sign Up', desc: 'Create a free student or institute account in under 30 seconds.', icon: Zap },
    { step: '02', title: 'Choose Your Exam', desc: 'Pick any country and exam type — AI generates fresh questions every time.', icon: Globe },
    { step: '03', title: 'Take the Exam', desc: 'Enjoy a real exam experience with timer, colour-coded navigator, and flag-for-review.', icon: Target },
    { step: '04', title: 'Get AI Feedback', desc: 'Receive instant insights, a study plan, and recommendations powered by Gemini AI.', icon: Brain },
];

const TESTIMONIALS = [
    { name: 'Priya Sharma', role: 'JEE Aspirant', text: "The adaptive practice mode figured out exactly where I was weak in Physics. My score jumped 22 marks in 3 weeks.", avatar: 'P' },
    { name: 'Rahul Mehta', role: 'UPSC Student', text: "AI Tutor explains concepts better than most YouTube videos. I can ask follow-up questions at 2 AM and it never gets impatient.", avatar: 'R' },
    { name: 'Dr. Kapoor', role: 'Institute Director', text: "We moved all our internal assessments to QuizGen. Exam creation takes 5 minutes, analytics are world-class.", avatar: 'K' },
];

function TestimonialCard({ t }) {
    return (
        <div className="glass p-6">
            <div className="flex items-center gap-1 mb-3">
                {[...Array(5)].map((_, i) => <Star key={i} size={13} className="text-amber fill-amber" />)}
            </div>
            <p className="text-sm text-white/70 font-body leading-relaxed mb-5">"{t.text}"</p>
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-violet flex items-center justify-center font-display font-bold text-white text-sm">{t.avatar}</div>
                <div>
                    <p className="text-sm font-display font-semibold text-white">{t.name}</p>
                    <p className="text-xs text-white/40">{t.role}</p>
                </div>
            </div>
        </div>
    );
}

export default function Landing() {
    return (
        <div className="min-h-screen bg-ink text-white overflow-x-hidden">

            {/* ── Nav ────────────────────────────────────────────────── */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-ink/80 backdrop-blur-xl border-b border-white/8">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-neon flex items-center justify-center">
                            <Zap size={16} className="text-ink fill-ink" />
                        </div>
                        <span className="font-display font-bold text-lg">Quiz<span className="text-neon">Gen</span></span>
                    </div>
                    <div className="hidden md:flex items-center gap-6">
                        {['Features', 'How it works', 'Testimonials'].map(l => (
                            <a key={l} href={`#${l.toLowerCase().replace(/ /g, '-')}`}
                                className="text-sm text-white/60 hover:text-white transition-colors">{l}</a>
                        ))}
                    </div>
                    <div className="flex items-center gap-3">
                        <Link to="/login" className="btn-ghost text-sm py-2 px-4">Sign In</Link>
                        <Link to="/register" className="btn-primary text-sm py-2">Get Started <ArrowRight size={14} /></Link>
                    </div>
                </div>
            </nav>

            {/* ── Hero ────────────────────────────────────────────────── */}
            <section className="relative pt-32 pb-28 px-6 text-center overflow-hidden">
                <div className="orb w-[500px] h-[500px] bg-neon/15 -top-32 -left-32 pointer-events-none" />
                <div className="orb w-[400px] h-[400px] bg-violet/20 -top-20 -right-20 pointer-events-none" style={{ animationDelay: '2s' }} />
                <div className="orb w-[300px] h-[300px] bg-violet/15 bottom-0 left-1/2 -translate-x-1/2 pointer-events-none" style={{ animationDelay: '4s' }} />

                <div className="relative z-10 max-w-4xl mx-auto animate-fade-in">
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600, background: 'rgba(0,245,212,0.1)', color: '#00f5d4', border: '1px solid rgba(0,245,212,0.2)', marginBottom: '32px' }}>
                        <Star size={11} className="fill-neon" /> AI-Powered Adaptive Learning Platform
                    </div>

                    <h1 className="text-5xl md:text-7xl font-display font-bold leading-none tracking-tight mb-6">
                        Learn Smarter.<br />
                        <span className="text-gradient-neon">Score Higher.</span>
                    </h1>

                    <p className="text-lg md:text-xl text-white/50 font-body max-w-2xl mx-auto mb-10 leading-relaxed">
                        QuizGen uses Google Gemini AI to generate exams, evaluate answers, personalise practice,
                        and deliver deep analytics — for students and institutions worldwide.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                        <Link to="/register" className="btn-primary text-base px-8 py-4 w-full sm:w-auto justify-center">
                            Start for Free <ArrowRight size={16} />
                        </Link>
                        <Link to="/login" className="btn-secondary text-base px-8 py-4 w-full sm:w-auto justify-center">
                            I have an account
                        </Link>
                    </div>
                    <p className="text-xs text-white/30">No credit card required · Free forever for students</p>
                </div>

                {/* Stats */}
                <div className="relative z-10 mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
                    {STATS.map(s => (
                        <div key={s.n} className="glass py-5 text-center">
                            <div className="text-3xl font-display font-bold text-neon">{s.n}</div>
                            <div className="text-xs text-white/40 font-body mt-1">{s.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Features ────────────────────────────────────────────── */}
            <section id="features" className="py-24 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600, background: 'rgba(124,58,237,0.15)', color: '#b8aaff', border: '1px solid rgba(124,58,237,0.25)', marginBottom: '16px' }}>
                            <Sparkles size={11} /> Powered by Gemini AI
                        </div>
                        <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
                            Everything to <span className="text-gradient-violet">ace any exam</span>
                        </h2>
                        <p className="text-white/40 text-lg max-w-xl mx-auto">
                            We've built every feature students and institutions need — from AI generation to real-time detection.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {FEATURES.map((f, i) => (
                            <div key={i} className="glass-hover p-6 group">
                                <div className={`w-12 h-12 rounded-xl ${f.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                    <f.icon size={22} className={f.color} />
                                </div>
                                <h3 className="font-display font-semibold text-white mb-2 text-lg">{f.title}</h3>
                                <p className="text-sm text-white/50 font-body leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── How it works ─────────────────────────────────────────── */}
            <section id="how-it-works" className="py-24 px-6">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
                            Up and running in <span className="text-gradient-neon">minutes</span>
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {HOW_IT_WORKS.map((h, i) => (
                            <div key={i} className="glass p-6 flex gap-5">
                                <div className="shrink-0">
                                    <div className="w-12 h-12 rounded-2xl bg-neon/10 border border-neon/20 flex items-center justify-center">
                                        <h.icon size={20} className="text-neon" />
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-neon/50 font-mono mb-1">{h.step}</div>
                                    <h3 className="font-display font-bold text-white mb-1">{h.title}</h3>
                                    <p className="text-sm text-white/50 font-body leading-relaxed">{h.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── For Students / Institutes ───────────────────────────── */}
            <section className="py-24 px-6">
                <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="glass p-8 border-neon/20 bg-neon/5 border">
                        <div className="w-12 h-12 rounded-xl bg-neon/15 flex items-center justify-center mb-5">
                            <Trophy size={22} className="text-neon" />
                        </div>
                        <h3 className="text-xl font-display font-bold mb-3">For Students</h3>
                        <ul className="space-y-3 mb-6">
                            {['Country-based exam practice', 'AI Tutor available 24/7', 'Personalised practice sessions', 'Score trend & topic heatmap', 'Risk analysis & study plan', 'Find institute exams by ID'].map(i => (
                                <li key={i} className="flex items-center gap-2.5 text-sm text-white/70">
                                    <CheckCircle size={14} className="text-neon shrink-0" />{i}
                                </li>
                            ))}
                        </ul>
                        <Link to="/register?role=student" className="btn-primary text-sm w-full justify-center">
                            Start Learning Free <ArrowRight size={14} />
                        </Link>
                    </div>

                    <div className="glass p-8 border-violet/20 bg-violet/5 border">
                        <div className="w-12 h-12 rounded-xl bg-violet/15 flex items-center justify-center mb-5">
                            <Building2 size={22} className="text-violet-300" />
                        </div>
                        <h3 className="text-xl font-display font-bold mb-3">For Institutes</h3>
                        <ul className="space-y-3 mb-6">
                            {['AI exam creation in minutes', 'Share via single exam ID', 'Real-time cheating detection', 'Class-wide performance analytics', 'Student ranking & leaderboard', 'Export results & reports'].map(i => (
                                <li key={i} className="flex items-center gap-2.5 text-sm text-white/70">
                                    <CheckCircle size={14} className="text-violet-300 shrink-0" />{i}
                                </li>
                            ))}
                        </ul>
                        <Link to="/register?role=institute" className="btn-violet text-sm w-full justify-center">
                            Create Institute Account <ArrowRight size={14} />
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── Testimonials ─────────────────────────────────────────── */}
            <section id="testimonials" className="py-24 px-6">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-display font-bold mb-4">Loved by students & educators</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {TESTIMONIALS.map((t, i) => <TestimonialCard key={i} t={t} />)}
                    </div>
                </div>
            </section>

            {/* ── CTA ─────────────────────────────────────────────────── */}
            <section className="py-24 px-6">
                <div className="max-w-3xl mx-auto glass p-12 text-center relative overflow-hidden border-neon/15 border">
                    <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(0,245,212,0.08) 0%, transparent 70%)' }} />
                    <Trophy size={48} className="text-neon mx-auto mb-6 animate-float" />
                    <h2 className="text-4xl font-display font-bold mb-4">
                        Ready to transform your exam results?
                    </h2>
                    <p className="text-white/50 mb-8 max-w-lg mx-auto leading-relaxed">
                        Join thousands of students and institutions already using QuizGen to learn smarter.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link to="/register" className="btn-primary text-base px-10 py-4 inline-flex justify-center">
                            Create Free Account <ArrowRight size={16} />
                        </Link>
                        <Link to="/login" className="btn-secondary text-base px-10 py-4 inline-flex justify-center">
                            Sign In
                        </Link>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}