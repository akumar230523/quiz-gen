// FILE: frontend/src/components/common/Navbar.jsx

import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
    LayoutDashboard, BookOpen, GraduationCap, Building2,
    LogOut, User, Menu, X, ChevronDown, Zap,
    Brain, TrendingUp, Sparkles, Target, BarChart3, Globe
} from 'lucide-react';
import toast from 'react-hot-toast';

const STUDENT_NAV = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Take Exam', href: '/countries', icon: Globe },
    { label: 'Practice', href: '/practice', icon: Zap },
    { label: 'AI Tutor', href: '/tutor', icon: Brain },
    { label: 'Performance', href: '/performance', icon: TrendingUp },
    { label: 'Suggestions', href: '/recommendations', icon: Sparkles },
    { label: 'Find Exam', href: '/student/exams', icon: GraduationCap },
];

const INSTITUTE_NAV = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Create Exam', href: '/institute/create', icon: Building2 },
    { label: 'My Exams', href: '/institute/exams', icon: BookOpen },
    { label: 'Analytics', href: '/institute/analytics', icon: BarChart3 },
    { label: 'AI Tutor', href: '/tutor', icon: Brain },
    { label: 'Performance', href: '/performance', icon: TrendingUp },
];

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const [open, setOpen] = useState(false);
    const [drop, setDrop] = useState(false);

    const NAV = user?.role === 'institute' ? INSTITUTE_NAV : STUDENT_NAV;
    const DESKTOP = NAV.slice(0, 5);
    const OVERFLOW = NAV.slice(5);

    const handleLogout = async () => {
        await logout();
        toast.success('Signed out');
        navigate('/');
    };

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-ink/80 backdrop-blur-xl border-b border-white/8">
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

                <Link to="/dashboard" className="flex items-center gap-2 shrink-0">
                    <div className="w-8 h-8 rounded-lg bg-neon flex items-center justify-center">
                        <Zap size={16} className="text-ink fill-ink" />
                    </div>
                    <span className="font-display font-bold text-lg hidden sm:block">
                        Quiz<span className="text-neon">Gen</span>
                    </span>
                </Link>

                {/* Desktop */}
                <div className="hidden lg:flex items-center gap-0.5 flex-1">
                    {DESKTOP.map(n => (
                        <Link key={n.href} to={n.href}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-body transition-all ${pathname === n.href ? 'bg-neon/10 text-neon' : 'text-white/60 hover:text-white hover:bg-white/8'
                                }`}>
                            <n.icon size={13} />{n.label}
                        </Link>
                    ))}
                </div>

                {/* User */}
                <div className="flex items-center gap-2">
                    <div className="relative hidden md:block">
                        <button onClick={() => setDrop(d => !d)}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/8 transition-all">
                            <div className="w-7 h-7 rounded-full bg-violet flex items-center justify-center text-xs font-display font-bold text-white">
                                {user?.username?.[0]?.toUpperCase()}
                            </div>
                            <span className="text-sm text-white/80 hidden xl:block">{user?.username}</span>
                            <span className="text-xs px-1.5 py-0.5 rounded-full hidden xl:block" style={{ background: 'rgba(124,58,237,0.2)', color: '#b8aaff' }}>
                                {user?.role}
                            </span>
                            <ChevronDown size={13} className={`text-white/40 hidden xl:block transition-transform ${drop ? 'rotate-180' : ''}`} />
                        </button>
                        {drop && (
                            <div className="absolute right-0 top-full mt-2 w-52 glass rounded-xl py-2 shadow-card z-50">
                                <div className="px-3 py-2 border-b border-white/8 mb-1">
                                    <p className="text-xs text-white/40">Signed in as</p>
                                    <p className="text-sm font-display font-semibold text-white truncate">{user?.username}</p>
                                </div>
                                {OVERFLOW.map(n => (
                                    <Link key={n.href} to={n.href} onClick={() => setDrop(false)}
                                        className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/8 transition-all">
                                        <n.icon size={13} />{n.label}
                                    </Link>
                                ))}
                                <div className="border-t border-white/8 mt-1 pt-1">
                                    <Link to="/profile" onClick={() => setDrop(false)}
                                        className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/8 transition-all">
                                        <User size={13} />Profile
                                    </Link>
                                    <button onClick={handleLogout}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose/80 hover:text-rose hover:bg-rose/10 transition-all">
                                        <LogOut size={13} />Sign Out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    <button onClick={() => setOpen(o => !o)} className="p-2 rounded-lg hover:bg-white/10 lg:hidden">
                        {open ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>
            </div>

            {/* Mobile */}
            {open && (
                <div className="lg:hidden bg-ink/95 backdrop-blur-xl border-t border-white/8 px-4 py-3 space-y-1 overflow-y-auto max-h-[80vh]">
                    {NAV.map(n => (
                        <Link key={n.href} to={n.href} onClick={() => setOpen(false)}
                            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-body transition-all ${pathname === n.href ? 'bg-neon/10 text-neon' : 'text-white/70 hover:text-white hover:bg-white/8'
                                }`}>
                            <n.icon size={16} />{n.label}
                        </Link>
                    ))}
                    <div className="h-px bg-white/8 my-1" />
                    <Link to="/profile" onClick={() => setOpen(false)}
                        className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/8">
                        <User size={16} />Profile
                    </Link>
                    <button onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-rose/80 hover:text-rose hover:bg-rose/10">
                        <LogOut size={16} />Sign Out
                    </button>
                </div>
            )}
        </nav>
    );
}