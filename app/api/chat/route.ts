/**
 * POST /api/chat — the conversational companion.
 *
 * verify token -> rate-limit -> validate -> deterministic crisis screen on the
 * latest user message (fail-safe, runs even if the LLM is down) -> LLM reply
 * with recent-journal context. If the screen flags crisis we still return a
 * grounded supportive reply AND the verified helplines.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/verify';
import { rateLimit } from '@/lib/security/ratelimit';
import { generateText } from '@/lib/ai/generate';
import { chatSystem } from '@/lib/ai/prompts';
import { keywordCrisis } from '@/lib/safety/crisis';
import { HELPLINES } from '@/lib/knowledge/helplines';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  exam: z.string().max(20).default('OTHER'),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(2000),
      }),
    )
    .min(1)
    .max(20),
  recentContext: z.string().max(2000).optional(),
});

function transcript(messages: { role: string; content: string }[]): string {
  return messages
    .map((m) => `${m.role === 'user' ? 'Student' : 'Saathi'}: ${m.content}`)
    .join('\n');
}

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const rl = rateLimit(`chat:${user.uid}`);
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

  const lastUser = [...body.messages].reverse().find((m) => m.role === 'user');
  const crisisFlagged = lastUser ? keywordCrisis(lastUser.content) : false;

  const result = await generateText({
    system: chatSystem(body.exam, body.recentContext),
    prompt: `${transcript(body.messages)}\nSaathi:`,
    maxTokens: 600,
  });

  if (!result.ok) {
    return NextResponse.json({
      provider: 'none',
      degraded: true,
      reply:
        "I'm having trouble connecting right now, so I don't want to give you a half-formed reply. Give it another try in a moment. If things feel urgent, the helplines below are there for you any time.",
      crisis: crisisFlagged,
      helplines: crisisFlagged ? HELPLINES : undefined,
    });
  }

  return NextResponse.json({
    provider: result.provider,
    degraded: false,
    reply: result.text,
    crisis: crisisFlagged,
    helplines: crisisFlagged ? HELPLINES : undefined,
  });
}
