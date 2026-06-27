/**
 * TEMPORARY M0 verification route — proves both providers do real round-trips.
 * Removed before final submission. GET /api/health
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { bedrockStructured } from '@/lib/ai/bedrock';
import { geminiStructured } from '@/lib/ai/gemini';
import { generateStructured } from '@/lib/ai/generate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({ ok: z.boolean(), word: z.string() });
const jsonSchema = {
  type: 'object',
  properties: { ok: { type: 'boolean' }, word: { type: 'string' } },
  required: ['ok', 'word'],
};
const schemaHint = '{ "ok": boolean, "word": string }';
const system = 'You are a test endpoint. Always set ok=true and word="pong".';
const prompt = 'Health check.';

export async function GET() {
  const out: Record<string, unknown> = {};

  try {
    out.bedrock = await bedrockStructured({ system, prompt, jsonSchema });
  } catch (e) {
    out.bedrock = `ERROR: ${(e as Error).message}`;
  }

  try {
    out.gemini = await geminiStructured({ system, prompt, schemaHint });
  } catch (e) {
    out.gemini = `ERROR: ${(e as Error).message}`;
  }

  out.orchestrator = await generateStructured({
    system,
    prompt,
    schema,
    jsonSchema,
    schemaHint,
  });

  return NextResponse.json(out);
}
