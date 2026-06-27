'use client';

import { useState } from 'react';
import type { Analysis } from '@/lib/ai/schemas';
import type { Technique } from '@/lib/knowledge/techniques';
import type { Helpline } from '@/lib/knowledge/helplines';

const QUICK_TAGS = [
  { label: '😰 Anxious',   value: 'anxious'   },
  { label: '😔 Low mood',  value: 'low'       },
  { label: '😤 Frustrated',value: 'frustrated'},
  { label: '😴 Exhausted', value: 'exhausted' },
  { label: '🙂 Okay',      value: 'okay'      },
  { label: '😊 Good',      value: 'good'      },
];

const MOOD_LABELS: Record<number, string> = {
  1: 'Very low', 2: 'Low', 3: 'Struggling', 4: 'A bit off', 5: 'Okay',
  6: 'Pretty good', 7: 'Good', 8: 'Great', 9: 'Really great', 10: 'Excellent',
};

export interface AnalyzeResult {
  provider: 'gemini' | 'bedrock' | 'none';
  degraded: boolean;
  analysis: Analysis | null;
  crisis: { flagged: boolean; severity: string; source: string };
  technique: Technique;
  helplines?: Helpline[];
}

interface JournalEntryProps {
  exam: string;
  getToken: () => Promise<string>;
  onResult: (result: AnalyzeResult) => void;
}

export default function JournalEntry({ exam, getToken, onResult }: JournalEntryProps) {
  const [text, setText] = useState('');
  const [mood, setMood] = useState<number>(5);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const charLimit = 1500;

  const toggleTag = (value: string) => {
    setActiveTag((prev) => (prev === value ? null : value));
  };

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const body: Record<string, unknown> = {
        exam,
        entryText: trimmed,
        mood,
      };
      if (activeTag) {
        body.recentContext = `Quick mood tag: ${activeTag}`;
      }

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errData.error ?? `Server error ${res.status}`);
      }

      const data = (await res.json()) as AnalyzeResult;
      onResult(data);
      // Reset form
      setText('');
      setActiveTag(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Prompt */}
      <div>
        <label
          htmlFor="journal-textarea"
          className="block text-base font-semibold mb-1"
          style={{ color: 'var(--color-text)' }}
        >
          How are you feeling right now?
        </label>
        <p className="text-sm mb-3" style={{ color: 'var(--color-text-soft)' }}>
          Write as little or as much as you like — this is just for you.
        </p>
      </div>

      {/* Quick tags */}
      <div role="group" aria-label="Quick mood tags">
        <div className="flex flex-wrap gap-2">
          {QUICK_TAGS.map((tag) => (
            <button
              key={tag.value}
              aria-pressed={activeTag === tag.value}
              onClick={() => toggleTag(tag.value)}
              className="text-sm px-3 py-2 rounded-full transition-all"
              style={{
                background:
                  activeTag === tag.value
                    ? 'var(--color-brand-soft)'
                    : 'var(--bg-surface-2)',
                color:
                  activeTag === tag.value
                    ? 'var(--color-brand-dark)'
                    : 'var(--color-text-soft)',
                border:
                  activeTag === tag.value
                    ? '1.5px solid var(--color-brand)'
                    : '1.5px solid transparent',
                minHeight: '36px',
              }}
            >
              {tag.label}
            </button>
          ))}
        </div>
      </div>

      {/* Textarea */}
      <div>
        <textarea
          id="journal-textarea"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, charLimit))}
          placeholder="e.g. I bombed today's mock test and now my parents are asking about results again…"
          rows={5}
          className="w-full p-4 rounded-2xl resize-none transition-shadow"
          style={{
            background: 'var(--bg-surface)',
            border: '1.5px solid var(--bg-surface-2)',
            color: 'var(--color-text)',
            fontSize: '0.9375rem',
            lineHeight: 1.6,
            boxShadow: 'var(--shadow-card)',
            outline: 'none',
          }}
          aria-label="Journal entry"
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-brand)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--bg-surface-2)';
          }}
        />
        <p
          className="text-right text-xs mt-1"
          style={{ color: 'var(--color-text-muted)' }}
          aria-live="polite"
          aria-label={`${text.length} of ${charLimit} characters`}
        >
          {text.length}/{charLimit}
        </p>
      </div>

      {/* Mood slider */}
      <div>
        <label
          htmlFor="mood-slider"
          className="block text-sm font-semibold mb-2"
          style={{ color: 'var(--color-text)' }}
        >
          Mood level: {mood}/10 &mdash; {MOOD_LABELS[mood]}
        </label>
        <input
          id="mood-slider"
          type="range"
          min={1}
          max={10}
          step={1}
          value={mood}
          onChange={(e) => setMood(Number(e.target.value))}
          className="w-full"
          style={{
            accentColor: 'var(--color-brand)',
            height: '6px',
            cursor: 'pointer',
          }}
          aria-valuemin={1}
          aria-valuemax={10}
          aria-valuenow={mood}
          aria-valuetext={`${MOOD_LABELS[mood]}`}
        />
        <div
          className="flex justify-between text-xs mt-1"
          style={{ color: 'var(--color-text-muted)' }}
          aria-hidden="true"
        >
          <span>😔 Very low</span>
          <span>🌟 Excellent</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          role="alert"
          style={{
            background: 'var(--bg-surface-2)',
            color: 'var(--color-text)',
            border: '1px solid var(--bg-muted)',
          }}
        >
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!text.trim() || loading}
        className="w-full py-4 rounded-2xl font-semibold transition-opacity"
        style={{
          background: 'var(--color-brand)',
          color: 'var(--color-text-invert)',
          opacity: !text.trim() || loading ? 0.5 : 1,
          cursor: !text.trim() || loading ? 'not-allowed' : 'pointer',
          minHeight: '56px',
          fontSize: '1rem',
        }}
        aria-busy={loading}
        aria-label="Analyse my entry"
      >
        {loading ? 'Thinking…' : 'Reflect with Saathi'}
      </button>
    </div>
  );
}
