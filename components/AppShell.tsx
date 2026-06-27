'use client';

import { useState } from 'react';
import BottomNav, { Tab } from './BottomNav';
import TodayTab from './TodayTab';
import StressFingerprint from './StressFingerprint';
import CalmTab from './CalmTab';
import AuthSheet from './AuthSheet';
import type { AuthState } from '@/lib/hooks/useAuth';

interface AppShellProps {
  exam: string;
  auth: AuthState;
}

export default function AppShell({ exam, auth }: AppShellProps) {
  const [tab, setTab] = useState<Tab>('today');
  const [accountOpen, setAccountOpen] = useState(false);

  const uid = auth.uid!;
  const accountLabel = auth.isAnonymous
    ? 'Sign in'
    : (auth.email ?? 'Account');

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)' }}>
      {/* Minimal top bar with account access */}
      <header
        className="w-full max-w-[480px] mx-auto px-4 pt-4 flex items-center justify-between"
      >
        <span className="text-sm font-semibold tracking-wide" style={{ color: 'var(--color-brand-dark, var(--color-brand))' }}>
          🌱 Saathi
        </span>
        <button
          onClick={() => setAccountOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
          style={{ background: 'var(--bg-surface)', color: 'var(--color-text-soft)', boxShadow: 'var(--shadow-card)', minHeight: 36 }}
          aria-label={auth.isAnonymous ? 'Sign in or create an account' : 'Your account'}
        >
          <span aria-hidden="true">{auth.isAnonymous ? '👤' : '✓'}</span>
          <span className="max-w-[140px] truncate">{accountLabel}</span>
        </button>
      </header>

      {/* Scrollable content area */}
      <main
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)' }}
      >
        <div className="w-full max-w-[480px] mx-auto px-4 py-6">
          {tab === 'today' && <TodayTab exam={exam} uid={uid} getToken={auth.getToken} />}
          {tab === 'you' && <StressFingerprint uid={uid} getToken={auth.getToken} />}
          {tab === 'calm' && <CalmTab />}

          {/* Disclaimer */}
          <p className="text-center text-xs mt-8 mb-2" style={{ color: 'var(--color-text-muted)' }}>
            Saathi is a wellbeing companion, not a substitute for professional care.
          </p>
        </div>
      </main>

      <BottomNav active={tab} onChange={setTab} />

      <AuthSheet auth={auth} open={accountOpen} onClose={() => setAccountOpen(false)} />
    </div>
  );
}
