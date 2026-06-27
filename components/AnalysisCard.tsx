'use client';

import type { Analysis } from '@/lib/ai/schemas';
import type { Technique } from '@/lib/knowledge/techniques';
import TechniqueFeedback from './TechniqueFeedback';
import { useTextToSpeech } from '@/lib/voice/useSpeech';

interface AnalysisCardProps {
  analysis: Analysis;
  technique: Technique;
  provider: 'gemini' | 'bedrock' | 'none';
  degraded: boolean;
  uid?: string;
}

const MOOD_EMOJI: Record<number, string> = {
  1: '😔', 2: '😟', 3: '😕', 4: '😐', 5: '🙂',
  6: '😊', 7: '😄', 8: '😁', 9: '🤩', 10: '🌟',
};

function moodEmoji(mood: number): string {
  const rounded = Math.round(mood) as keyof typeof MOOD_EMOJI;
  return MOOD_EMOJI[rounded] ?? '🙂';
}

const TRIGGER_LABELS: Record<string, string> = {
  academic_pressure:    'Academic pressure',
  peer_comparison:      'Peer comparison',
  parental_expectation: 'Family expectations',
  time_management:      'Time management',
  test_anxiety:         'Test anxiety',
  self_doubt:           'Self-doubt',
  sleep_deprivation:    'Sleep',
  social_isolation:     'Social isolation',
  physical_health:      'Physical health',
  future_uncertainty:   'Future uncertainty',
  financial_stress:     'Financial stress',
  other:                'Other',
};

export default function AnalysisCard({
  analysis,
  technique,
  provider,
  degraded,
  uid,
}: AnalysisCardProps) {
  const tts = useTextToSpeech();

  return (
    <div
      aria-live="polite"
      aria-label="Analysis results"
      className="flex flex-col gap-4"
    >
      {/* Degraded notice */}
      {degraded && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{
            background: 'var(--bg-surface-2)',
            color: 'var(--color-text-soft)',
            border: '1px solid var(--bg-muted)',
          }}
          role="note"
          aria-label="AI temporarily unavailable"
        >
          <strong>AI is temporarily unavailable</strong> — here&rsquo;s a grounded
          technique to help right now.
        </div>
      )}

      {/* Supportive message */}
      <div
        className="card"
        style={{ borderLeft: '4px solid var(--color-brand)' }}
      >
        <div className="flex items-start gap-2">
          <p
            className="text-base leading-relaxed flex-1"
            style={{ color: 'var(--color-text)' }}
          >
            {analysis.supportiveMessage}
          </p>

          {/* Read aloud button — hidden if TTS not supported */}
          {tts.supported && (
            <button
              type="button"
              onClick={() =>
                tts.speaking
                  ? tts.stop()
                  : tts.speak(analysis.supportiveMessage)
              }
              aria-label={tts.speaking ? 'Stop reading aloud' : 'Read message aloud'}
              aria-pressed={tts.speaking}
              className="shrink-0 flex items-center justify-center rounded-full"
              style={{
                width: '36px',
                height: '36px',
                background: tts.speaking
                  ? 'var(--color-brand-soft)'
                  : 'transparent',
                color: tts.speaking
                  ? 'var(--color-brand-dark)'
                  : 'var(--color-text-muted)',
                border: '1.5px solid var(--bg-surface-2)',
                cursor: 'pointer',
              }}
            >
              {/* Speaker SVG icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                width="16"
                height="16"
                aria-hidden="true"
              >
                {tts.speaking ? (
                  /* Pause bars when speaking */
                  <>
                    <rect x="6" y="5" width="4" height="14" rx="1" />
                    <rect x="14" y="5" width="4" height="14" rx="1" />
                  </>
                ) : (
                  /* Speaker icon */
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                )}
              </svg>
            </button>
          )}
        </div>

        {/* Detected mood row */}
        <div className="flex items-center gap-2 mt-3">
          <span aria-hidden="true" style={{ fontSize: '1.4rem' }}>
            {moodEmoji(analysis.detectedMood)}
          </span>
          <span
            className="text-sm"
            style={{ color: 'var(--color-text-soft)' }}
          >
            Mood detected: <strong>{analysis.detectedMood}/10</strong>
          </span>
        </div>
      </div>

      {/* Trigger chips */}
      {analysis.triggers.length > 0 && (
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: 'var(--color-text-muted)' }}
          >
            What I noticed
          </p>
          <div className="flex flex-wrap gap-2" role="list" aria-label="Detected triggers">
            {analysis.triggers.map((t) => (
              <span
                key={t}
                role="listitem"
                className="text-xs px-3 py-1.5 rounded-full"
                style={{
                  background: 'var(--color-brand-soft)',
                  color: 'var(--color-brand-dark)',
                  fontWeight: 500,
                }}
              >
                {TRIGGER_LABELS[t] ?? t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Technique card */}
      <div
        className="card"
        style={{ background: 'var(--bg-muted)' }}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-wider mb-1"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Try this — {technique.durationMin} min
            </p>
            <h3
              className="text-base font-bold"
              style={{ color: 'var(--color-text)' }}
            >
              {technique.name}
            </h3>
            <p
              className="text-sm mt-0.5"
              style={{ color: 'var(--color-text-soft)' }}
            >
              {technique.oneLiner}
            </p>
          </div>
          <span
            className="text-xs px-2 py-1 rounded-full shrink-0"
            style={{
              background: 'var(--bg-surface)',
              color: 'var(--color-text-muted)',
            }}
          >
            {technique.category}
          </span>
        </div>

        <ol className="flex flex-col gap-2 mt-3">
          {technique.steps.map((step, i) => (
            <li key={i} className="flex gap-2.5 text-sm" style={{ color: 'var(--color-text)' }}>
              <span
                className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  background: 'var(--color-brand-soft)',
                  color: 'var(--color-brand-dark)',
                }}
                aria-hidden="true"
              >
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>

        <a
          href={technique.source}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-3 text-xs"
          style={{ color: 'var(--color-brand)' }}
          aria-label={`Learn more about ${technique.name} (opens in new tab)`}
        >
          Learn more ↗
        </a>

        {/* Feedback widget — only when uid is available */}
        {uid && (
          <TechniqueFeedback uid={uid} techniqueId={technique.id} />
        )}
      </div>

      {/* Reframe */}
      {analysis.reframe && (
        <div
          className="rounded-xl px-4 py-3"
          style={{
            background: 'var(--color-brand-soft)',
            borderLeft: '3px solid var(--color-brand)',
          }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-wider mb-1"
            style={{ color: 'var(--color-brand-dark)' }}
          >
            A different angle
          </p>
          <p className="text-sm" style={{ color: 'var(--color-text)' }}>
            {analysis.reframe}
          </p>
        </div>
      )}

      {/* Provider badge */}
      {!degraded && (
        <p
          className="text-xs text-right"
          style={{ color: 'var(--color-text-muted)' }}
          aria-label={`Response generated by ${provider}`}
        >
          Answered by {provider === 'gemini' ? 'Gemini' : provider === 'bedrock' ? 'Claude (Bedrock)' : 'AI'}
        </p>
      )}
    </div>
  );
}
