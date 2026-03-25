import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, Zap, ArrowRight, Lock, User, Mail, Building2, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';
import Spinner from '@/components/common/Spinner';

export default function Register() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ username: '', email: '', password: '', role: 'student' });
    const [show, setShow] = useState(false);
    const [loading, setLoading] = useState(false);

    const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

    const submit = async e => {
        e.preventDefault();
        if (!form.username || !form.password) { toast.error('Fill required fields'); return; }
        if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
        setLoading(true);
        try {
            const user = await register(form);
            toast.success(`Account created! Welcome, ${user.username}!`);
            navigate('/dashboard');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Registration failed');
        } finally { setLoading(false); }
    };

    return (
        <div className="page-center py-12">
            <div className="orb w-80 h-80 bg-violet/20 top-0 right-0 pointer-events-none" />
            <div className="orb w-64 h-64 bg-neon/20 bottom-0 left-0 pointer-events-none" />

            <div className="relative z-10 w-full max-w-md">
                <Link to="/" className="flex items-center justify-center gap-2 mb-10">
                    <div className="w-10 h-10 rounded-xl bg-neon flex items-center justify-center">
                        <Zap size={20} className="text-ink fill-ink" />
                    </div>
                    <span className="font-display font-bold text-2xl">Quiz<span className="text-neon">Gen</span></span>
                </Link>

                <div className="glass p-8 animate-slide-up">
                    <h1 className="text-2xl font-display font-bold mb-1">Create account</h1>
                    <p className="text-sm text-white/40 mb-8">Join thousands learning smarter with AI.</p>

                    {/* Role toggle */}
                    <div className="grid grid-cols-2 gap-2 mb-6 p-1 bg-white/5 rounded-xl">
                        {[
                            { v: 'student', label: 'Student', icon: GraduationCap },
                            { v: 'institute', label: 'Institute', icon: Building2 },
                        ].map(r => (
                            <button key={r.v} type="button"
                                onClick={() => setForm(f => ({ ...f, role: r.v }))}
                                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-display font-semibold transition-all ${form.role === r.v ? 'bg-neon text-ink' : 'text-white/50 hover:text-white'
                                    }`}
                            >
                                <r.icon size={15} /> {r.label}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={submit} className="space-y-4">
                        <div>
                            <label className="label">Username *</label>
                            <div className="relative">
                                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                                <input className="input pl-10" placeholder="choose_username" value={form.username} onChange={set('username')} />
                            </div>
                        </div>
                        <div>
                            <label className="label">Email</label>
                            <div className="relative">
                                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                                <input className="input pl-10" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} />
                            </div>
                        </div>
                        <div>
                            <label className="label">Password *</label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                                <input className="input pl-10 pr-10" type={show ? 'text' : 'password'}
                                    placeholder="min. 6 characters" value={form.password} onChange={set('password')} />
                                <button type="button" onClick={() => setShow(s => !s)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="btn-primary w-full justify-center py-3.5 mt-2" disabled={loading}>
                            {loading ? <Spinner size="sm" /> : <><ArrowRight size={16} /> Create Account</>}
                        </button>
                    </form>

                    <p className="text-center text-sm text-white/40 mt-6">
                        Already have an account?{' '}
                        <Link to="/login" className="text-neon hover:text-neon-400 font-semibold transition-colors">Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}