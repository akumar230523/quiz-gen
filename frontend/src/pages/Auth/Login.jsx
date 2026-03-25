import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, Zap, ArrowRight, Lock, User } from 'lucide-react';
import toast from 'react-hot-toast';
import Spinner from '@/components/common/Spinner';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ username: '', password: '' });
    const [show, setShow] = useState(false);
    const [loading, setLoading] = useState(false);

    const submit = async e => {
        e.preventDefault();
        if (!form.username || !form.password) { toast.error('Fill all fields'); return; }
        setLoading(true);
        try {
            const user = await login(form.username, form.password);
            toast.success(`Welcome back, ${user.username}!`);
            navigate('/dashboard');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Login failed');
        } finally { setLoading(false); }
    };

    return (
        <div className="page-center">
            <div className="orb w-80 h-80 bg-neon/20 top-0 left-0 pointer-events-none" />
            <div className="orb w-64 h-64 bg-violet/20 bottom-0 right-0 pointer-events-none" />

            <div className="relative z-10 w-full max-w-md">
                {/* Logo */}
                <Link to="/" className="flex items-center justify-center gap-2 mb-10">
                    <div className="w-10 h-10 rounded-xl bg-neon flex items-center justify-center">
                        <Zap size={20} className="text-ink fill-ink" />
                    </div>
                    <span className="font-display font-bold text-2xl">Quiz<span className="text-neon">Gen</span></span>
                </Link>

                <div className="glass p-8 animate-slide-up">
                    <h1 className="text-2xl font-display font-bold text-white mb-1">Welcome back</h1>
                    <p className="text-sm text-white/40 font-body mb-8">Sign in to your account to continue.</p>

                    <form onSubmit={submit} className="space-y-5">
                        <div>
                            <label className="label">Username</label>
                            <div className="relative">
                                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                                <input className="input pl-10" placeholder="your_username"
                                    value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
                            </div>
                        </div>
                        <div>
                            <label className="label">Password</label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                                <input className="input pl-10 pr-10" type={show ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                                <button type="button" onClick={() => setShow(s => !s)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="btn-primary w-full justify-center py-3.5" disabled={loading}>
                            {loading ? <Spinner size="sm" color="dark" /> : <><ArrowRight size={16} /> Sign In</>}
                        </button>
                    </form>

                    <p className="text-center text-sm text-white/40 mt-6 font-body">
                        No account?{' '}
                        <Link to="/register" className="text-neon hover:text-neon-400 transition-colors font-semibold">
                            Create one free
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}