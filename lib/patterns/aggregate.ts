/**
 * Stress Fingerprint — deterministic correlation engine (the hero's core).
 *
 * This is intentionally NOT an LLM. It computes, from the student's real
 * entries, which entities and triggers co-occur with their lower moods. The
 * LLM later only *narrates* this output, so the insight ("your dips line up
 * with peer comparison after mocks") is always backed by real data and can
 * never be a hallucinated trend.
 *
 * Mood per entry = the self-rated mood when present, else the model's detected
 * mood. A "stressor" is something that appears on lower-than-average-mood days;
 * impact ranks by how often it appears AND how far below average those days are.
 */
import type { Analysis } from '@/lib/ai/schemas';

export interface EntryLike {
  createdAt: number;
  mood: number | null;
  analysis: Pick<Analysis, 'detectedMood' | 'entities' | 'triggers'> | null;
}

export interface StressorStat {
  key: string;
  label: string;
  kind: 'trigger' | 'entity';
  category?: string;
  count: number;
  avgMood: number; // average mood on days this appeared
  delta: number; // avgMood - overall average (negative = associated with lower mood)
  impact: number; // ranking score
}

export interface Fingerprint {
  entryCount: number;
  needsMoreData: boolean;
  overallAvgMood: number;
  moodTrend: 'improving' | 'declining' | 'steady' | 'unknown';
  topStressors: StressorStat[];
}

const MIN_ENTRIES = 3;

function entryMood(e: EntryLike): number | null {
  if (typeof e.mood === 'number') return e.mood;
  if (e.analysis && typeof e.analysis.detectedMood === 'number')
    return e.analysis.detectedMood;
  return null;
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

/** Least-squares slope of mood over (chronological) index. */
function trend(moods: number[]): Fingerprint['moodTrend'] {
  if (moods.length < MIN_ENTRIES) return 'unknown';
  const n = moods.length;
  const xs = moods.map((_, i) => i);
  const mx = mean(xs);
  const my = mean(moods);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (moods[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  if (slope > 0.15) return 'improving';
  if (slope < -0.15) return 'declining';
  return 'steady';
}

const TRIGGER_LABELS: Record<string, string> = {
  academic_pressure: 'academic pressure',
  peer_comparison: 'peer comparison',
  parental_expectation: 'parental expectation',
  time_management: 'time management',
  test_anxiety: 'test anxiety',
  self_doubt: 'self-doubt',
  sleep_deprivation: 'sleep deprivation',
  social_isolation: 'social isolation',
  physical_health: 'physical health',
  future_uncertainty: 'future uncertainty',
  financial_stress: 'financial stress',
  other: 'other',
};

export function buildFingerprint(entriesNewestFirst: EntryLike[]): Fingerprint {
  // Work chronologically (oldest -> newest) for the trend.
  const entries = [...entriesNewestFirst]
    .filter((e) => entryMood(e) != null)
    .sort((a, b) => a.createdAt - b.createdAt);

  const moods = entries.map((e) => entryMood(e) as number);
  const overall = mean(moods);

  if (entries.length < MIN_ENTRIES) {
    return {
      entryCount: entries.length,
      needsMoreData: true,
      overallAvgMood: Number(overall.toFixed(1)),
      moodTrend: 'unknown',
      topStressors: [],
    };
  }

  // Accumulate mood samples per trigger and per entity.
  const trig = new Map<string, number[]>();
  const ent = new Map<string, { label: string; category: string; moods: number[] }>();

  for (const e of entries) {
    const m = entryMood(e) as number;
    if (!e.analysis) continue;
    for (const t of e.analysis.triggers ?? []) {
      if (!trig.has(t)) trig.set(t, []);
      trig.get(t)!.push(m);
    }
    for (const en of e.analysis.entities ?? []) {
      const key = en.text.trim().toLowerCase();
      if (!key) continue;
      if (!ent.has(key))
        ent.set(key, { label: en.text.trim(), category: en.category, moods: [] });
      ent.get(key)!.moods.push(m);
    }
  }

  const stats: StressorStat[] = [];

  for (const [key, ms] of trig) {
    const avg = mean(ms);
    const delta = avg - overall;
    stats.push({
      key,
      label: TRIGGER_LABELS[key] ?? key,
      kind: 'trigger',
      count: ms.length,
      avgMood: Number(avg.toFixed(1)),
      delta: Number(delta.toFixed(2)),
      // Impact: weighted by how often AND how much below average. Things tied
      // to lower mood score higher; positive-delta items are de-emphasized.
      impact: ms.length * Math.max(0, -delta + 0.3),
    });
  }

  for (const [key, v] of ent) {
    if (v.moods.length < 2) continue; // need at least 2 appearances to mean anything
    const avg = mean(v.moods);
    const delta = avg - overall;
    stats.push({
      key,
      label: v.label,
      kind: 'entity',
      category: v.category,
      count: v.moods.length,
      avgMood: Number(avg.toFixed(1)),
      delta: Number(delta.toFixed(2)),
      impact: v.moods.length * Math.max(0, -delta + 0.3),
    });
  }

  const topStressors = stats
    .filter((s) => s.impact > 0)
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 6);

  return {
    entryCount: entries.length,
    needsMoreData: false,
    overallAvgMood: Number(overall.toFixed(1)),
    moodTrend: trend(moods),
    topStressors,
  };
}
