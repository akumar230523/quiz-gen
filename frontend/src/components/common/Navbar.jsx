/**
 * Navbar.jsx  ─  Top navigation bar
 * ─────────────────────────────────────────────────────────────────────────────
 * Features:
 *  - Responsive: desktop shows links inline, mobile shows a slide-down drawer
 *  - Role-aware: shows different links for students vs institute users
 *  - Active link highlighting via React Router's useLocation
 *  - User dropdown with click-outside-to-close
 *  - Theme toggle button (dark / light)
 *  - Logout with toast confirmation
 * ─────────────────────────────────────────────────────────────────────────────
*/

import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import ThemeToggle from './ThemeToggle';
import {
    LayoutDashboard, BookOpen, GraduationCap, Building2, LogOut,
    User, Menu, X, ChevronDown, Zap, Brain, TrendingUp,
    Sparkles, Target, BarChart3, Globe, Printer,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Navigation link definitions ───────────────────────────────────────────
const STUDENT_NAV = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Take Exam', href: '/countries', icon: Globe },
    { label: 'Practice', href: '/practice', icon: Zap },
    { label: 'AI Tutor', href: '/tutor', icon: Brain },
    { label: 'Performance', href: '/performance', icon: TrendingUp },
    { label: 'Suggestions', href: '/recommendations', icon: Sparkles },
    { label: 'Find Exam', href: '/student/exams', icon: GraduationCap },
    { label: 'Offline Quiz', href: '/offline', icon: Printer },
];

const INSTITUTE_NAV = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Create Exam', href: '/institute/create', icon: Building2 },
    { label: 'My Exams', href: '/institute/exams', icon: BookOpen },
    { label: 'Analytics', href: '/institute/analytics', icon: BarChart3 },
    { label: 'AI Tutor', href: '/tutor', icon: Brain },
];

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { pathname } = useLocation();

    const [mobileOpen, setMobileOpen] = useState(false);  // hamburger drawer
    const [dropOpen, setDropOpen] = useState(false);  // user dropdown

    // Ref for click-outside detection on the dropdown
    const dropRef = useRef(null);

    // Close dropdown when clicking outside it
    useEffect(() => {
        function handleClickOutside(e) {
            if (dropRef.current && !dropRef.current.contains(e.target)) {
                setDropOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close mobile drawer on route change
    useEffect(() => { setMobileOpen(false); }, [pathname]);

    const NAV = user?.role === 'institute' ? INSTITUTE_NAV : STUDENT_NAV;
    // First 5 links go in the desktop bar; extras go in the dropdown
    const DESKTOP = NAV.slice(0, 5);
    const OVERFLOW = NAV.slice(5);

    // Active link style helper
    const linkCls = (href) =>
        `flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-body transition-all ${pathname === href ? 'bg-neon/10 text-neon' : 'hover:bg-white/8'
        }`;

    const handleLogout = async () => {
        setDropOpen(false);
        await logout();
        toast.success('Signed out successfully');
        navigate('/');
    };

    // Avatar initial
    const initial = user?.username?.[0]?.toUpperCase() || '?';

    return (
        <nav
            className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b"
            style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
        >
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

                {/* ── Logo ────────────────────────────────────────────────────── */}
                <Link to="/dashboard" className="flex items-center gap-2 shrink-0">
                    <div className="w-8 h-8 rounded-lg bg-neon flex items-center justify-center">
                        <Zap size={16} className="text-ink fill-ink" />
                    </div>
                    <span className="font-display font-bold text-lg hidden sm:block" style={{ color: 'var(--text)' }}>
                        Quiz<span className="text-neon">Gen</span>
                    </span>
                </Link>

                {/* ── Desktop links ────────────────────────────────────────────── */}
                <div className="hidden lg:flex items-center gap-0.5 flex-1" style={{ color: 'var(--text-muted)' }}>
                    {DESKTOP.map(n => (
                        <Link key={n.href} to={n.href} className={linkCls(n.href)}>
                            <n.icon size={13} />
                            {n.label}
                        </Link>
                    ))}
                </div>

                {/* ── Right side: theme toggle + user ─────────────────────────── */}
                <div className="flex items-center gap-1">
                    {/* Theme toggle */}
                    <ThemeToggle />

                    {/* User dropdown (md+) */}
                    <div className="relative hidden md:block" ref={dropRef}>
                        <button
                            onClick={() => setDropOpen(d => !d)}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
                            style={{ color: 'var(--text)' }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--surface)'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            {/* Avatar circle */}
                            <div className="w-7 h-7 rounded-full bg-violet flex items-center justify-center text-xs font-display font-bold text-white">
                                {initial}
                            </div>
                            <span className="text-sm hidden xl:block" style={{ color: 'var(--text-muted)' }}>
                                {user?.username}
                            </span>
                            <ChevronDown
                                size={13}
                                className={`hidden xl:block transition-transform duration-200 ${dropOpen ? 'rotate-180' : ''}`}
                                style={{ color: 'var(--text-dim)' }}
                            />
                        </button>

                        {/* Dropdown panel */}
                        {dropOpen && (
                            <div
                                className="absolute right-0 top-full mt-2 w-56 rounded-xl py-2 shadow-xl z-50 animate-fade-in"
                                style={{ backgroundColor: 'var(--bg)' }}
                            >
                                {/* User info header */}
                                <div className="px-3 py-2 mb-1" style={{ borderBottom: '1px solid var(--border)' }}>
                                    <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Signed in as</p>
                                    <p className="text-sm font-display font-semibold truncate" style={{ color: 'var(--text)' }}>
                                        {user?.username}
                                    </p>
                                </div>

                                {/* Overflow nav links */}
                                {OVERFLOW.map(n => (
                                    <Link
                                        key={n.href} to={n.href}
                                        onClick={() => setDropOpen(false)}
                                        className="flex items-center gap-2 px-3 py-2 text-sm transition-all"
                                        style={{ color: 'var(--text-muted)' }}
                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--surface)'}
                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <n.icon size={13} />
                                        {n.label}
                                    </Link>
                                ))}

                                {/* Divider */}
                                <div className="my-1" style={{ borderTop: '1px solid var(--border)' }} />

                                {/* Profile + Sign Out */}
                                <Link
                                    to="/profile"
                                    onClick={() => setDropOpen(false)}
                                    className="flex items-center gap-2 px-3 py-2 text-sm transition-all"
                                    style={{ color: 'var(--text-muted)' }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--surface)'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <User size={13} />
                                    Profile
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose transition-all"
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(244,63,94,0.08)'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <LogOut size={13} />
                                    Sign Out
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Hamburger (mobile) */}
                    <button
                        onClick={() => setMobileOpen(o => !o)}
                        className="p-2 rounded-lg lg:hidden transition-all"
                        style={{ color: 'var(--text-muted)' }}
                        aria-label="Toggle menu"
                    >
                        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>
            </div>

            {/* ── Mobile drawer ────────────────────────────────────────────── */}
            {mobileOpen && (
                <div
                    className="lg:hidden backdrop-blur-xl border-t px-4 py-3 space-y-1 overflow-y-auto max-h-[80vh]"
                    style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}
                >
                    {NAV.map(n => (
                        <Link
                            key={n.href} to={n.href}
                            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-body transition-all ${pathname === n.href ? 'bg-neon/10 text-neon' : ''
                                }`}
                            style={{ color: pathname === n.href ? undefined : 'var(--text-muted)' }}
                        >
                            <n.icon size={16} />
                            {n.label}
                        </Link>
                    ))}

                    <div className="h-px my-2" style={{ backgroundColor: 'var(--border)' }} />

                    <Link
                        to="/profile"
                        className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        <User size={16} /> Profile
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-rose"
                    >
                        <LogOut size={16} /> Sign Out
                    </button>
                </div>
            )}
        </nav>
    );
}