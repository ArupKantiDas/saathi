'use client';

import { useState } from 'react';
import BottomNav, { Tab } from './BottomNav';
import TodayTab from './TodayTab';
import StressFingerprint from './StressFingerprint';
import CalmTab from './CalmTab';

interface AppShellProps {
  exam: string;
  uid: string;
  getToken: () => Promise<string>;
}

export default function AppShell({ exam, uid, getToken }: AppShellProps) {
  const [tab, setTab] = useState<Tab>('today');

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Scrollable content area */}
      <main
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)' }}
      >
        <div className="w-full max-w-[480px] mx-auto px-4 py-6">
          {tab === 'today' && (
            <TodayTab exam={exam} uid={uid} getToken={getToken} />
          )}
          {tab === 'you' && (
            <StressFingerprint uid={uid} getToken={getToken} />
          )}
          {tab === 'calm' && (
            <CalmTab />
          )}

          {/* Disclaimer */}
          <p
            className="text-center text-xs mt-8 mb-2"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Saathi is a wellbeing companion, not a substitute for professional care.
          </p>
        </div>
      </main>

      {/* Bottom nav */}
      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}
