/**
 * Crisis detection — fail-safe by design.
 *
 * Two independent signals decide whether the crisis path triggers:
 *   1. A deterministic keyword/phrase screen (this module). It cannot be
 *      reasoned away by a model and acts as a hard floor.
 *   2. The LLM's own crisis assessment in the structured analysis.
 *
 * The final decision is the OR of both, and severity is the MAX. We always err
 * toward showing help: a false positive costs a student a few seconds of
 * helpline info; a false negative is unacceptable. When crisis triggers, the
 * caller suppresses normal coaching and shows verified helplines instead.
 */
import type { CRISIS_SEVERITY } from '@/lib/ai/schemas';

type Severity = (typeof CRISIS_SEVERITY)[number];

// High-risk expressions. Word-boundary matched, case-insensitive. Kept
// conservative and explicit; this is a floor, not the whole system.
const HIGH_RISK: RegExp[] = [
  /\bkill myself\b/i,
  /\bkilling myself\b/i,
  /\bkill me\b/i,
  /\bend(ed|ing)? my life\b/i,
  /\btake my (own )?life\b/i,
  /\bdon'?t want to be here\b/i,
  /\bno point (in )?living\b/i,
  /\bnot worth living\b/i,
  /\bwant to die\b/i,
  /\bwish i (was|were) dead\b/i,
  /\bbetter off dead\b/i,
  /\bno reason to live\b/i,
  /\bdon'?t want to (be alive|live)\b/i,
  /\bsuicid(e|al)\b/i,
  /\bself[-\s]?harm\b/i,
  /\bcut myself\b/i,
  /\bhurt myself\b/i,
  /\boverdose\b/i,
  /\bcan'?t go on\b/i,
  /\bend it all\b/i,
];

export interface CrisisVerdict {
  flagged: boolean;
  severity: Severity;
  source: 'keyword' | 'model' | 'both' | 'none';
}

const RANK: Record<Severity, number> = { none: 0, low: 1, medium: 2, high: 3 };
const maxSeverity = (a: Severity, b: Severity): Severity =>
  RANK[a] >= RANK[b] ? a : b;

/** Deterministic screen — returns true if any high-risk phrase is present. */
export function keywordCrisis(text: string): boolean {
  return HIGH_RISK.some((re) => re.test(text));
}

/**
 * Combine the deterministic screen with the model's assessment.
 * @param text         raw journal/chat text
 * @param modelFlagged the LLM's crisis.flagged
 * @param modelSeverity the LLM's crisis.severity
 */
export function assessCrisis(
  text: string,
  modelFlagged: boolean,
  modelSeverity: Severity,
): CrisisVerdict {
  const kw = keywordCrisis(text);
  const flagged = kw || modelFlagged;
  if (!flagged) return { flagged: false, severity: 'none', source: 'none' };

  // Keyword hits are treated as at least 'high'; combine with model severity.
  const kwSeverity: Severity = kw ? 'high' : 'none';
  const severity = maxSeverity(kwSeverity, modelFlagged ? modelSeverity : 'none');

  const source: CrisisVerdict['source'] =
    kw && modelFlagged ? 'both' : kw ? 'keyword' : 'model';

  return { flagged: true, severity: severity === 'none' ? 'low' : severity, source };
}
