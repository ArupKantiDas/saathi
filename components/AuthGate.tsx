'use client';

import { useAuth, AuthState } from '@/lib/hooks/useAuth';

interface AuthGateProps {
  children: (auth: AuthState) => React.ReactNode;
}

export default function AuthGate({ children }: AuthGateProps) {
  const authState = useAuth();

  if (authState.loading) {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center gap-6"
        style={{ background: 'var(--bg-base)' }}
        aria-label="Loading Saathi"
        role="status"
      >
        {/* Calm breathing circle */}
        <div
          className="breathe-circle w-16 h-16 rounded-full"
          style={{ background: 'var(--color-brand-soft)', border: '2px solid var(--color-brand)' }}
        />
        <p style={{ color: 'var(--color-text-soft)', fontSize: '1rem' }}>
          Getting things ready…
        </p>
        <p
          style={{
            color: 'var(--color-text-muted)',
            fontSize: '0.8rem',
            position: 'absolute',
            bottom: '1.5rem',
          }}
        >
          Saathi is a wellbeing companion, not a substitute for professional care.
        </p>
      </div>
    );
  }

  return <>{children(authState)}</>;
}
