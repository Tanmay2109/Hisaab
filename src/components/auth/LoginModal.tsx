import React, { useState } from 'react';
import { Wallet, Sparkles, Mail, Lock, User, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { CurrencyCode } from '../../types';

export const LoginModal: React.FC = () => {
  const { loginWithEmail, signupWithEmail, loginWithGoogle, resetPassword, enterDemoMode } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('INR');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      if (mode === 'signin') {
        await loginWithEmail(email, password);
      } else if (mode === 'signup') {
        if (!fullName.trim()) throw new Error('Full Name is required.');
        await signupWithEmail(email, password, fullName, currency);
      } else if (mode === 'forgot') {
        await resetPassword(email);
        setSuccessMsg('Password reset email sent! Check your inbox.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error('Google Sign In failed:', err);
      setError(err.message || 'Google sign-in failed. Please use email/password or demo mode.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemo = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await enterDemoMode();
    } catch (err: any) {
      setError(err.message || 'Failed to initialize demo sandbox.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-[#141814] dark:bg-[#0c0f0c] transition-colors duration-500">
      {/* Dynamic Animated Ambient Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[15%] -left-[10%] h-[480px] w-[480px] rounded-full bg-gradient-to-br from-[#5A5A40]/50 to-[#526352]/40 blur-3xl opacity-60 animate-float-slow" />
        <div className="absolute -bottom-[15%] -right-[10%] h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-[#3a473a]/60 to-[#5A5A40]/50 blur-3xl opacity-60 animate-float-reverse" />
        <div className="absolute top-[35%] left-[25%] h-[360px] w-[360px] rounded-full bg-gradient-to-r from-[#526352]/30 to-[#8c8c68]/30 blur-3xl opacity-40 animate-pulse" />
      </div>

      {/* Main Glassmorphic Auth Card */}
      <div className="relative z-10 w-full max-w-md max-h-[92vh] overflow-y-auto rounded-3xl bg-white/95 dark:bg-[#202520]/95 border border-[#526352]/20 dark:border-[#526352]/30 shadow-2xl backdrop-blur-xl my-auto transition-all">
        {/* Header Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-[#3d4b3d] via-[#526352] to-[#5A5A40] p-5 sm:p-6 text-white text-center shadow-sm">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md mb-2 shadow-inner">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">Hisaab</h2>
          <p className="text-[11px] text-[#e0e8e0] mt-0.5 font-medium">
            Personal Finance & Group Expense Manager
          </p>
        </div>

        <div className="p-5 sm:p-6">
          {error && (
            <div className="mb-4 rounded-xl bg-rose-50 p-3.5 text-xs text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800 space-y-2">
              <div className="flex items-start gap-2 font-medium">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="leading-snug">{error}</span>
              </div>
              {error.includes('authorized') && (
                <div className="pt-1 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleDemo}
                    className="rounded-lg bg-[#526352] px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#415041] transition"
                  >
                    Launch Demo Mode Instantly
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setError(null);
                    }}
                    className="rounded-lg bg-white dark:bg-[#1a1a17] border border-[#e2e2d8] dark:border-[#33332c] px-3 py-1.5 text-xs font-bold text-[#33332d] dark:text-[#e5e5dc] hover:bg-[#fafaf6] transition"
                  >
                    Create Email Account
                  </button>
                </div>
              )}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-[#f0f4f1] p-3 text-xs font-medium text-[#526352] dark:bg-[#222d23] dark:text-[#6b826b] border border-[#526352]/30">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Mode Switch Tabs */}
          <div className="mb-4 flex rounded-xl bg-[#f0f1e8] p-1 dark:bg-[#1a1a17]">
            <button
              onClick={() => {
                setMode('signin');
                setError(null);
              }}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
                mode === 'signin'
                  ? 'bg-white text-[#33332d] shadow-xs dark:bg-[#2a2a25] dark:text-[#e5e5dc]'
                  : 'text-[#66665c] hover:text-[#33332d] dark:text-[#a3a395]'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setMode('signup');
                setError(null);
              }}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
                mode === 'signup'
                  ? 'bg-white text-[#33332d] shadow-xs dark:bg-[#2a2a25] dark:text-[#e5e5dc]'
                  : 'text-[#66665c] hover:text-[#33332d] dark:text-[#a3a395]'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <div>
                <label className="block text-[11px] font-bold text-[#33332d] dark:text-[#e5e5dc] mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-[#8c8c7e]" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    className="w-full rounded-xl border border-[#e2e2d8] bg-[#fafaf6] pl-9 pr-3 py-2 text-xs font-medium text-[#33332d] focus:border-[#526352] focus:outline-none dark:border-[#33332c] dark:bg-[#1a1a17] dark:text-[#e5e5dc]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-[#33332d] dark:text-[#e5e5dc] mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-[#8c8c7e]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-[#e2e2d8] bg-[#fafaf6] pl-9 pr-3 py-2 text-xs font-medium text-[#33332d] focus:border-[#526352] focus:outline-none dark:border-[#33332c] dark:bg-[#1a1a17] dark:text-[#e5e5dc]"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-[#33332d] dark:text-[#e5e5dc]">
                    Password
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-[11px] text-[#526352] hover:underline dark:text-[#6b826b] font-semibold"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-[#8c8c7e]" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-[#e2e2d8] bg-[#fafaf6] pl-9 pr-3 py-2 text-xs font-medium text-[#33332d] focus:border-[#526352] focus:outline-none dark:border-[#33332c] dark:bg-[#1a1a17] dark:text-[#e5e5dc]"
                  />
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label className="block text-[11px] font-bold text-[#33332d] dark:text-[#e5e5dc] mb-1">
                  Preferred Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                  className="w-full rounded-xl border border-[#e2e2d8] bg-[#fafaf6] px-3 py-2 text-xs font-medium text-[#33332d] focus:border-[#526352] focus:outline-none dark:border-[#33332c] dark:bg-[#1a1a17] dark:text-[#e5e5dc]"
                >
                  <option value="INR">₹ INR (Indian Rupee)</option>
                  <option value="USD">$ USD (US Dollar)</option>
                  <option value="EUR">€ EUR (Euro)</option>
                  <option value="GBP">£ GBP (British Pound)</option>
                  <option value="AED">AED (UAE Dirham)</option>
                </select>
              </div>
            )}

            {/* Primary Action Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#5A5A40] to-[#526352] py-2.5 text-xs font-bold text-white transition hover:from-[#484832] hover:to-[#415041] disabled:opacity-50 shadow-md shadow-[#526352]/20 mt-1"
            >
              {submitting ? 'Please wait...' : mode === 'signin' ? 'Sign In to Hisaab' : mode === 'signup' ? 'Create Free Account' : 'Send Reset Link'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Secondary Actions (Demo Mode & Google Sign-In) */}
          <div className="mt-4 space-y-2.5 pt-3.5 border-t border-[#ecece2] dark:border-[#2d2d27]">
            {/* Demo Mode Button (Distinct Sage Pill Style) */}
            <button
              type="button"
              onClick={handleDemo}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-[#526352] bg-[#f0f4f1] py-2.5 text-xs font-bold text-[#2c382c] hover:bg-[#526352] hover:text-white dark:bg-[#222d23] dark:text-[#a1a17a] dark:border-[#526352] dark:hover:bg-[#526352] dark:hover:text-white transition shadow-xs"
            >
              <Sparkles className="h-4 w-4 shrink-0" />
              <span>Instant Sandbox Demo Mode (Recommended)</span>
            </button>

            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#e2e2d8] bg-white py-2.5 text-xs font-bold text-[#33332d] hover:bg-[#fafaf6] dark:border-[#33332c] dark:bg-[#1a1a17] dark:text-[#e5e5dc] dark:hover:bg-[#242420] transition"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.29v3.15C3.26 21.3 7.31 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.29C.47 8.21 0 10.05 0 12s.47 3.79 1.29 5.42l3.99-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.58l3.99 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Continue with Google (OAuth)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
