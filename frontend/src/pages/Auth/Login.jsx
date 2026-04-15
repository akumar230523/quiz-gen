/**
 * Login.jsx  ─  Sign-in page
 * ─────────────────────────────────────────────────────────────────────────────
 * Bug fixes vs old version:
 *  - login() errors now propagate so toast.error() actually fires
 *  - getErrMsg() extracts the server's error string correctly
 *  - Added "Enter" key submit on both fields
 *  - Theme-aware styles via CSS variables
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getErrMsg } from '@/services/api';
import ThemeToggle from '@/components/common/ThemeToggle';
import Spinner from '@/components/common/Spinner';
import { Eye, EyeOff, Zap, ArrowRight, Lock, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function Login() {
  usePageTitle('Sign In');
  const { login }  = useAuth();
  const navigate   = useNavigate();

  const [form, setForm]       = useState({ username: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState({});  // inline field errors

  // ── Field change helper ────────────────────────────────────────────────
  const set = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    // Clear field error as user types
    if (errors[field]) setErrors(er => ({ ...er, [field]: '' }));
  };

  // ── Validate before submit ─────────────────────────────────────────────
  function validate() {
    const errs = {};
    if (!form.username.trim()) errs.username = 'Username is required';
    if (!form.password)        errs.password = 'Password is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Submit ─────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const user = await login(form.username.trim(), form.password);
      toast.success(`Welcome back, ${user.username}!`);
      navigate('/dashboard');
    } catch (err) {
      // getErrMsg reads err.response.data.error (our backend format)
      toast.error(getErrMsg(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-center relative overflow-hidden">
      {/* Background orbs */}
      <div className="orb w-80 h-80 bg-neon/20 -top-20 -left-20" />
      <div className="orb w-64 h-64 bg-violet/20 -bottom-16 -right-16" style={{ animationDelay: '2s' }} />

      {/* Theme toggle — top right */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

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
            Welcome back
          </h1>
          <p className="text-sm font-body mb-8" style={{ color: 'var(--text-muted)' }}>
            Sign in to your account to continue.
          </p>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Username */}
            <div>
              <label className="label">Username</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} />
                <input
                  className={`input pl-10 ${errors.username ? 'input-error' : ''}`}
                  placeholder="your_username"
                  value={form.username}
                  onChange={set('username')}
                  autoComplete="username"
                  disabled={loading}
                />
              </div>
              {errors.username && (
                <p className="text-xs text-rose mt-1">{errors.username}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} />
                <input
                  className={`input pl-10 pr-11 ${errors.password ? 'input-error' : ''}`}
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={set('password')}
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--text-dim)' }}
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-rose mt-1">{errors.password}</p>
              )}
            </div>

            <button
              type="submit"
              className="btn-primary w-full justify-center py-3.5"
              disabled={loading}
            >
              {loading
                ? <><Spinner size="sm" color="dark" /> Signing in…</>
                : <><ArrowRight size={16} /> Sign In</>
              }
            </button>
          </form>

          <p className="text-center text-sm font-body mt-6" style={{ color: 'var(--text-muted)' }}>
            No account?{' '}
            <Link to="/register" className="text-neon font-semibold hover:underline transition-all">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
