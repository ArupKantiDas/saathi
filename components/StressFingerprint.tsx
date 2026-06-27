'use client';

/**
 * StressFingerprint — "You" tab
 * Loads entries, POSTs to /api/patterns, renders the AI-generated fingerprint.
 * Falls back gracefully when there aren't enough entries yet.
 */

import { useEffect, useRef, useState } from 'react';
import { listEntries } from '@/lib/store';

// ── Types from /api/patterns response ────────────────────────────────

interface Stressor {
  key: string;
  label: string;
  kind: 'trigger' | 'entity';
  category?: string;
  count: number;
  avgMood: number;
  delta: number;
  impact: number;
}

interface Fingerprint {
  entryCount: number;
  needsMoreData: boolean;
  overallAvgMood: number;
  moodTrend: 'improving' | 'declining' | 'steady' | 'unknown';
  topStressors: Stressor[];
}

interface PatternsResponse {
  fingerprint: Fingerprint;
  narration: string;
  provider: string;
}

interface StressFingerprintProps {
  uid: string;
  getToken: () => Promise<string>;
}

// ── Trend pill ────────────────────────────────────────────────────────

const TREND_CONFIG: Record<
  Fingerprint['moodTrend'],
  { label: string; bg: string; color: string }
> = {
  improving: {
    label: 'Improving',
    bg: 'var(--color-success)',
    color: '#fff',
  },
  declining: {
    label: 'Needs attention',
    bg: 'var(--color-accent)',
    color: '#fff',
  },
  steady: {
    label: 'Steady',
    bg: 'var(--bg-surface-2)',
    color: 'var(--color-text-soft)',
  },
  unknown: {
    label: 'Unknown',
    bg: 'var(--bg-surface-2)',
    color: 'var(--color-text-muted)',
  },
};

// ── Skeleton ──────────────────────────────────────────────────────────

function FingerprintSkeleton() {
  return (
    <div className="card flex flex-col gap-4" aria-hidden="true">
      <div className="skeleton h-4 w-3/4 rounded" />
      <div className="skeleton h-4 w-full rounded" />
      <div className="skeleton h-4 w-5/6 rounded" />
      <div className="skeleton h-24 w-full rounded" />
      <div className="flex gap-2">
        <div className="skeleton h-6 w-1/3 rounded-full" />
        <div className="skeleton h-6 w-1/4 rounded-full" />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────

const ENTRIES_NEEDED = 3;

export default function StressFingerprint({ uid, getToken }: StressFingerprintProps) {
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [data, setData]             = useState<PatternsResponse | null>(null);
  const [entryCount, setEntryCount] = useState<number>(0);

  // Stable ref for getToken so it doesn't retrigger the effect on every render
  const getTokenRef = useRef(getToken);
  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const entries = await listEntries(uid);
        if (cancelled) return;

        setEntryCount(entries.length);

        if (entries.length < ENTRIES_NEEDED) {
          setLoading(false);
          return;
        }

        const token = await getTokenRef.current();
        // Infer exam from first entry that has one
        const exam = entries.find((e) => e.exam)?.exam ?? 'exam';

        const res = await fetch('/api/patterns', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            exam,
            entries: entries.map((e) => ({
              createdAt: e.createdAt,
              mood: e.mood,
              analysis: e.analysis,
            })),
          }),
        });

        if (!res.ok) {
          const errData = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(errData.error ?? `Server error ${res.status}`);
        }

        const json = (await res.json()) as PatternsResponse;
        if (!cancelled) {
          setData(json);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Couldn\'t load your patterns right now.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [uid]); // uid is the only real dependency — getToken via ref

  // ── Derived values ────────────────────────────────────────────────

  const fingerprint = data?.fingerprint;
  const needsMoreData =
    !fingerprint || fingerprint.needsMoreData || fingerprint.entryCount < ENTRIES_NEEDED;

  const trend = fingerprint?.moodTrend ?? 'unknown';
  const trendCfg = TREND_CONFIG[trend];

  // Bar chart helpers
  const overallMood = fingerprint?.overallAvgMood ?? 5;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
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

      {/* Loading */}
      {loading && <FingerprintSkeleton />}

      {/* Error state */}
      {!loading && error && (
        <div
          className="card text-center flex flex-col items-center gap-3 py-6"
          role="alert"
        >
          <span aria-hidden="true" style={{ fontSize: '2rem' }}>🌧</span>
          <p className="text-base" style={{ color: 'var(--color-text)' }}>
            Couldn&rsquo;t load your patterns right now
          </p>
          <p className="text-sm" style={{ color: 'var(--color-text-soft)' }}>
            Please check your connection and try again later.
          </p>
        </div>
      )}

      {/* Not enough data yet */}
      {!loading && !error && needsMoreData && (
        <div className="card flex flex-col items-center gap-4 py-8 text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: 'var(--color-brand-soft)' }}
            aria-hidden="true"
          >
            <span style={{ fontSize: '2.5rem' }}>🌱</span>
          </div>

          <div>
            <p className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>
              Your Stress Fingerprint unlocks after a few days of journaling
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-soft)' }}>
              Keep reflecting — Saathi will start noticing your patterns and what helps you most.
            </p>
          </div>

          {/* Progress indicator */}
          <div
            className="w-full rounded-xl px-5 py-4"
            style={{ background: 'var(--bg-muted)' }}
            aria-label={`${entryCount} of ${ENTRIES_NEEDED} entries completed`}
          >
            <div className="flex justify-between text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
              <span>Entries so far</span>
              <span>{entryCount} / {ENTRIES_NEEDED}</span>
            </div>
            <div
              className="w-full rounded-full overflow-hidden"
              style={{ height: '8px', background: 'var(--bg-surface-2)' }}
              role="progressbar"
              aria-valuenow={entryCount}
              aria-valuemin={0}
              aria-valuemax={ENTRIES_NEEDED}
              aria-label={`${entryCount} of ${ENTRIES_NEEDED} journal entries`}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, (entryCount / ENTRIES_NEEDED) * 100)}%`,
                  background: 'var(--color-brand)',
                  borderRadius: '9999px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
            {entryCount < ENTRIES_NEEDED && (
              <p className="text-xs mt-2 text-center" style={{ color: 'var(--color-text-muted)' }}>
                {ENTRIES_NEEDED - entryCount} more {ENTRIES_NEEDED - entryCount === 1 ? 'entry' : 'entries'} to go
              </p>
            )}
          </div>
        </div>
      )}

      {/* Full fingerprint */}
      {!loading && !error && !needsMoreData && data && fingerprint && (
        <>
          {/* Narration card */}
          <div
            className="card"
            style={{ borderLeft: '4px solid var(--color-brand)' }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Saathi&rsquo;s read on you
            </p>
            <p
              className="text-base leading-relaxed"
              style={{ color: 'var(--color-text)' }}
              aria-live="polite"
              aria-label="Fingerprint narration"
            >
              {data.narration}
            </p>
          </div>

          {/* Mood summary row */}
          <div
            className="card flex items-center justify-between gap-4"
            style={{ background: 'var(--bg-muted)' }}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1"
                style={{ color: 'var(--color-text-muted)' }}>
                Average mood
              </p>
              <p className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
                {overallMood.toFixed(1)}
                <span className="text-base font-normal" style={{ color: 'var(--color-text-muted)' }}>
                  &nbsp;/ 10
                </span>
              </p>
            </div>

            {/* Trend pill */}
            <span
              className="text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{
                background: trendCfg.bg,
                color: trendCfg.color,
              }}
              aria-label={`Mood trend: ${trendCfg.label}`}
            >
              {trend === 'improving' && '↑ '}
              {trend === 'declining' && '↓ '}
              {trend === 'steady'    && '→ '}
              {trendCfg.label}
            </span>
          </div>

          {/* Top stressors */}
          {fingerprint.topStressors.length > 0 && (
            <div className="card flex flex-col gap-4">
              <p
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Your main stressors
              </p>

              <ul className="flex flex-col gap-3" aria-label="Top stressors">
                {fingerprint.topStressors.map((stressor) => {
                  // Bar width: stressor avgMood vs overall (lower = more stress)
                  // We visualise how far below overall the stressor mood is.
                  const impact = Math.max(0, Math.min(100, stressor.impact * 100));

                  return (
                    <li key={stressor.key} className="flex flex-col gap-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span
                          className="text-sm font-medium"
                          style={{ color: 'var(--color-text)' }}
                        >
                          {stressor.label}
                        </span>
                        <span
                          className="text-xs shrink-0"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          appeared {stressor.count}×
                        </span>
                      </div>

                      {/* Horizontal bar */}
                      <div
                        className="w-full rounded-full overflow-hidden"
                        style={{ height: '6px', background: 'var(--bg-surface-2)' }}
                        role="img"
                        aria-label={`${stressor.label}: avg mood ${stressor.avgMood.toFixed(1)}, impact ${Math.round(impact)}%`}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${impact}%`,
                            background: 'var(--color-accent)',
                            borderRadius: '9999px',
                          }}
                        />
                      </div>

                      <div
                        className="flex justify-between text-xs"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        <span>Avg mood during: {stressor.avgMood.toFixed(1)}/10</span>
                        <span>vs {overallMood.toFixed(1)} overall</span>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Based on {fingerprint.entryCount} journal {fingerprint.entryCount === 1 ? 'entry' : 'entries'}.
                {data.provider && ` Insights by ${data.provider}.`}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
