/**
 * POST /api/analyze — the core journal pipeline.
 *
 * Flow: verify Firebase token -> rate-limit -> validate input ->
 *       LLM structured analysis (Gemini -> Bedrock -> degraded) ->
 *       fail-safe crisis assessment -> resolve a GROUNDED coping technique.
 *
 * Guarantees:
 *  - Never an open proxy (401 without a valid token).
 *  - Coping technique is always a real id from the curated library.
 *  - Crisis decision is the OR of a deterministic screen and the model.
 *  - On total LLM failure we return a clearly-labelled offline technique,
 *    never a fabricated "AI" answer.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/verify';
import { rateLimit } from '@/lib/security/ratelimit';
import { generateStructured } from '@/lib/ai/generate';
import {
  analysisSchema,
  analysisJsonSchema,
  analysisSchemaHint,
} from '@/lib/ai/schemas';
import { analysisSystem, analysisPrompt } from '@/lib/ai/prompts';
import { assessCrisis } from '@/lib/safety/crisis';
import {
  getTechnique,
  fallbackTechnique,
} from '@/lib/knowledge/techniques';
import { HELPLINES } from '@/lib/knowledge/helplines';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  exam: z.string().max(20).default('OTHER'),
  entryText: z.string().min(1).max(4000),
  mood: z.number().min(1).max(10).optional(),
  recentContext: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const rl = rateLimit(`analyze:${user.uid}`);
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

  const result = await generateStructured({
    system: analysisSystem(body.exam),
    prompt: analysisPrompt(body.entryText, body.mood, body.recentContext),
    schema: analysisSchema,
    jsonSchema: analysisJsonSchema,
    schemaHint: analysisSchemaHint,
    maxTokens: 1100,
  });

  // Degraded: both providers failed. Offer a real, labelled offline technique.
  if (!result.ok) {
    const kwCrisis = assessCrisis(body.entryText, false, 'none');
    const technique = fallbackTechnique([]);
    return NextResponse.json({
      provider: 'none',
      degraded: true,
      analysis: null,
      crisis: kwCrisis,
      technique,
      helplines: kwCrisis.flagged ? HELPLINES : undefined,
    });
  }

  const analysis = result.data;

  // Fail-safe crisis: deterministic screen OR model assessment.
  const crisis = assessCrisis(
    body.entryText,
    analysis.crisis.flagged,
    analysis.crisis.severity,
  );

  // Grounding: ensure the technique id is real; otherwise pick deterministically.
  const technique =
    getTechnique(analysis.copingTechniqueId) ??
    fallbackTechnique(analysis.triggers);

  return NextResponse.json({
    provider: result.provider,
    degraded: false,
    analysis,
    crisis,
    technique,
    helplines: crisis.flagged ? HELPLINES : undefined,
  });
}
