'use client';

import { useState } from 'react';
import type { AuthState } from '@/lib/hooks/useAuth';

interface LoginScreenProps {
  auth: AuthState;
}

type Mode = 'signin' | 'signup';

function friendlyError(code: string): string {
  if (code.includes('email-already-in-use'))
    return 'That email already has an account. Try signing in instead.';
  if (code.includes('invalid-credential') || code.includes('wrong-password'))
    return "That email and password don't match. Please try again.";
  if (code.includes('weak-password')) return 'Please use at least 6 characters.';
  if (code.includes('invalid-email')) return 'That email address looks off.';
  if (code.includes('user-not-found')) return "We couldn't find an account with that email.";
  return 'Something went wrong. Please try again in a moment.';
}

export default function LoginScreen({ auth }: LoginScreenProps) {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'signup') await auth.signUp(email.trim(), password);
      else await auth.signIn(email.trim(), password);
      // On success, onAuthStateChanged advances past the login wall.
    } catch (err) {
      setError(friendlyError((err as { code?: string }).code ?? ''));
      setBusy(false);
    }
  };

  const guest = async () => {
    setError('');
    setBusy(true);
    try {
      await auth.continueAsGuest();
    } catch {
      setError('Could not start a guest session. Please try again.');
      setBusy(false);
    }
  };

  const inputStyle = {
    background: 'var(--bg-base)',
    color: 'var(--color-text)',
    border: '1px solid var(--color-border, #e5e5e5)',
    minHeight: 52,
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 py-10"
      style={{ background: 'var(--bg-base)' }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl"
            style={{ background: 'var(--color-brand-soft)' }}
            aria-hidden="true"
          >
            🌱
          </div>
          <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
            Welcome to Saathi
          </h1>
          <p style={{ color: 'var(--color-text-soft)', fontSize: '1rem' }}>
            Your calm companion through exam prep. Sign in to keep your journal safe.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Email"
            className="w-full px-4 py-3 rounded-2xl outline-none"
            style={inputStyle}
          />
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            placeholder="Password (at least 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-label="Password"
            className="w-full px-4 py-3 rounded-2xl outline-none"
            style={inputStyle}
          />

          {error && (
            <p className="text-sm" role="alert" style={{ color: 'var(--color-crisis, #c0392b)' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-4 rounded-2xl font-semibold"
            style={{
              background: 'var(--color-brand)',
              color: 'var(--color-text-invert)',
              opacity: busy ? 0.6 : 1,
              minHeight: 56,
            }}
            aria-busy={busy}
          >
            {busy ? 'Just a moment…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <button
          onClick={() => {
            setError('');
            setMode((m) => (m === 'signup' ? 'signin' : 'signup'));
          }}
          className="w-full text-center mt-4 text-sm"
          style={{ color: 'var(--color-brand-dark, var(--color-brand))' }}
        >
          {mode === 'signup'
            ? 'Already have an account? Sign in'
            : 'New here? Create an account'}
        </button>

        <div className="flex items-center gap-3 my-6" aria-hidden="true">
          <div className="flex-1 h-px" style={{ background: 'var(--color-border, #e5e5e5)' }} />
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>or</span>
          <div className="flex-1 h-px" style={{ background: 'var(--color-border, #e5e5e5)' }} />
        </div>

        <button
          onClick={guest}
          disabled={busy}
          className="w-full py-3 rounded-2xl font-medium"
          style={{ background: 'var(--bg-surface)', color: 'var(--color-text)', boxShadow: 'var(--shadow-card)', minHeight: 52, opacity: busy ? 0.6 : 1 }}
        >
          Just explore for now
        </button>

        <p className="text-center mt-6 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Saathi is a wellbeing companion, not a substitute for professional care.
        </p>
      </div>
    </div>
  );
}
