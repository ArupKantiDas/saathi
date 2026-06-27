/**
 * Google Gemini provider — FALLBACK LLM.
 *
 * Uses the Generative Language API (AI Studio) via a simple API key — free
 * tier, no billing, no service-account key, so it runs anywhere including
 * Vercel. Structured output uses responseMimeType: application/json with the
 * schema described in the system instruction; the result is still validated by
 * the same zod schema as Bedrock, so both providers are held to one contract.
 *
 * thinkingBudget is set to 0 — gemini-2.5-flash otherwise spends its output
 * budget on hidden "thinking" tokens, which adds latency and can starve the
 * actual JSON response.
 */
const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

function endpoint(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('gemini: GEMINI_API_KEY not set');
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
}

interface GeminiBody {
  systemInstruction: { parts: { text: string }[] };
  contents: { role: string; parts: { text: string }[] }[];
  generationConfig: Record<string, unknown>;
}

async function call(body: GeminiBody): Promise<string> {
  const res = await fetch(endpoint(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      `gemini: HTTP ${res.status} ${JSON.stringify(data).slice(0, 200)}`,
    );
  }
  const text: string | undefined =
    data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error(
      `gemini: no text in response ${JSON.stringify(data).slice(0, 200)}`,
    );
  }
  return text;
}

export async function geminiStructured(args: {
  system: string;
  prompt: string;
  schemaHint: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<unknown> {
  const text = await call({
    systemInstruction: {
      parts: [
        {
          text: `${args.system}\n\nReturn ONLY a valid JSON object, no markdown, matching exactly this shape:\n${args.schemaHint}`,
        },
      ],
    },
    contents: [{ role: 'user', parts: [{ text: args.prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: args.temperature ?? 0.3,
      maxOutputTokens: args.maxTokens ?? 1024,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });
  return JSON.parse(text);
}

export async function geminiText(args: {
  system: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const text = await call({
    systemInstruction: { parts: [{ text: args.system }] },
    contents: [{ role: 'user', parts: [{ text: args.prompt }] }],
    generationConfig: {
      temperature: args.temperature ?? 0.6,
      maxOutputTokens: args.maxTokens ?? 700,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });
  return text.trim();
}
