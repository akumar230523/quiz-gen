// FILE: frontend/src/components/common/Footer.jsx

import { Link } from 'react-router-dom';
import { Zap, Github, Twitter, Mail, Heart } from 'lucide-react';

const LINKS = {
    Platform: [
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Take an Exam', href: '/countries' },
        { label: 'AI Practice', href: '/practice' },
        { label: 'AI Tutor', href: '/tutor' },
        { label: 'Performance', href: '/performance' },
        { label: 'Recommendations', href: '/recommendations' },
    ],
    Institute: [
        { label: 'Create Exam', href: '/institute/create' },
        { label: 'My Exams', href: '/institute/exams' },
        { label: 'Analytics', href: '/institute/analytics' },
        { label: 'Find Exam', href: '/student/exams' },
    ],
};

export default function Footer() {
    const year = new Date().getFullYear();
    return (
        <footer className="border-t border-white/8 bg-ink/50 backdrop-blur-xl mt-auto">
            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">

                    {/* Brand */}
                    <div className="md:col-span-1">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-9 h-9 rounded-xl bg-neon flex items-center justify-center">
                                <Zap size={18} className="text-ink fill-ink" />
                            </div>
                            <span className="font-display font-bold text-xl text-white">
                                Quiz<span className="text-neon">Gen</span>
                            </span>
                        </div>
                        <p className="text-sm text-white/40 font-body leading-relaxed mb-5">
                            AI-powered adaptive exam platform for students and educational institutions.
                            Powered by Google Gemini.
                        </p>
                        <div className="flex items-center gap-3">
                            <a href="#" className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/20 transition-all">
                                <Github size={15} />
                            </a>
                            <a href="#" className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/20 transition-all">
                                <Twitter size={15} />
                            </a>
                            <a href="mailto:support@quizgen.ai" className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/20 transition-all">
                                <Mail size={15} />
                            </a>
                        </div>
                    </div>

                    {/* Links */}
                    {Object.entries(LINKS).map(([section, items]) => (
                        <div key={section}>
                            <h3 className="font-display font-semibold text-white text-sm mb-4">{section}</h3>
                            <ul className="space-y-2.5">
                                {items.map(item => (
                                    <li key={item.href}>
                                        <Link to={item.href}
                                            className="text-sm text-white/40 hover:text-white transition-colors font-body">
                                            {item.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}

                    {/* Features */}
                    <div>
                        <h3 className="font-display font-semibold text-white text-sm mb-4">Features</h3>
                        <ul className="space-y-2.5">
                            {[
                                'AI Question Generation',
                                'Adaptive Difficulty',
                                'Real-time Analytics',
                                'Cheating Detection',
                                'Personalised Study Plans',
                                'Multi-country Exams',
                            ].map(f => (
                                <li key={f} className="flex items-center gap-2 text-sm text-white/40 font-body">
                                    <div className="w-1 h-1 rounded-full bg-neon/60" />
                                    {f}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="h-px bg-white/8 mb-6" />
                <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                    <p className="text-xs text-white/30 font-body">
                        © {year} QuizGen Platform. All rights reserved.
                    </p>
                    <p className="text-xs text-white/30 font-body flex items-center gap-1">
                        Made with <Heart size={11} className="text-rose fill-rose" /> using Google Gemini AI & MongoDB Atlas
                    </p>
                    <div className="flex gap-4">
                        <span className="text-xs text-white/30 hover:text-white/60 cursor-pointer transition-colors">Privacy</span>
                        <span className="text-xs text-white/30 hover:text-white/60 cursor-pointer transition-colors">Terms</span>
                        <span className="text-xs text-white/30 hover:text-white/60 cursor-pointer transition-colors">Support</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}