'use client';

import { useState } from 'react';
import JournalEntry, { AnalyzeResult } from './JournalEntry';
import AnalysisCard from './AnalysisCard';
import AnalysisSkeleton from './AnalysisSkeleton';
import CrisisBanner from './CrisisBanner';
import Chat from './Chat';
import { addEntry } from '@/lib/store';
import type { Helpline } from '@/lib/knowledge/helplines';

interface TodayTabProps {
  exam: string;
  uid: string;
  getToken: () => Promise<string>;
}

export default function TodayTab({ exam, uid, getToken }: TodayTabProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [crisisHelplines, setCrisisHelplines] = useState<Helpline[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [lastEntryText, setLastEntryText] = useState('');

  // Wrap JournalEntry's getToken to capture loading state
  const handleAnalyzeStart = () => setAnalyzing(true);

  const handleResult = async (res: AnalyzeResult, entryText: string, mood: number) => {
    setAnalyzing(false);
    setResult(res);
    setLastEntryText(entryText);

    // Crisis helplines
    if (res.crisis.flagged && res.helplines && res.helplines.length > 0) {
      setCrisisHelplines(res.helplines);
    }

    // Persist to Firestore
    if (res.analysis) {
      try {
        await addEntry(uid, {
          createdAt: Date.now(),
          exam,
          entryText,
          mood,
          analysis: res.analysis,
          techniqueId: res.technique.id,
          crisisFlagged: res.crisis.flagged,
        });
      } catch {
        // Non-fatal: entry save failure shouldn't break the experience
      }
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

      {/* Crisis banner — above everything */}
      {result?.crisis.flagged && crisisHelplines.length > 0 && (
        <CrisisBanner helplines={crisisHelplines} />
      )}

      {/* Journal form */}
      {!result && !analyzing && (
        <div className="card">
          <WrappedJournal
            exam={exam}
            getToken={getToken}
            onStart={handleAnalyzeStart}
            onResult={handleResult}
          />
        </div>
      )}

      {/* Skeleton while analyzing */}
      {analyzing && <AnalysisSkeleton />}

      {/* Analysis result */}
      {result && !analyzing && (
        <>
          <AnalysisCard
            analysis={result.analysis ?? {
              detectedMood: 5,
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
          />

          {/* New entry button */}
          <button
            onClick={() => {
              setResult(null);
              setAnalyzing(false);
              setCrisisHelplines([]);
              setShowChat(false);
            }}
            className="w-full py-3 rounded-2xl text-sm font-semibold transition-opacity"
            style={{
              background: 'var(--bg-surface-2)',
              color: 'var(--color-text-soft)',
              border: '1.5px solid var(--bg-surface-2)',
              minHeight: '48px',
            }}
          >
            Write another entry
          </button>

          {/* Chat toggle */}
          {!showChat && (
            <button
              onClick={() => setShowChat(true)}
              className="w-full py-3 rounded-2xl text-sm font-semibold transition-opacity"
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
          )}

          {showChat && (
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

// ── Inner wrapper to bridge JournalEntry's API with TodayTab state ───

interface WrappedJournalProps {
  exam: string;
  getToken: () => Promise<string>;
  onStart: () => void;
  onResult: (res: AnalyzeResult, entryText: string, mood: number) => void;
}

function WrappedJournal({ exam, getToken, onStart, onResult }: WrappedJournalProps) {
  const [capturedText, setCapturedText] = useState('');
  const [capturedMood, setCapturedMood] = useState(5);

  // We need to intercept getToken to know when submission starts and capture inputs.
  // A simpler approach: lift result from JournalEntry via callback, passing text+mood.

  return (
    <JournalEntryCapture
      exam={exam}
      getToken={getToken}
      onStart={onStart}
      onCapture={(text, mood) => {
        setCapturedText(text);
        setCapturedMood(mood);
      }}
      onResult={(res) => onResult(res, capturedText, capturedMood)}
    />
  );
}

// We need to pass text + mood up alongside the result, so we create an augmented JournalEntry variant:
interface JournalEntryCaptureProps {
  exam: string;
  getToken: () => Promise<string>;
  onStart: () => void;
  onCapture: (text: string, mood: number) => void;
  onResult: (result: AnalyzeResult) => void;
}

function JournalEntryCapture({
  exam,
  getToken,
  onStart,
  onCapture,
  onResult,
}: JournalEntryCaptureProps) {
  const [text, setText] = useState('');
  const [mood, setMood] = useState<number>(5);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const charLimit = 1500;

  const QUICK_TAGS = [
    { label: '😰 Anxious',    value: 'anxious'   },
    { label: '😔 Low mood',   value: 'low'       },
    { label: '😤 Frustrated', value: 'frustrated'},
    { label: '😴 Exhausted',  value: 'exhausted' },
    { label: '🙂 Okay',       value: 'okay'      },
    { label: '😊 Good',       value: 'good'      },
  ];

  const MOOD_LABELS: Record<number, string> = {
    1: 'Very low', 2: 'Low', 3: 'Struggling', 4: 'A bit off', 5: 'Okay',
    6: 'Pretty good', 7: 'Good', 8: 'Great', 9: 'Really great', 10: 'Excellent',
  };

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    onStart();
    onCapture(trimmed, mood);
    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const body: Record<string, unknown> = { exam, entryText: trimmed, mood };
      if (activeTag) body.recentContext = `Quick mood tag: ${activeTag}`;

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
      setText('');
      setActiveTag(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label
          htmlFor="journal-textarea-main"
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
      <div role="group" aria-label="Quick mood tags" className="flex flex-wrap gap-2">
        {QUICK_TAGS.map((tag) => (
          <button
            key={tag.value}
            aria-pressed={activeTag === tag.value}
            onClick={() => setActiveTag((p) => (p === tag.value ? null : tag.value))}
            className="text-sm px-3 py-2 rounded-full transition-all"
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

      {/* Textarea */}
      <div>
        <textarea
          id="journal-textarea-main"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, charLimit))}
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
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-brand)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--bg-surface-2)'; }}
          aria-label="Journal entry"
        />
        <p
          className="text-right text-xs mt-1"
          style={{ color: 'var(--color-text-muted)' }}
          aria-live="polite"
        >
          {text.length}/{charLimit}
        </p>
      </div>

      {/* Mood slider */}
      <div>
        <label
          htmlFor="mood-slider-main"
          className="block text-sm font-semibold mb-2"
          style={{ color: 'var(--color-text)' }}
        >
          Mood level: {mood}/10 — {MOOD_LABELS[mood]}
        </label>
        <input
          id="mood-slider-main"
          type="range"
          min={1} max={10} step={1}
          value={mood}
          onChange={(e) => setMood(Number(e.target.value))}
          className="w-full"
          style={{ accentColor: 'var(--color-brand)', height: '6px', cursor: 'pointer' }}
          aria-valuemin={1} aria-valuemax={10} aria-valuenow={mood}
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

      {error && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          role="alert"
          style={{ background: 'var(--bg-surface-2)', color: 'var(--color-text)' }}
        >
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!text.trim() || loading}
        className="w-full py-4 rounded-2xl font-semibold"
        style={{
          background: 'var(--color-brand)',
          color: 'var(--color-text-invert)',
          opacity: !text.trim() || loading ? 0.5 : 1,
          cursor: !text.trim() || loading ? 'not-allowed' : 'pointer',
          minHeight: '56px',
          fontSize: '1rem',
        }}
        aria-busy={loading}
      >
        {loading ? 'Thinking…' : 'Reflect with Saathi'}
      </button>
    </div>
  );
}
