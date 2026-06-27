'use client';

import { useState } from 'react';
import { saveExam } from '@/lib/store';

const EXAMS = ['NEET', 'JEE', 'CUET', 'CAT', 'GATE', 'UPSC'] as const;
type Exam = typeof EXAMS[number];

interface OnboardingProps {
  uid: string;
  onComplete: (exam: string) => void;
}

export default function Onboarding({ uid, onComplete }: OnboardingProps) {
  const [selected, setSelected] = useState<Exam | null>(null);
  const [saving, setSaving] = useState(false);

  const handleContinue = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await saveExam(uid, selected);
      onComplete(selected);
    } catch {
      setSaving(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 py-10"
      style={{ background: 'var(--bg-base)' }}
    >
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl"
            style={{ background: 'var(--color-brand-soft)' }}
            aria-hidden="true"
          >
            🌱
          </div>
          <h1
            className="text-2xl font-semibold mb-2"
            style={{ color: 'var(--color-text)' }}
          >
            Welcome to Saathi
          </h1>
          <p style={{ color: 'var(--color-text-soft)', fontSize: '1rem' }}>
            Your calm companion through exam prep. Which exam are you preparing for?
          </p>
        </div>

        {/* Exam grid */}
        <div
          className="grid grid-cols-2 gap-3 mb-8"
          role="radiogroup"
          aria-label="Choose your exam"
        >
          {EXAMS.map((exam) => (
            <button
              key={exam}
              role="radio"
              aria-checked={selected === exam}
              onClick={() => setSelected(exam)}
              className="py-4 rounded-2xl font-semibold text-base transition-all"
              style={{
                border: selected === exam
                  ? '2px solid var(--color-brand)'
                  : '2px solid transparent',
                background: selected === exam
                  ? 'var(--color-brand-soft)'
                  : 'var(--bg-surface)',
                color: selected === exam
                  ? 'var(--color-brand-dark)'
                  : 'var(--color-text)',
                boxShadow: 'var(--shadow-card)',
                minHeight: '56px',
              }}
            >
              {exam}
            </button>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={handleContinue}
          disabled={!selected || saving}
          className="w-full py-4 rounded-2xl font-semibold text-base transition-opacity"
          style={{
            background: 'var(--color-brand)',
            color: 'var(--color-text-invert)',
            opacity: !selected || saving ? 0.5 : 1,
            cursor: !selected || saving ? 'not-allowed' : 'pointer',
            minHeight: '56px',
          }}
          aria-busy={saving}
        >
          {saving ? 'Saving…' : 'Let\'s begin'}
        </button>

        <p
          className="text-center mt-6"
          style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}
        >
          Saathi is a wellbeing companion, not a substitute for professional care.
        </p>
      </div>
    </div>
  );
}
