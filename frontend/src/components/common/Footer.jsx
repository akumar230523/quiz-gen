/**
 * Footer.jsx  ─  Site footer with links, features list, and brand
*/

import { Link } from 'react-router-dom';
import { Zap, Github, Twitter, Mail, Heart } from 'lucide-react';

const PLATFORM_LINKS = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Take an Exam', href: '/countries' },
    { label: 'AI Practice', href: '/practice' },
    { label: 'AI Tutor', href: '/tutor' },
    { label: 'Performance', href: '/performance' },
    { label: 'Recommendations', href: '/recommendations' },
];

const INSTITUTE_LINKS = [
    { label: 'Create Exam', href: '/institute/create' },
    { label: 'My Exams', href: '/institute/exams' },
    { label: 'Analytics', href: '/institute/analytics' },
    { label: 'Find Exam', href: '/student/exams' },
];

const FEATURES = [
    'AI Question Generation',
    'Adaptive Difficulty',
    'Real-time Analytics',
    'Cheating Detection',
    'Personalised Study Plans',
    'Multi-country Exams',
];

export default function Footer() {
    return (
        <footer
            className="border-t mt-auto"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
        >
            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">

                    {/* Brand column */}
                    <div className="md:col-span-1">
                        <Link to="/" className="flex items-center gap-2 mb-4">
                            <div className="w-9 h-9 rounded-xl bg-neon flex items-center justify-center">
                                <Zap size={18} className="text-ink fill-ink" />
                            </div>
                            <span className="font-display font-bold text-xl" style={{ color: 'var(--text)' }}>
                                Quiz<span className="text-neon">Gen</span>
                            </span>
                        </Link>
                        <p className="text-sm font-body leading-relaxed mb-5" style={{ color: 'var(--text-muted)' }}>
                            AI-powered adaptive exam platform for students and educational institutions.
                        </p>
                        <div className="flex items-center gap-3">
                            {[
                                { icon: Github, label: 'GitHub' },
                                { icon: Twitter, label: 'Twitter' },
                                { icon: Mail, href: 'mailto:support@quizgen.ai', label: 'Email' },
                            ].map(({ icon: Icon, href = '#', label }) => (
                                <a
                                    key={label} href={href} aria-label={label}
                                    className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
                                    style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border-h)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                                >
                                    <Icon size={15} />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Platform links */}
                    <div>
                        <h3 className="font-display font-semibold text-sm mb-4" style={{ color: 'var(--text)' }}>Platform</h3>
                        <ul className="space-y-2.5">
                            {PLATFORM_LINKS.map(item => (
                                <li key={item.href}>
                                    <Link to={item.href} className="text-sm font-body transition-colors"
                                        style={{ color: 'var(--text-muted)' }}
                                        onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                                    >
                                        {item.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Institute links */}
                    <div>
                        <h3 className="font-display font-semibold text-sm mb-4" style={{ color: 'var(--text)' }}>Institute</h3>
                        <ul className="space-y-2.5">
                            {INSTITUTE_LINKS.map(item => (
                                <li key={item.href}>
                                    <Link to={item.href} className="text-sm font-body transition-colors"
                                        style={{ color: 'var(--text-muted)' }}
                                        onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                                    >
                                        {item.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Features */}
                    <div>
                        <h3 className="font-display font-semibold text-sm mb-4" style={{ color: 'var(--text)' }}>Features</h3>
                        <ul className="space-y-2.5">
                            {FEATURES.map(f => (
                                <li key={f} className="flex items-center gap-2 text-sm font-body" style={{ color: 'var(--text-muted)' }}>
                                    <div className="w-1 h-1 rounded-full bg-neon/60" />
                                    {f}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="h-px mb-6" style={{ backgroundColor: 'var(--border)' }} />
                <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                    <p className="text-xs font-body" style={{ color: 'var(--text-dim)' }}>
                        © {new Date().getFullYear()} QuizGen Platform. All rights reserved.
                    </p>
                    <p className="text-xs font-body flex items-center gap-1" style={{ color: 'var(--text-dim)' }}>
                        Made with <Heart size={11} className="text-rose fill-rose" /> using AI &amp; MongoDB Atlas
                    </p>
                    <div className="flex gap-4">
                        {['Privacy', 'Terms', 'Support'].map(l => (
                            <span
                                key={l}
                                className="text-xs cursor-pointer transition-colors"
                                style={{ color: 'var(--text-dim)' }}
                                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-muted)'}
                                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}
                            >
                                {l}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
}
