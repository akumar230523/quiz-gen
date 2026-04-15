/**
 * Landing.jsx  ─  Public home page
 * Features: hero, stats, feature cards, how-it-works, CTA.
 * Fully theme-aware via CSS variables.
*/

import { Link } from 'react-router-dom';
import Footer from '@/components/common/Footer';
import ThemeToggle from '@/components/common/ThemeToggle';
import {
    Zap, Brain, BarChart3, Shield, ArrowRight, Star, Users,
    BookOpen, Trophy, Target, CheckCircle, Globe, Building2,
    TrendingUp, Sparkles,
} from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';

const FEATURES = [
    { icon: Brain, color: 'text-neon', bg: 'bg-neon/10', title: 'AI Question Generation', desc: 'Generates exam-quality MCQs and descriptive questions in seconds for any subject.' },
    { icon: BarChart3, color: 'text-violet-300', bg: 'bg-violet/10', title: 'Deep Performance Analytics', desc: 'Trend graphs, topic heatmaps, radar charts, and predictive risk alerts.' },
    { icon: Zap, color: 'text-amber', bg: 'bg-amber/10', title: 'Adaptive Practice Mode', desc: 'AI analyses weak areas and builds practice sessions that evolve with you.' },
    { icon: Shield, color: 'text-emerald', bg: 'bg-emerald/10', title: 'AI Cheating Detection', desc: 'Webcam monitoring flags face absence, multiple faces, and suspicious objects.' },
    { icon: Users, color: 'text-rose', bg: 'bg-rose/10', title: 'Institute Management', desc: 'Create exams, share a single exam ID, view class-wide analytics.' },
    { icon: BookOpen, color: 'text-neon', bg: 'bg-neon/10', title: 'AI Tutor 24/7', desc: 'Students chat with AI for concept explanations, hints, and personalised study plans.' },
];

const STATS = [
    { n: '50K+', label: 'Questions Generated' },
    { n: '200+', label: 'Exam Types' },
    { n: '12', label: 'Countries' },
    { n: '98%', label: 'Satisfaction' },
];

const HOW_IT_WORKS = [
    { step: '01', icon: Zap, title: 'Sign Up', desc: 'Create a free student or institute account in under 30 seconds.' },
    { step: '02', icon: Globe, title: 'Choose Your Exam', desc: 'Pick any country and exam — AI generates fresh questions every time.' },
    { step: '03', icon: Target, title: 'Take the Exam', desc: 'Real exam experience: timer, navigator, flag-for-review.' },
    { step: '04', icon: Brain, title: 'Get AI Feedback', desc: 'Instant insights, a personalised study plan, and recommendations.' },
];

const TESTIMONIALS = [
    { name: 'Priya Sharma', role: 'JEE Aspirant', avatar: 'P', text: 'The adaptive practice figured out exactly where I was weak in Physics. My score jumped 22 marks in 3 weeks.' },
    { name: 'Rahul Mehta', role: 'UPSC Student', avatar: 'R', text: 'AI Tutor explains concepts better than most YouTube videos. I can ask follow-ups at 2 AM and it never gets impatient.' },
    { name: 'Dr. Kapoor', role: 'Institute Director', avatar: 'K', text: 'We moved all our internal assessments to QuizGen. Exam creation takes 5 minutes, analytics are world-class.' },
];

export default function Landing() {
    usePageTitle('AI-Powered Exam Platform');

    return (
        <div className="min-h-screen overflow-x-hidden" style={{ backgroundColor: 'var(--bg)' }}>

            {/* ── Navbar ────────────────────────────────────────────────────── */}
            <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}>
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-neon flex items-center justify-center">
                            <Zap size={16} className="text-ink fill-ink" />
                        </div>
                        <span className="font-display font-bold text-lg" style={{ color: 'var(--text)' }}>
                            Quiz<span className="text-neon">Gen</span>
                        </span>
                    </div>
                    <div className="hidden md:flex items-center gap-6 text-sm" style={{ color: 'var(--text-muted)' }}>
                        {['Features', 'How it works', 'Testimonials'].map(l => (
                            <a key={l} href={`#${l.toLowerCase().replace(/ /g, '-')}`}
                                className="hover:text-neon transition-colors"
                                style={{ color: 'var(--text-muted)' }}>
                                {l}
                            </a>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <Link to="/login" className="btn-ghost text-sm py-2 px-4">Sign In</Link>
                        <Link to="/register" className="btn-primary text-sm py-2">Get Started <ArrowRight size={14} /></Link>
                    </div>
                </div>
            </nav>

            {/* ── Hero ──────────────────────────────────────────────────────── */}
            <section className="relative pt-32 pb-24 px-6 text-center overflow-hidden">
                <div className="orb w-[500px] h-[500px] bg-neon/12 -top-32 -left-32" />
                <div className="orb w-[400px] h-[400px] bg-violet/15 -top-20 -right-20" style={{ animationDelay: '2s' }} />

                <div className="relative z-10 max-w-4xl mx-auto animate-fade-in">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8"
                        style={{ background: 'rgba(0,245,212,0.1)', color: '#00f5d4', border: '1px solid rgba(0,245,212,0.2)' }}>
                        <Star size={11} className="fill-neon" /> AI-Powered Adaptive Learning Platform
                    </div>

                    <h1 className="text-5xl md:text-7xl font-display font-bold leading-tight mb-6" style={{ color: 'var(--text)' }}>
                        Learn Smarter.<br />
                        <span className="text-gradient-neon">Score Higher.</span>
                    </h1>

                    <p className="text-lg md:text-xl font-body max-w-2xl mx-auto mb-10 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                        QuizGen uses AI to generate exams, evaluate answers, personalise practice,
                        and deliver deep analytics — for students and institutions worldwide.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
                        <Link to="/register" className="btn-primary text-base px-8 py-4 w-full sm:w-auto justify-center">
                            Start for Free <ArrowRight size={16} />
                        </Link>
                        <Link to="/login" className="btn-secondary text-base px-8 py-4 w-full sm:w-auto justify-center">
                            I have an account
                        </Link>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                        No credit card required · Free forever for students
                    </p>
                </div>

                {/* Stats row */}
                <div className="relative z-10 mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
                    {STATS.map(s => (
                        <div key={s.n} className="glass py-5 text-center">
                            <div className="text-3xl font-display font-bold text-neon">{s.n}</div>
                            <div className="text-xs font-body mt-1" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Features ──────────────────────────────────────────────────── */}
            <section id="features" className="py-24 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-4"
                            style={{ background: 'rgba(124,58,237,0.12)', color: '#b8aaff', border: '1px solid rgba(124,58,237,0.2)' }}>
                            <Sparkles size={11} /> Powered by AI
                        </div>
                        <h2 className="text-4xl md:text-5xl font-display font-bold mb-4" style={{ color: 'var(--text)' }}>
                            Everything to <span className="text-gradient-violet">ace any exam</span>
                        </h2>
                        <p className="font-body text-lg max-w-xl mx-auto" style={{ color: 'var(--text-muted)' }}>
                            Every feature students and institutions need — from AI generation to real-time detection.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {FEATURES.map((f, i) => (
                            <div key={i} className="glass-hover p-6 group">
                                <div className={`w-12 h-12 rounded-xl ${f.bg} flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
                                    <f.icon size={22} className={f.color} />
                                </div>
                                <h3 className="font-display font-semibold mb-2 text-lg" style={{ color: 'var(--text)' }}>{f.title}</h3>
                                <p className="text-sm font-body leading-relaxed" style={{ color: 'var(--text-muted)' }}>{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── How it works ──────────────────────────────────────────────── */}
            <section id="how-it-works" className="py-24 px-6">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-display font-bold mb-4" style={{ color: 'var(--text)' }}>
                            Up and running in <span className="text-gradient-neon">minutes</span>
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {HOW_IT_WORKS.map((h, i) => (
                            <div key={i} className="glass p-6 flex gap-5">
                                <div className="w-12 h-12 rounded-2xl bg-neon/10 border border-neon/20 flex items-center justify-center shrink-0">
                                    <h.icon size={20} className="text-neon" />
                                </div>
                                <div>
                                    <div className="text-xs text-neon/50 font-mono mb-1">{h.step}</div>
                                    <h3 className="font-display font-bold mb-1" style={{ color: 'var(--text)' }}>{h.title}</h3>
                                    <p className="text-sm font-body leading-relaxed" style={{ color: 'var(--text-muted)' }}>{h.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── For students / institutes ──────────────────────────────────── */}
            <section className="py-24 px-6">
                <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Student */}
                    <div className="glass p-8" style={{ borderColor: 'rgba(0,245,212,0.2)', background: 'rgba(0,245,212,0.03)' }}>
                        <div className="w-12 h-12 rounded-xl bg-neon/15 flex items-center justify-center mb-5">
                            <Trophy size={22} className="text-neon" />
                        </div>
                        <h3 className="text-xl font-display font-bold mb-3" style={{ color: 'var(--text)' }}>For Students</h3>
                        <ul className="space-y-3 mb-6">
                            {['Country-based exam practice', 'AI Tutor 24/7', 'Personalised practice', 'Score trends & heatmap', 'Risk analysis & study plan', 'Find institute exams by ID'].map(i => (
                                <li key={i} className="flex items-center gap-2.5 text-sm font-body" style={{ color: 'var(--text-muted)' }}>
                                    <CheckCircle size={14} className="text-neon shrink-0" />{i}
                                </li>
                            ))}
                        </ul>
                        <Link to="/register?role=student" className="btn-primary text-sm w-full justify-center">
                            Start Learning Free <ArrowRight size={14} />
                        </Link>
                    </div>

                    {/* Institute */}
                    <div className="glass p-8" style={{ borderColor: 'rgba(124,58,237,0.2)', background: 'rgba(124,58,237,0.03)' }}>
                        <div className="w-12 h-12 rounded-xl bg-violet/15 flex items-center justify-center mb-5">
                            <Building2 size={22} className="text-violet-300" />
                        </div>
                        <h3 className="text-xl font-display font-bold mb-3" style={{ color: 'var(--text)' }}>For Institutes</h3>
                        <ul className="space-y-3 mb-6">
                            {['AI exam creation in minutes', 'Share via single exam ID', 'Real-time cheating detection', 'Class-wide analytics', 'Student ranking & leaderboard', 'Export results & reports'].map(i => (
                                <li key={i} className="flex items-center gap-2.5 text-sm font-body" style={{ color: 'var(--text-muted)' }}>
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

            {/* ── Testimonials ─────────────────────────────────────────────── */}
            <section id="testimonials" className="py-24 px-6">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-display font-bold" style={{ color: 'var(--text)' }}>
                            Loved by students &amp; educators
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {TESTIMONIALS.map((t, i) => (
                            <div key={i} className="glass p-6">
                                <div className="flex items-center gap-1 mb-3">
                                    {[...Array(5)].map((_, j) => <Star key={j} size={13} className="text-amber fill-amber" />)}
                                </div>
                                <p className="text-sm font-body leading-relaxed mb-5" style={{ color: 'var(--text-muted)' }}>
                                    "{t.text}"
                                </p>
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-violet flex items-center justify-center font-display font-bold text-white text-sm">
                                        {t.avatar}
                                    </div>
                                    <div>
                                        <p className="text-sm font-display font-semibold" style={{ color: 'var(--text)' }}>{t.name}</p>
                                        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>{t.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA ───────────────────────────────────────────────────────── */}
            <section className="py-24 px-6">
                <div className="max-w-3xl mx-auto glass p-12 text-center relative overflow-hidden"
                    style={{ borderColor: 'rgba(0,245,212,0.15)' }}>
                    <div className="absolute inset-0 pointer-events-none"
                        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(0,245,212,0.06) 0%, transparent 70%)' }} />
                    <Trophy size={48} className="text-neon mx-auto mb-6 animate-float" />
                    <h2 className="text-4xl font-display font-bold mb-4" style={{ color: 'var(--text)' }}>
                        Ready to transform your results?
                    </h2>
                    <p className="font-body mb-8 max-w-lg mx-auto leading-relaxed" style={{ color: 'var(--text-muted)' }}>
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
