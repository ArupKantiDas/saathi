'use client';

import { useState, useEffect } from 'react';
import AnalysisCard from './AnalysisCard';
import AnalysisSkeleton from './AnalysisSkeleton';
import CrisisBanner from './CrisisBanner';
import VoiceButton from './VoiceButton';
import Chat from './Chat';
import { addEntry, listEntries, topHelpfulTechniqueIds } from '@/lib/store';
import { useSpeechToText } from '@/lib/voice/useSpeech';
import { getTechnique } from '@/lib/knowledge/techniques';
import type { Analysis } from '@/lib/ai/schemas';
import type { Technique } from '@/lib/knowledge/techniques';
import type { Helpline } from '@/lib/knowledge/helplines';

// ── Types ────────────────────────────────────────────────────────────

interface AnalyzeResult {
  provider: 'gemini' | 'bedrock' | 'none';
  degraded: boolean;
  analysis: Analysis | null;
  crisis: { flagged: boolean; severity: string; source: string };
  technique: Technique;
  helplines?: Helpline[];
}

interface TodayTabProps {
  exam: string;
  uid: string;
  getToken: () => Promise<string>;
}

// ── Quick-tag and mood data ───────────────────────────────────────────

const QUICK_TAGS = [
  { label: '😰 Anxious',    value: 'anxious'    },
  { label: '😔 Low mood',   value: 'low'        },
  { label: '😤 Frustrated', value: 'frustrated' },
  { label: '😴 Exhausted',  value: 'exhausted'  },
  { label: '🙂 Okay',       value: 'okay'       },
  { label: '😊 Good',       value: 'good'       },
] as const;

const MOOD_LABELS: Record<number, string> = {
  1: 'Very low', 2: 'Low', 3: 'Struggling', 4: 'A bit off', 5: 'Okay',
  6: 'Pretty good', 7: 'Good', 8: 'Great', 9: 'Really great', 10: 'Excellent',
};

const CHAR_LIMIT = 1500;
const RECENT_CONTEXT_CHAR_LIMIT = 1400;

// ── Build recentContext from history + helpful techniques ─────────────

async function buildRecentContext(uid: string): Promise<string> {
  const [entries, helpfulIds] = await Promise.all([
    listEntries(uid),
    topHelpfulTechniqueIds(uid),
  ]);

  const parts: string[] = [];

  // Themes from the last ~5 entries
  const recent = entries.slice(0, 5);
  const themes = recent
    .flatMap((e) => e.analysis?.themes ?? [])
    .filter(Boolean);
  const uniqueThemes = [...new Set(themes)].slice(0, 8);
  if (uniqueThemes.length > 0) {
    parts.push(`Recent themes from this student's journal: ${uniqueThemes.join(', ')}.`);
  }

  // Techniques the user found helpful
  if (helpfulIds.length > 0) {
    const names = helpfulIds
      .slice(0, 4)
      .map((id) => getTechnique(id)?.name)
      .filter(Boolean) as string[];
    if (names.length > 0) {
      parts.push(`Techniques that have helped this student before: ${names.join(', ')}.`);
    }
  }

  const combined = parts.join(' ');
  return combined.slice(0, RECENT_CONTEXT_CHAR_LIMIT);
}

// ── Main component ────────────────────────────────────────────────────

export default function TodayTab({ exam, uid, getToken }: TodayTabProps) {
  // Form state
  const [text, setText]           = useState('');
  const [mood, setMood]           = useState<number>(5);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  // Flow state
  const [analyzing, setAnalyzing]             = useState(false);
  const [result, setResult]                   = useState<AnalyzeResult | null>(null);
  const [crisisHelplines, setCrisisHelplines] = useState<Helpline[]>([]);
  const [showChat, setShowChat]               = useState(false);
  const [lastEntryText, setLastEntryText]     = useState('');
  const [submitError, setSubmitError]         = useState<string | null>(null);

  // Voice dictation
  const stt = useSpeechToText();

  // Append completed transcript to textarea
  useEffect(() => {
    if (!stt.listening && stt.transcript) {
      setText((prev) => {
        const spacer = prev && !prev.endsWith(' ') ? ' ' : '';
        return (prev + spacer + stt.transcript).slice(0, CHAR_LIMIT);
      });
      stt.reset();
    }
  }, [stt.listening, stt.transcript, stt.reset]);

  const resetForm = () => {
    setResult(null);
    setAnalyzing(false);
    setCrisisHelplines([]);
    setShowChat(false);
    setSubmitError(null);
    setText('');
    setActiveTag(null);
    setMood(5);
  };

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || analyzing) return;

    setLastEntryText(trimmed);
    setAnalyzing(true);
    setResult(null);
    setCrisisHelplines([]);
    setSubmitError(null);

    try {
      const [token, recentContext] = await Promise.all([
        getToken(),
        buildRecentContext(uid),
      ]);

      const body: Record<string, unknown> = {
        exam,
        entryText: trimmed,
        mood,
      };

      // Merge quick tag + history context
      const contextParts: string[] = [];
      if (activeTag) contextParts.push(`Quick mood tag: ${activeTag}`);
      if (recentContext) contextParts.push(recentContext);
      if (contextParts.length > 0) {
        body.recentContext = contextParts.join(' ').slice(0, RECENT_CONTEXT_CHAR_LIMIT);
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
      setResult(data);

      if (data.crisis.flagged && data.helplines && data.helplines.length > 0) {
        setCrisisHelplines(data.helplines);
      }

      // Persist to Firestore (non-fatal)
      if (data.analysis) {
        addEntry(uid, {
          createdAt: Date.now(),
          exam,
          entryText: trimmed,
          mood,
          analysis: data.analysis,
          techniqueId: data.technique.id,
          crisisFlagged: data.crisis.flagged,
        }).catch(() => {/* swallow */});
      }
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleVoiceToggle = () => {
    if (stt.listening) {
      stt.stop();
    } else {
      stt.start();
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div>
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-1"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {exam} prep
        </p>
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
          Today
        </h2>
      </div>

      {/* Crisis banner — always topmost */}
      {result?.crisis.flagged && crisisHelplines.length > 0 && (
        <CrisisBanner helplines={crisisHelplines} />
      )}

      {/* ── Journal form (visible when no result yet) ── */}
      {!result && !analyzing && (
        <div className="card">
          {/* Prompt */}
          <div className="mb-4">
            <label
              htmlFor="journal-textarea"
              className="block text-base font-semibold mb-1"
              style={{ color: 'var(--color-text)' }}
            >
              How are you feeling right now?
            </label>
            <p className="text-sm" style={{ color: 'var(--color-text-soft)' }}>
              Write as little or as much as you like — this is just for you.
            </p>
          </div>

          {/* Quick tags */}
          <div
            className="flex flex-wrap gap-2 mb-4"
            role="group"
            aria-label="Quick mood tags"
          >
            {QUICK_TAGS.map((tag) => (
              <button
                key={tag.value}
                aria-pressed={activeTag === tag.value}
                onClick={() => setActiveTag((p) => (p === tag.value ? null : tag.value))}
                className="text-sm px-3 py-2 rounded-full"
                style={{
                  background: activeTag === tag.value ? 'var(--color-brand-soft)' : 'var(--bg-surface-2)',
                  color: activeTag === tag.value ? 'var(--color-brand-dark)' : 'var(--color-text-soft)',
                  border: activeTag === tag.value ? '1.5px solid var(--color-brand)' : '1.5px solid transparent',
                  minHeight: '36px',
                }}
              >
                {tag.label}
              </button>
            ))}
          </div>

          {/* Textarea + mic button */}
          <div className="mb-4">
            <div className="relative">
              <textarea
                id="journal-textarea"
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, CHAR_LIMIT))}
                placeholder="e.g. I bombed today's mock test and now my parents are asking about results again…"
                rows={5}
                className="w-full p-4 rounded-2xl resize-none"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1.5px solid var(--bg-surface-2)',
                  color: 'var(--color-text)',
                  fontSize: '0.9375rem',
                  lineHeight: 1.6,
                  boxShadow: 'var(--shadow-card)',
                  outline: 'none',
                  paddingRight: stt.supported ? '3.5rem' : undefined,
                }}
                aria-label="Journal entry"
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-brand)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--bg-surface-2)'; }}
              />

              {/* Mic button — only shown when STT supported */}
              {stt.supported && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '0.75rem',
                    right: '0.75rem',
                  }}
                >
                  <VoiceButton
                    listening={stt.listening}
                    onToggle={handleVoiceToggle}
                    label={stt.listening ? 'Stop voice input' : 'Dictate into journal'}
                  />
                </div>
              )}
            </div>

            {/* Live transcript hint */}
            {stt.listening && stt.transcript && (
              <p
                className="text-xs mt-1 italic"
                style={{ color: 'var(--color-text-muted)' }}
                aria-live="polite"
                aria-label="Live transcript"
              >
                {stt.transcript}
              </p>
            )}

            <p
              className="text-right text-xs mt-1"
              style={{ color: 'var(--color-text-muted)' }}
              aria-live="polite"
            >
              {text.length}/{CHAR_LIMIT}
            </p>
          </div>

          {/* Mood slider */}
          <div className="mb-4">
            <label
              htmlFor="mood-slider"
              className="block text-sm font-semibold mb-2"
              style={{ color: 'var(--color-text)' }}
            >
              Mood: {mood}/10 — {MOOD_LABELS[mood]}
            </label>
            <input
              id="mood-slider"
              type="range"
              min={1} max={10} step={1}
              value={mood}
              onChange={(e) => setMood(Number(e.target.value))}
              className="w-full"
              style={{ accentColor: 'var(--color-brand)', height: '6px', cursor: 'pointer' }}
              aria-valuemin={1}
              aria-valuemax={10}
              aria-valuenow={mood}
              aria-valuetext={MOOD_LABELS[mood]}
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
          {submitError && (
            <div
              className="rounded-xl px-4 py-3 text-sm mb-4"
              role="alert"
              style={{ background: 'var(--bg-surface-2)', color: 'var(--color-text)' }}
            >
              {submitError}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!text.trim()}
            className="w-full py-4 rounded-2xl font-semibold"
            style={{
              background: 'var(--color-brand)',
              color: 'var(--color-text-invert)',
              opacity: !text.trim() ? 0.5 : 1,
              cursor: !text.trim() ? 'not-allowed' : 'pointer',
              minHeight: '56px',
              fontSize: '1rem',
            }}
            aria-label="Reflect with Saathi"
          >
            Reflect with Saathi
          </button>
        </div>
      )}

      {/* ── Skeleton while analyzing ── */}
      {analyzing && <AnalysisSkeleton />}

      {/* ── Analysis result ── */}
      {result && !analyzing && (
        <>
          <AnalysisCard
            analysis={result.analysis ?? {
              detectedMood: mood,
              emotions: [],
              entities: [],
              triggers: [],
              themes: [],
              crisis: { flagged: false, severity: 'none', rationale: '' },
              copingTechniqueId: result.technique.id,
              reframe: '',
              supportiveMessage: 'Here is a grounded technique to help right now.',
            }}
            technique={result.technique}
            provider={result.provider}
            degraded={result.degraded}
            uid={uid}
          />

          <button
            onClick={resetForm}
            className="w-full py-3 rounded-2xl text-sm font-semibold"
            style={{
              background: 'var(--bg-surface-2)',
              color: 'var(--color-text-soft)',
              minHeight: '48px',
            }}
          >
            Write another entry
          </button>

          {!showChat ? (
            <button
              onClick={() => setShowChat(true)}
              className="w-full py-3 rounded-2xl text-sm font-semibold"
              style={{
                background: 'var(--color-brand-soft)',
                color: 'var(--color-brand-dark)',
                border: '1.5px solid var(--color-brand)',
                minHeight: '48px',
              }}
              aria-label="Talk with Saathi"
            >
              Talk it through with Saathi
            </button>
          ) : (
            <div className="card">
              <h3
                className="text-sm font-semibold mb-3"
                style={{ color: 'var(--color-text-soft)' }}
              >
                Chat with Saathi
              </h3>
              <Chat
                exam={exam}
                getToken={getToken}
                recentContext={lastEntryText}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
