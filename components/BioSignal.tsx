'use client';

import { useState, useEffect, useRef } from 'react';
import type { Technique } from '@/lib/knowledge/techniques';

interface Props {
  exam: string;
  getToken: () => Promise<string>;
}

interface InterventionState {
  text: string;
  technique: Technique;
}

export default function BioSignal({ exam, getToken }: Props) {
  const [bpm, setBpm] = useState(72);
  const [intervention, setIntervention] = useState<InterventionState | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const targetRef = useRef(72);
  const triggeredRef = useRef(false);
  const bpmRef = useRef(72);

  // Keep bpmRef in sync
  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  // Random walk toward target every 1500ms
  useEffect(() => {
    const id = setInterval(() => {
      setBpm((prev) => {
        const target = targetRef.current;
        const diff = target - prev;
        // Step: up to 3 bpm toward target + small noise
        const step = Math.sign(diff) * Math.min(Math.abs(diff), 3) + (Math.random() - 0.5) * 1.5;
        const next = Math.max(55, Math.min(140, prev + step));

        // Trigger AI call once when crossing 95
        if (!triggeredRef.current && next >= 95) {
          triggeredRef.current = true;
          callCheckin(Math.round(next));
        }

        return next;
      });
    }, 1500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const callCheckin = async (heartRate: number) => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ exam, heartRate, baseline: 72 }),
      });
      if (res.ok) {
        const data = (await res.json()) as { intervention: string; technique: Technique };
        setIntervention({ text: data.intervention, technique: data.technique });
        setDismissed(false);
      }
    } catch {
      // non-fatal — sensor demo continues
    } finally {
      setLoading(false);
    }
  };

  const handleStressSpike = () => {
    targetRef.current = 115;
    triggeredRef.current = false;
    setIntervention(null);
    setDismissed(false);
  };

  const prefersReducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  const bpmDisplay = Math.round(bpm);
  const isElevated = bpmDisplay >= 95;

  return (
    <div
      className="card"
      style={{ borderLeft: '3px solid var(--color-brand)' }}
    >
      {/* Header */}
      <div className="mb-3">
        <h3
          className="text-base font-bold mb-0.5"
          style={{ color: 'var(--color-text)' }}
        >
          Demo Wearable Simulator
        </h3>
        <p
          className="text-xs"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Simulated sensor — the AI response is real
        </p>
      </div>

      {/* BPM display */}
      <div className="flex items-center gap-3 mb-4">
        {/* Pulse dot */}
        <span
          aria-hidden="true"
          style={{
            display: 'inline-block',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: isElevated ? 'var(--color-brand)' : 'var(--color-text-muted)',
            animation: prefersReducedMotion ? 'none' : 'pulse-dot 1s ease-in-out infinite',
          }}
        />
        <span
          className="text-2xl font-bold tabular-nums"
          style={{ color: isElevated ? 'var(--color-brand)' : 'var(--color-text)' }}
          aria-label={`Heart rate: ${bpmDisplay} beats per minute`}
        >
          {bpmDisplay} <span className="text-sm font-normal" style={{ color: 'var(--color-text-muted)' }}>bpm</span>
        </span>
      </div>

      {/* Stress spike button */}
      <button
        onClick={handleStressSpike}
        disabled={loading}
        className="w-full py-3 rounded-2xl text-sm font-semibold mb-4"
        style={{
          background: 'var(--color-brand-soft)',
          color: 'var(--color-brand-dark)',
          border: '1.5px solid var(--color-brand)',
          opacity: loading ? 0.6 : 1,
          cursor: loading ? 'not-allowed' : 'pointer',
          minHeight: '44px',
        }}
        aria-label="Simulate exam stress spike"
      >
        {loading ? 'Calling AI…' : 'Simulate exam stress'}
      </button>

      {/* AI intervention */}
      {intervention && !dismissed && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-2xl p-4 mb-3"
          style={{
            background: 'var(--color-brand-soft)',
            border: '1.5px solid var(--color-brand)',
          }}
        >
          <p
            className="text-sm font-medium mb-3"
            style={{ color: 'var(--color-brand-dark)' }}
          >
            {intervention.text}
          </p>

          {/* Technique steps */}
          <p
            className="text-xs font-semibold uppercase tracking-wide mb-2"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {intervention.technique.name}
          </p>
          <ol className="text-sm space-y-1 mb-4" style={{ color: 'var(--color-text)' }}>
            {intervention.technique.steps.map((step, i) => (
              <li key={i} className="flex gap-2">
                <span
                  className="font-bold shrink-0"
                  style={{ color: 'var(--color-brand)' }}
                >
                  {i + 1}.
                </span>
                {step}
              </li>
            ))}
          </ol>

          <button
            onClick={() => setDismissed(true)}
            className="text-sm font-semibold px-4 py-2 rounded-xl"
            style={{
              background: 'var(--color-brand)',
              color: 'var(--color-text-invert)',
              minHeight: '36px',
            }}
          >
            I&apos;ll try it
          </button>
        </div>
      )}

      {/* Disclaimer note */}
      <p
        className="text-xs"
        style={{ color: 'var(--color-text-muted)', lineHeight: 1.5 }}
      >
        This demos how a real wearable (Apple Watch / Google Fit) could proactively check in.
      </p>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
