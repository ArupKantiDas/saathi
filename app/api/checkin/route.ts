/**
 * POST /api/checkin — wearable stress-spike intervention.
 *
 * verify token -> rate-limit -> validate -> real GenAI calming nudge.
 * The sensor data is simulated on the client; the AI reply is a real API call.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/verify';
import { rateLimit } from '@/lib/security/ratelimit';
import { generateText } from '@/lib/ai/generate';
import { getTechnique } from '@/lib/knowledge/techniques';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  exam: z.string().max(20).default('OTHER'),
  heartRate: z.number(),
  baseline: z.number(),
});

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const rl = rateLimit(`checkin:${user.uid}`);
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

  const tech = getTechnique('478-breathing')!;
  const result = await generateText({
    system: 'You are Saathi, a warm exam-prep wellbeing companion. Plain words, 2 short sentences, no clinical tone, no ids or codes.',
    prompt: `The student's heart rate just rose from ${body.baseline} to ${body.heartRate} bpm — a sign of acute stress during ${body.exam} prep. Gently acknowledge it and invite them to try the ${tech.name} exercise with you.`,
    maxTokens: 160,
  });

  return NextResponse.json({
    provider: result.provider,
    degraded: result.degraded,
    intervention: result.ok
      ? result.text
      : `Your heart rate just jumped. Let's slow it down together with ${tech.name}.`,
    technique: tech,
  });
}
