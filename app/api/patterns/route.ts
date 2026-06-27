/**
 * POST /api/patterns — the Stress Fingerprint narration.
 *
 * The client sends its (already analysed) entries. We compute the correlation
 * DETERMINISTICALLY (lib/patterns/aggregate) and then ask the LLM only to
 * NARRATE the computed top stressors in a warm, plain voice. The model is given
 * the numbers and told not to invent anything — so the insight is always backed
 * by real data, never a hallucinated trend.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/verify';
import { rateLimit } from '@/lib/security/ratelimit';
import { generateText } from '@/lib/ai/generate';
import { buildFingerprint, type EntryLike } from '@/lib/patterns/aggregate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const entrySchema = z.object({
  createdAt: z.number(),
  mood: z.number().min(1).max(10).nullable(),
  analysis: z
    .object({
      detectedMood: z.number(),
      entities: z.array(z.object({ text: z.string(), category: z.string() })),
      triggers: z.array(z.string()),
    })
    .nullable(),
});

const bodySchema = z.object({
  exam: z.string().max(20).default('OTHER'),
  entries: z.array(entrySchema).max(120),
});

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const rl = rateLimit(`patterns:${user.uid}`);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    );
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

  const fingerprint = buildFingerprint(body.entries as EntryLike[]);

  // Not enough data: be honest, do not guess.
  if (fingerprint.needsMoreData || fingerprint.topStressors.length === 0) {
    return NextResponse.json({
      fingerprint,
      narration: '',
      provider: 'none',
    });
  }

  const facts = fingerprint.topStressors
    .map(
      (s) =>
        `- ${s.label} (${s.kind}): appeared ${s.count}x, average mood ${s.avgMood} vs your overall ${fingerprint.overallAvgMood}`,
    )
    .join('\n');

  const result = await generateText({
    system:
      'You are Saathi. You will be given a student\'s stress fingerprint, already computed from their real journal entries. Narrate the single clearest pattern in 2-3 warm, plain sentences, naming the specific trigger(s). Do NOT invent anything beyond the numbers given. No clinical language, no false cheerfulness.',
    prompt: `Overall average mood: ${fingerprint.overallAvgMood}/10. Mood trend: ${fingerprint.moodTrend}.\nTop stressors:\n${facts}\n\nWrite the narration.`,
    maxTokens: 220,
  });

  return NextResponse.json({
    fingerprint,
    narration: result.ok ? result.text : '',
    provider: result.provider,
  });
}
