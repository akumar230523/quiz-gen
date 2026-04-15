/**
 * Register.jsx  ─  Create account page
 * Bug fixes: errors propagate, role pre-fill from URL, full validation
 */

import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getErrMsg } from '@/services/api';
import ThemeToggle from '@/components/common/ThemeToggle';
import Spinner from '@/components/common/Spinner';
import { Eye, EyeOff, Zap, ArrowRight, Lock, User, Mail, Building2, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function Register() {
  usePageTitle('Create Account');
  const { register } = useAuth();
  const navigate     = useNavigate();
  const [params]     = useSearchParams();

  const [form, setForm] = useState({
    username: '',
    email:    '',
    password: '',
    // Pre-fill role from URL query ?role=institute
    role: params.get('role') === 'institute' ? 'institute' : 'student',
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState({});

  const set = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors(er => ({ ...er, [field]: '' }));
  };

  function validate() {
    const errs = {};
    if (!form.username.trim())  errs.username = 'Username is required';
    else if (form.username.length < 3) errs.username = 'Must be at least 3 characters';
    if (!form.password)         errs.password = 'Password is required';
    else if (form.password.length < 6) errs.password = 'Must be at least 6 characters';
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email address';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const user = await register(form);
      toast.success(`Account created! Welcome, ${user.username}!`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(getErrMsg(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-center py-12 relative overflow-hidden">
      <div className="orb w-80 h-80 bg-violet/20 -top-20 -right-20" />
      <div className="orb w-64 h-64 bg-neon/15 -bottom-16 -left-16" style={{ animationDelay: '3s' }} />

      <div className="absolute top-4 right-4"><ThemeToggle /></div>

      <div className="relative z-10 w-full max-w-md px-4 animate-fade-in">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 mb-10">
          <div className="w-10 h-10 rounded-xl bg-neon flex items-center justify-center">
            <Zap size={20} className="text-ink fill-ink" />
          </div>
          <span className="font-display font-bold text-2xl" style={{ color: 'var(--text)' }}>
            Quiz<span className="text-neon">Gen</span>
          </span>
        </Link>

        <div className="glass p-8">
          <h1 className="text-2xl font-display font-bold mb-1" style={{ color: 'var(--text)' }}>
            Create account
          </h1>
          <p className="text-sm font-body mb-6" style={{ color: 'var(--text-muted)' }}>
            Join thousands learning smarter with AI.
          </p>

          {/* Role toggle */}
          <div className="grid grid-cols-2 gap-2 mb-6 p-1 rounded-xl" style={{ backgroundColor: 'var(--surface)' }}>
            {[
              { value: 'student',   label: 'Student',   Icon: GraduationCap },
              { value: 'institute', label: 'Institute',  Icon: Building2 },
            ].map(r => (
              <button
                key={r.value}
                type="button"
                onClick={() => setForm(f => ({ ...f, role: r.value }))}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-display font-semibold transition-all ${
                  form.role === r.value
                    ? 'bg-neon text-ink'
                    : 'transition-colors'
                }`}
                style={form.role !== r.value ? { color: 'var(--text-muted)' } : {}}
              >
                <r.Icon size={15} />
                {r.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Username */}
            <div>
              <label className="label">Username *</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} />
                <input className={`input pl-10 ${errors.username ? 'input-error' : ''}`}
                  placeholder="choose_a_username" value={form.username}
                  onChange={set('username')} autoComplete="username" disabled={loading} />
              </div>
              {errors.username && <p className="text-xs text-rose mt-1">{errors.username}</p>}
            </div>

            {/* Email (optional) */}
            <div>
              <label className="label">Email <span className="font-normal normal-case" style={{ color: 'var(--text-dim)' }}>(optional)</span></label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} />
                <input className={`input pl-10 ${errors.email ? 'input-error' : ''}`}
                  type="email" placeholder="you@example.com" value={form.email}
                  onChange={set('email')} autoComplete="email" disabled={loading} />
              </div>
              {errors.email && <p className="text-xs text-rose mt-1">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="label">Password *</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} />
                <input
                  className={`input pl-10 pr-11 ${errors.password ? 'input-error' : ''}`}
                  type={showPass ? 'text' : 'password'}
                  placeholder="min. 6 characters" value={form.password}
                  onChange={set('password')} autoComplete="new-password" disabled={loading}
                />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} tabIndex={-1}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-rose mt-1">{errors.password}</p>}
            </div>

            <button type="submit" className="btn-primary w-full justify-center py-3.5 mt-2" disabled={loading}>
              {loading
                ? <><Spinner size="sm" color="dark" /> Creating account…</>
                : <><ArrowRight size={16} /> Create Account</>
              }
            </button>
          </form>

          <p className="text-center text-sm font-body mt-6" style={{ color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" className="text-neon font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
