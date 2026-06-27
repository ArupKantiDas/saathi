'use client';

import { useState, useEffect } from 'react';

type Phase = 'inhale' | 'hold-in' | 'exhale' | 'hold-out';

const PHASES: { phase: Phase; label: string; duration: number }[] = [
  { phase: 'inhale',   label: 'Breathe in',  duration: 4 },
  { phase: 'hold-in',  label: 'Hold',        duration: 4 },
  { phase: 'exhale',   label: 'Breathe out', duration: 4 },
  { phase: 'hold-out', label: 'Hold',        duration: 4 },
];

export default function GroundingButton() {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(4);

  // Reset when opened
  const openModal = () => {
    setOpen(true);
    setRunning(false);
    setPhaseIndex(0);
    setSecondsLeft(4);
  };

  const closeModal = () => {
    setOpen(false);
    setRunning(false);
  };

  useEffect(() => {
    if (!running || !open) return;

    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s > 1) return s - 1;
        // Move to next phase
        setPhaseIndex((pi) => {
          const next = (pi + 1) % PHASES.length;
          return next;
        });
        return PHASES[(phaseIndex + 1) % PHASES.length]!.duration;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [running, open, phaseIndex]);

  const currentPhase = PHASES[phaseIndex]!;

  if (!open) {
    return (
      <div
        className="fixed z-40"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)', right: '1.25rem' }}
      >
        <button
          onClick={openModal}
          aria-label="Open grounding exercise: I need a moment"
          className="rounded-full px-5 py-3 font-semibold text-sm shadow-lg transition-transform active:scale-95"
          style={{
            background: 'var(--color-brand)',
            color: 'var(--color-text-invert)',
            boxShadow: '0 4px 20px rgba(74,143,168,0.4)',
            minHeight: '48px',
          }}
        >
          I need a moment 🌬
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Box breathing exercise"
    >
      <div
        className="w-full max-w-sm rounded-t-3xl p-8 flex flex-col items-center gap-6"
        style={{
          background: 'var(--bg-surface)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)',
        }}
      >
        <button
          onClick={closeModal}
          className="absolute top-5 right-5 text-2xl"
          style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
          aria-label="Close grounding exercise"
        >
          ×
        </button>

        <h2
          className="text-lg font-bold"
          style={{ color: 'var(--color-text)' }}
        >
          Box Breathing
        </h2>
        <p className="text-sm text-center" style={{ color: 'var(--color-text-soft)' }}>
          A slow 4-4-4-4 breath to settle your nervous system.
        </p>

        {/* Breathing circle */}
        <div
          className="relative flex items-center justify-center"
          aria-live="polite"
          aria-label={`${currentPhase.label} — ${secondsLeft} seconds remaining`}
        >
          <div
            className="w-36 h-36 rounded-full flex items-center justify-center"
            style={{
              background: 'var(--color-brand-soft)',
              border: '3px solid var(--color-brand)',
              transition: running ? 'transform 4s ease-in-out, opacity 4s ease-in-out' : 'none',
              transform:
                running && (currentPhase.phase === 'inhale')
                  ? 'scale(1.2)'
                  : running && (currentPhase.phase === 'exhale')
                  ? 'scale(0.9)'
                  : 'scale(1)',
              opacity: running ? 1 : 0.7,
            }}
          >
            <div className="text-center">
              <p
                className="text-xl font-bold"
                style={{ color: 'var(--color-brand-dark)' }}
              >
                {running ? currentPhase.label : 'Ready'}
              </p>
              {running && (
                <p
                  className="text-3xl font-bold mt-1"
                  style={{ color: 'var(--color-brand)' }}
                >
                  {secondsLeft}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Phase guide */}
        <div className="flex gap-3" aria-hidden="true">
          {PHASES.map((p, i) => (
            <div key={p.phase} className="flex flex-col items-center gap-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  background:
                    running && i === phaseIndex
                      ? 'var(--color-brand)'
                      : 'var(--bg-surface-2)',
                }}
              />
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {p.duration}s
              </span>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex gap-3 w-full">
          {!running ? (
            <button
              onClick={() => setRunning(true)}
              className="flex-1 py-4 rounded-2xl font-semibold"
              style={{
                background: 'var(--color-brand)',
                color: 'var(--color-text-invert)',
                minHeight: '56px',
              }}
            >
              Start
            </button>
          ) : (
            <button
              onClick={() => { setRunning(false); setPhaseIndex(0); setSecondsLeft(4); }}
              className="flex-1 py-4 rounded-2xl font-semibold"
              style={{
                background: 'var(--bg-surface-2)',
                color: 'var(--color-text-soft)',
                minHeight: '56px',
              }}
            >
              Reset
            </button>
          )}
          <button
            onClick={closeModal}
            className="flex-1 py-4 rounded-2xl font-semibold"
            style={{
              background: 'var(--bg-muted)',
              color: 'var(--color-text-soft)',
              minHeight: '56px',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
