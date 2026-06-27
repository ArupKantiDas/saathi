'use client';

/**
 * TechniqueFeedback — "Did this help?" rating widget shown below a technique.
 * Saves ratings to Firestore via store.rateTechnique.
 * Shows a brief thank-you state after rating.
 */

import { useState } from 'react';
import { rateTechnique } from '@/lib/store';

type Rating = 'helpful' | 'somewhat' | 'no';

interface TechniqueFeedbackProps {
  uid: string;
  techniqueId: string;
}

const RATINGS: { value: Rating; label: string }[] = [
  { value: 'helpful',  label: 'Yes'        },
  { value: 'somewhat', label: 'Somewhat'   },
  { value: 'no',       label: 'Not really' },
];

export default function TechniqueFeedback({ uid, techniqueId }: TechniqueFeedbackProps) {
  const [selected, setSelected] = useState<Rating | null>(null);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const handleRate = async (rating: Rating) => {
    if (saving || saved) return;
    setSelected(rating);
    setSaving(true);
    setError(null);

    try {
      await rateTechnique(uid, techniqueId, rating);
      setSaved(true);
    } catch {
      setError('Couldn\'t save — tap to retry.');
      setSelected(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="mt-3 pt-3"
      style={{ borderTop: '1px solid var(--bg-surface-2)' }}
    >
      {saved ? (
        <p
          className="text-sm"
          style={{ color: 'var(--color-text-soft)' }}
          aria-live="polite"
        >
          Thanks for letting Saathi know — it helps personalise what&rsquo;s suggested next time.
        </p>
      ) : (
        <>
          <p
            className="text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: 'var(--color-text-muted)' }}
            id={`feedback-label-${techniqueId}`}
          >
            Did this help?
          </p>
          <div
            role="group"
            aria-labelledby={`feedback-label-${techniqueId}`}
            className="flex gap-2 flex-wrap"
          >
            {RATINGS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleRate(value)}
                disabled={saving}
                aria-pressed={selected === value}
                aria-label={label}
                className="text-sm px-3 py-1.5 rounded-full"
                style={{
                  background:
                    selected === value
                      ? 'var(--color-brand-soft)'
                      : 'var(--bg-surface)',
                  color:
                    selected === value
                      ? 'var(--color-brand-dark)'
                      : 'var(--color-text-soft)',
                  border:
                    selected === value
                      ? '1.5px solid var(--color-brand)'
                      : '1.5px solid var(--bg-surface-2)',
                  opacity: saving && selected !== value ? 0.5 : 1,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  minHeight: '36px',
                  fontWeight: 500,
                }}
              >
                {saving && selected === value ? '…' : label}
              </button>
            ))}
          </div>

          {error && (
            <p
              className="text-xs mt-1"
              role="alert"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {error}
            </p>
          )}
        </>
      )}
    </div>
  );
}
