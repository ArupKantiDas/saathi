/**
 * Google Gemini provider (Generative Language API).
 *
 * Model-parameterized so the orchestrator can fall through several Gemini
 * models (e.g. 2.5-flash -> 2.5-flash-lite -> 2.0-flash) for genuine
 * redundancy against a single model's transient errors or rate limits.
 *
 * thinkingBudget:0 is only sent to 2.5 models (older models reject the field) —
 * it stops 2.5-flash from spending its output budget on hidden "thinking".
 */
function endpoint(model: string): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('gemini: GEMINI_API_KEY not set');
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
}

function genConfig(model: string, extra: Record<string, unknown>): Record<string, unknown> {
  const cfg: Record<string, unknown> = { ...extra };
  if (model.includes('2.5')) cfg.thinkingConfig = { thinkingBudget: 0 };
  return cfg;
}

interface GeminiBody {
  systemInstruction: { parts: { text: string }[] };
  contents: { role: string; parts: { text: string }[] }[];
  generationConfig: Record<string, unknown>;
}

async function call(model: string, body: GeminiBody): Promise<string> {
  const res = await fetch(endpoint(model), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`gemini(${model}): HTTP ${res.status} ${JSON.stringify(data).slice(0, 160)}`);
  }
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error(`gemini(${model}): no text ${JSON.stringify(data).slice(0, 160)}`);
  }
  return text;
}

export async function geminiStructured(
  model: string,
  args: { system: string; prompt: string; schemaHint: string; maxTokens?: number; temperature?: number },
): Promise<unknown> {
  const text = await call(model, {
    systemInstruction: {
      parts: [
        {
          text: `${args.system}\n\nReturn ONLY a valid JSON object, no markdown, matching exactly this shape:\n${args.schemaHint}`,
        },
      ],
    },
    contents: [{ role: 'user', parts: [{ text: args.prompt }] }],
    generationConfig: genConfig(model, {
      responseMimeType: 'application/json',
      temperature: args.temperature ?? 0.3,
      maxOutputTokens: args.maxTokens ?? 1024,
    }),
  });
  return JSON.parse(text);
}

export async function geminiText(
  model: string,
  args: { system: string; prompt: string; maxTokens?: number; temperature?: number },
): Promise<string> {
  const text = await call(model, {
    systemInstruction: { parts: [{ text: args.system }] },
    contents: [{ role: 'user', parts: [{ text: args.prompt }] }],
    generationConfig: genConfig(model, {
      temperature: args.temperature ?? 0.6,
      maxOutputTokens: args.maxTokens ?? 700,
    }),
  });
  return text.trim();
}
