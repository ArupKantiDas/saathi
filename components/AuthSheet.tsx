'use client';

import { useEffect, useState } from 'react';
import type { AuthState } from '@/lib/hooks/useAuth';

interface AuthSheetProps {
  auth: AuthState;
  open: boolean;
  onClose: () => void;
}

type Mode = 'signup' | 'signin';

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

export default function AuthSheet({ auth, open, onClose }: AuthSheetProps) {
  const [mode, setMode] = useState<Mode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const signedIn = !auth.isAnonymous && !!auth.email;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'signup') await auth.signUp(email.trim(), password);
      else await auth.signIn(email.trim(), password);
      setPassword('');
      onClose();
    } catch (err) {
      setError(friendlyError((err as { code?: string }).code ?? ''));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Account"
    >
      <div
        className="w-full max-w-[440px] rounded-t-3xl sm:rounded-3xl p-6"
        style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
            {signedIn ? 'Your account' : 'Save your progress'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full flex items-center justify-center text-lg"
            style={{ background: 'var(--bg-base)', color: 'var(--color-text-soft)' }}
          >
            ✕
          </button>
        </div>

        {signedIn ? (
          <div>
            <p className="mb-5" style={{ color: 'var(--color-text-soft)' }}>
              Signed in as <strong>{auth.email}</strong>. Your journal is saved to your account.
            </p>
            <button
              onClick={async () => {
                await auth.signOutUser();
                onClose();
              }}
              className="w-full py-3 rounded-2xl font-semibold"
              style={{ background: 'var(--bg-base)', color: 'var(--color-text)', minHeight: 48 }}
            >
              Sign out
            </button>
          </div>
        ) : (
          <>
            <p className="mb-5 text-sm" style={{ color: 'var(--color-text-soft)' }}>
              You&apos;re using Saathi privately on this device. Create an account to keep your
              journal safe and reach it from anywhere. Your existing entries come with you.
            </p>

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
                style={{ background: 'var(--bg-base)', color: 'var(--color-text)', border: '1px solid var(--color-border, #e5e5e5)', minHeight: 48 }}
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
                style={{ background: 'var(--bg-base)', color: 'var(--color-text)', border: '1px solid var(--color-border, #e5e5e5)', minHeight: 48 }}
              />

              {error && (
                <p className="text-sm" role="alert" style={{ color: 'var(--color-crisis, #c0392b)' }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full py-3 rounded-2xl font-semibold"
                style={{ background: 'var(--color-brand)', color: 'var(--color-text-invert)', opacity: busy ? 0.6 : 1, minHeight: 48 }}
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
          </>
        )}
      </div>
    </div>
  );
}
