import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Lock, Mail, Phone, User } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { DEMO_ADMIN_EMAIL } from '../lib/demoAdminData';

export function AuthPage({ mode = 'login' }: { mode?: 'login' | 'register' }) {
  const { user, loginWithGoogle, loginWithEmail, loginDemoAdmin, registerWithEmail, sendResetEmail } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [tab, setTab] = useState<'login' | 'register' | 'reset'>(mode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const redirectTo = (location.state as { from?: string } | null)?.from || '/my-bookings';

  useEffect(() => {
    setTab(mode);
  }, [mode]);

  useEffect(() => {
    if (user && user.emailVerified) {
      navigate(redirectTo, { replace: true });
    }
  }, [user, navigate, redirectTo]);

  const handleGoogle = async () => {
    setAuthError(null);
    setBusy(true);
    try {
      await loginWithGoogle();
      showToast('Signed In', 'Welcome to The King Travel.', 'success');
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/unauthorized-domain') {
        const host = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
        setAuthError(
          `Domain "${host}" is not yet authorized in Firebase Authentication. Add "${host}" in Firebase Console > Authentication > Settings > Authorized domains to enable Google Sign-In here.`
        );
      } else {
        const msg = err instanceof Error ? err.message : 'Google sign-in was cancelled or blocked.';
        setAuthError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setBusy(true);
    try {
      if (tab === 'login') {
        if (email.trim().toLowerCase() === DEMO_ADMIN_EMAIL.toLowerCase()) {
          if (loginDemoAdmin(email, password)) {
            showToast('Demo Admin Signed In', 'Opening Admin Operations Console.', 'success');
            navigate('/admin', { replace: true });
            return;
          }
          throw new Error('For Demo Admin login, please sign in via the Admin Portal (/admin).');
        }
        await loginWithEmail(email, password);
        showToast('Signed In', 'Welcome back to The King Travel.', 'success');
        navigate(redirectTo, { replace: true });
      } else if (tab === 'register') {
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        await registerWithEmail(name, email, password, phone);
        showToast(
          'Verification Email Sent',
          'Please verify your email address using the link sent to your inbox before creating bookings.',
          'info'
        );
      } else {
        await sendResetEmail(email);
        showToast('Reset Link Sent', 'Check your email inbox for password reset instructions.', 'success');
        setTab('login');
      }
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/operation-not-allowed') {
        setAuthError(
          'Email/Password sign-in is not enabled in Firebase Authentication Console yet. Please use "Continue with Google" below, or enable Email/Password provider in Firebase Console > Authentication.'
        );
      } else {
        setAuthError(err instanceof Error ? err.message : 'Authentication failed.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-160px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-[#D9E2EC] rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="text-center mb-6">
          <div className="inline-flex justify-center mb-3">
            <BrandLogo variant="dark" size="md" />
          </div>
          <h1 className="font-display text-2xl font-bold text-[#102A43]">
            {tab === 'login'
              ? 'Customer Sign In'
              : tab === 'register'
              ? 'Create Traveler Account'
              : 'Reset Password'}
          </h1>
          <p className="text-xs text-[#627D98] mt-1">
            Access your flight bookings, payment receipts, and e-tickets.
          </p>
        </div>

        {/* Instant Google Sign-In (Enabled via ProvisionFirebase) */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={busy}
          className="w-full py-2.5 px-4 rounded-lg border border-[#D9E2EC] bg-white hover:bg-[#F7F9FC] text-[#102A43] text-sm font-semibold inline-flex items-center justify-center gap-2.5 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
            />
          </svg>
          Continue with Google
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#E6ECF2]" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-3 text-[#627D98]">or with email</span>
          </div>
        </div>

        {/* Mode Switch */}
        {tab !== 'reset' && (
          <div className="grid grid-cols-2 p-1 bg-[#F0F4F8] rounded-lg mb-5">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setAuthError(null);
              }}
              className={`py-1.5 text-xs font-semibold rounded-md ${
                tab === 'login' ? 'bg-white text-[#102A43] shadow-xs' : 'text-[#627D98]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('register');
                setAuthError(null);
              }}
              className={`py-1.5 text-xs font-semibold rounded-md ${
                tab === 'register' ? 'bg-white text-[#102A43] shadow-xs' : 'text-[#627D98]'
              }`}
            >
              Register
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'register' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-[#486581] mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#627D98] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Muhammad Ali"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#102A43]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#486581] mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#627D98] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+92 300 0000000"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#102A43]"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#486581] mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#627D98] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#102A43]"
              />
            </div>
          </div>

          {tab !== 'reset' && (
            <div>
              <label className="block text-xs font-semibold text-[#486581] mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#627D98] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#D9E2EC] text-sm text-[#102A43]"
                />
              </div>
            </div>
          )}

          {authError && (
            <div role="alert" className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 leading-relaxed">
              {authError}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 rounded-lg bg-[#102A43] hover:bg-[#1C3D5A] text-white text-sm font-semibold disabled:opacity-60"
          >
            {busy
              ? 'Please wait...'
              : tab === 'login'
              ? 'Sign In'
              : tab === 'register'
              ? 'Create Account'
              : 'Send Reset Link'}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-xs text-[#627D98]">
          {tab === 'login' ? (
            <button type="button" onClick={() => setTab('reset')} className="hover:text-[#102A43]">
              Forgot password?
            </button>
          ) : (
            <button type="button" onClick={() => setTab('login')} className="hover:text-[#102A43]">
              Back to Sign In
            </button>
          )}
          <div className="flex items-center gap-3">
            <Link to="/admin" className="hover:text-[#102A43] font-medium">
              Admin Portal
            </Link>
            <Link to="/terms" className="hover:text-[#102A43]">
              Terms & Privacy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
