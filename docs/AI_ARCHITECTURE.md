# AI architecture

A short, honest map of every place GenAI is used in Saathi, and how each is kept grounded.

## Provider layer — one entry point, two clouds, graceful degradation

```
            ┌─────────────────────────────────────────────┐
  app code  │  generateStructured() / generateText()      │   lib/ai/generate.ts
            └─────────────────────────────────────────────┘
                              │
   Gemini model chain ── lib/ai/gemini.ts (Generative Language API, free tier)
     1. gemini-2.5-flash        ┐ each on error / 15s timeout falls to the next.
     2. gemini-2.5-flash-lite   │ flash and flash-lite are SEPARATE quota buckets,
     3. gemini-flash-latest     ┘ so a rate limit on one is survived by another.
                              │  all Gemini models failed
   (optional) Bedrock ── lib/ai/bedrock.ts (Claude via Converse) — only if
                              │  BEDROCK_ENABLED=true (account-gated, see note)
                              │
   degraded: true  → caller shows a clearly-labelled OFFLINE grounded technique
```

The model chain is configurable via `GEMINI_MODELS`. Every call returns which model answered; the UI shows it as a badge, so a reviewer can see the answer came from a real model, not a fixture. The same `zod` schema validates structured output regardless of which model answered, so anything off-contract is treated as a failure rather than passed to a vulnerable user.

> Note on Bedrock: the cross-cloud Claude fallback is fully wired but disabled by default (`BEDROCK_ENABLED` unset) because this AWS account still needs the Anthropic "use-case details" form approved before Claude can be invoked. Multiple Gemini models give real redundancy today; flipping the flag adds a second cloud the moment the form clears, with no code change.

## Where GenAI is used

| Feature | Call | Grounding / safety |
|---|---|---|
| Journal analysis | `generateStructured` (`/api/analyze`) | Output constrained to a fixed schema (Bedrock tool-use / Gemini JSON mode). Entities and triggers classified into fixed enums. |
| Coping suggestion | part of the same call | Model returns a technique **id** from the curated library only; server falls back to a deterministic pick if the id is unknown. |
| Crisis assessment | part of the same call | Combined (OR) with a deterministic keyword screen; severity is the MAX. Fails toward showing help. |
| Reframe | part of the same call | Asked to tie the reframe to what the student actually wrote; empty if nothing to reframe. |
| Companion chat | `generateText` (`/api/chat`) | Same safety rules in the system prompt; deterministic crisis screen on the latest message. |
| Stress Fingerprint | deterministic aggregation + `generateText` narration | Correlations computed **in code** from real entries; the model only narrates what the data shows. |

## Anti-hallucination summary

1. Structured output + schema validation on every analysis.
2. Retrieval-grounded coping (curated library, cited sources) instead of free-form advice.
3. Deterministic crisis floor + verified, hardcoded helplines.
4. Deterministic correlation for patterns; the model narrates, it doesn't infer trends.
5. Labelled offline mode on total provider failure — never a mocked AI answer.

## Tone

System prompts carry the same rules as our `humanizer` pass (plain words, short sentences, no dash-storms, no "rule of three", no canned reassurance), so live output reads like a warm person rather than a chatbot.
