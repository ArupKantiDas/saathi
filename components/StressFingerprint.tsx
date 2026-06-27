'use client';

import { useEffect, useState } from 'react';
import { listEntries } from '@/lib/store';

interface StressFingerprintProps {
  uid: string;
}

export default function StressFingerprint({ uid }: StressFingerprintProps) {
  const [entryCount, setEntryCount] = useState<number | null>(null);

  useEffect(() => {
    listEntries(uid)
      .then((entries) => setEntryCount(entries.length))
      .catch(() => setEntryCount(0));
  }, [uid]);

  const daysNeeded = 3;
  const hasEnough = (entryCount ?? 0) >= daysNeeded;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-1"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Your wellbeing
        </p>
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
          Stress Fingerprint
        </h2>
      </div>

      <div className="card text-center flex flex-col items-center gap-4 py-8">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: 'var(--color-brand-soft)' }}
          aria-hidden="true"
        >
          <span style={{ fontSize: '2.5rem' }}>🌀</span>
        </div>

        {hasEnough ? (
          <p className="text-base" style={{ color: 'var(--color-text)' }}>
            Your fingerprint is ready! (Coming in the next version.)
          </p>
        ) : (
          <>
            <p className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>
              Your Stress Fingerprint unlocks after a few days of journaling
            </p>
            <p className="text-sm" style={{ color: 'var(--color-text-soft)' }}>
              Keep reflecting — Saathi will start noticing your patterns and what helps
              you most.
            </p>
          </>
        )}

        {/* Entry counter */}
        <div
          className="rounded-xl px-5 py-3 mt-2"
          style={{ background: 'var(--bg-muted)' }}
          aria-label={`You have ${entryCount ?? '…'} journal entries`}
        >
          <p
            className="text-2xl font-bold"
            style={{ color: 'var(--color-brand)' }}
          >
            {entryCount === null ? '…' : entryCount}
          </p>
          <p className="text-sm" style={{ color: 'var(--color-text-soft)' }}>
            {entryCount === 1 ? 'entry' : 'entries'} so far
          </p>
        </div>

        {!hasEnough && entryCount !== null && (
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {Math.max(0, daysNeeded - entryCount)} more{' '}
            {Math.max(0, daysNeeded - entryCount) === 1 ? 'entry' : 'entries'} to go
          </p>
        )}
      </div>

      {/* Placeholder chart area */}
      {!hasEnough && (
        <div
          className="card flex flex-col gap-3 opacity-40"
          aria-hidden="true"
        >
          <div className="skeleton h-4 w-1/2" />
          <div className="skeleton h-24 w-full" />
          <div className="skeleton h-3 w-3/4" />
        </div>
      )}
    </div>
  );
}
