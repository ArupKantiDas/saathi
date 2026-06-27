/**
 * Provider orchestrator — the single entry point the app uses for all GenAI.
 *
 * Fallback chain (the chosen model is returned and shown as a badge in the UI
 * so reviewers can see nothing is mocked):
 *
 *   1..N. Google Gemini models in order (e.g. 2.5-flash -> 2.5-flash-lite ->
 *         2.0-flash) — real redundancy against one model's transient errors or
 *         free-tier rate limits.
 *   N+1.  AWS Bedrock (Claude) — OPTIONAL, only if BEDROCK_ENABLED=true. Wired
 *         for cross-cloud failover but disabled by default (the account needs
 *         the Anthropic use-case form approved before Claude can be invoked).
 *   last. degraded: true — every provider failed; the caller shows the clearly
 *         labelled offline path, never a fabricated AI answer.
 *
 * Structured results are validated against the SAME zod schema regardless of
 * model, so anything off-contract is treated as a failure rather than shown.
 */
import type { ZodType } from 'zod';
import { bedrockStructured, bedrockText } from './bedrock';
import { geminiStructured, geminiText } from './gemini';

export type Provider = 'gemini' | 'bedrock' | 'none';

export type GenResult<T> =
  | { ok: true; data: T; provider: Provider; model: string; degraded: false }
  | { ok: false; data: null; provider: 'none'; model: null; degraded: true; error: string };

const TIMEOUT_MS = 15_000;
const BEDROCK_ENABLED = process.env.BEDROCK_ENABLED === 'true';

const GEMINI_MODELS = (
  process.env.GEMINI_MODELS ||
  'gemini-2.5-flash,gemini-2.5-flash-lite,gemini-2.0-flash'
)
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);

function withTimeout<T>(p: Promise<T>, ms = TIMEOUT_MS): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

export interface StructuredOptions<T> {
  system: string;
  prompt: string;
  schema: ZodType<T>;
  jsonSchema: Record<string, unknown>;
  schemaHint: string;
  maxTokens?: number;
  temperature?: number;
}

export async function generateStructured<T>(opts: StructuredOptions<T>): Promise<GenResult<T>> {
  const errors: string[] = [];

  for (const model of GEMINI_MODELS) {
    try {
      const raw = await withTimeout(
        geminiStructured(model, {
          system: opts.system,
          prompt: opts.prompt,
          schemaHint: opts.schemaHint,
          maxTokens: opts.maxTokens,
          temperature: opts.temperature,
        }),
      );
      return { ok: true, data: opts.schema.parse(raw), provider: 'gemini', model, degraded: false };
    } catch (e) {
      errors.push(`${model}: ${(e as Error).message}`);
    }
  }

  if (BEDROCK_ENABLED) {
    try {
      const raw = await withTimeout(
        bedrockStructured({
          system: opts.system,
          prompt: opts.prompt,
          jsonSchema: opts.jsonSchema,
          maxTokens: opts.maxTokens,
          temperature: opts.temperature,
        }),
      );
      return {
        ok: true,
        data: opts.schema.parse(raw),
        provider: 'bedrock',
        model: process.env.BEDROCK_MODEL_ID || 'bedrock',
        degraded: false,
      };
    } catch (e) {
      errors.push(`bedrock: ${(e as Error).message}`);
    }
  }

  return { ok: false, data: null, provider: 'none', model: null, degraded: true, error: errors.join(' | ') };
}

export interface TextOptions {
  system: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

export type TextResult =
  | { ok: true; text: string; provider: Provider; model: string; degraded: false }
  | { ok: false; text: null; provider: 'none'; model: null; degraded: true; error: string };

export async function generateText(opts: TextOptions): Promise<TextResult> {
  const errors: string[] = [];

  for (const model of GEMINI_MODELS) {
    try {
      const text = await withTimeout(geminiText(model, opts));
      return { ok: true, text, provider: 'gemini', model, degraded: false };
    } catch (e) {
      errors.push(`${model}: ${(e as Error).message}`);
    }
  }

  if (BEDROCK_ENABLED) {
    try {
      const text = await withTimeout(bedrockText(opts));
      return {
        ok: true,
        text,
        provider: 'bedrock',
        model: process.env.BEDROCK_MODEL_ID || 'bedrock',
        degraded: false,
      };
    } catch (e) {
      errors.push(`bedrock: ${(e as Error).message}`);
    }
  }

  return { ok: false, text: null, provider: 'none', model: null, degraded: true, error: errors.join(' | ') };
}
