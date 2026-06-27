# Saathi — a wellbeing companion for exam aspirants

Saathi (Hindi for *companion*) is a GenAI wellbeing app for students preparing for high-stakes Indian exams — NEET, JEE, CUET, CAT, GATE, UPSC. It reads open-ended journals and mood logs, finds the *specific* things that drain a student (not just "you seem stressed"), and offers grounded, personalized support — while staying genuinely safe when someone is in crisis.

**Vertical / persona:** competitive-exam aspirant (multi-exam — the student picks their exam at onboarding and the companion's tone and stress logic adapt to it).

---

## What makes it different

A generic version of this is a chatbot plus a mood slider. Saathi's wedge — all built on one structured pipeline:

- **Stress Fingerprint.** We extract the entities a student names in their own words (subjects, people, events, times, sleep) and correlate each against their mood over time. The result is specific: *"your dips line up with peer comparison after mock tests, late at night"* — not a vague label. The correlation is computed in code from real entries, so it can't be hallucinated.
- **Adaptive, grounded coping.** Coping techniques are *retrieved* from a curated, sourced library (box breathing, 5-4-3-2-1 grounding, cognitive reframing, and more). The model personalizes the framing; it never invents clinical advice.
- **Evidence-grounded reframe.** When a student catastrophizes, the companion answers with a gentle reframe tied to what they actually wrote.
- **Safety first.** A fail-safe crisis check surfaces real, verified government helplines instead of false reassurance.

---

## How it works, end to end

1. **Sign in** — anonymous Firebase auth (no signup wall); optionally create an email/password account, which links the anonymous session so existing journal entries carry over.
2. **Journal** — the student writes or speaks an entry and rates their mood.
3. **Analyze** (`POST /api/analyze`) — one structured LLM call returns: detected mood, named entities, stress triggers (from a fixed taxonomy), themes, a crisis assessment, a grounded coping technique, an optional reframe, and a warm message.
4. **Safety gate** — a deterministic keyword screen runs alongside the model's crisis assessment. If *either* fires, normal coaching is suppressed and verified helplines are shown.
5. **Store** — the entry and its analysis are saved per-user in Firestore (the student's own isolated space).
6. **Companion** (`POST /api/chat`) — a conversational layer that remembers recent themes.
7. **Stress Fingerprint** — once there are enough entries, Saathi correlates entities → mood and narrates the real patterns.

### Decision logic
`extract entities → correlate to mood (deterministic) → if crisis: escalate to helplines → else: surface the top trigger and the technique that fits, grounded in the curated library.`

---

## How we avoid hallucination, false positives, and mock results

This is treated as the highest-stakes requirement.

- **Structured output, validated.** The journal analysis is constrained to a fixed schema (Gemini JSON mode / Bedrock tool-use) and validated with the same zod schema regardless of which model answered. Off-contract output is rejected, not shown.
- **Grounded advice.** Coping techniques come from a curated library with cited sources; the model can only pick an existing technique id, and the server falls back to a deterministic pick if the id is unknown.
- **Fail-safe crisis detection.** A deterministic phrase screen is the floor; combined with the model via OR, severity via MAX. It errs toward showing help. Helpline numbers are verified against official sources and hardcoded — never generated.
- **No mock data.** When both LLMs fail, the app shows a clearly-labelled offline grounded technique — never a fabricated "AI" answer. The live provider is shown as a badge in the UI for transparency.

See [`docs/AI_ARCHITECTURE.md`](docs/AI_ARCHITECTURE.md) for the full AI design.

---

## Security & privacy

- **Auth on every API route.** Each request's Firebase ID token is verified server-side (keyless, against Google's public JWKS) before any LLM call — the endpoints are not open proxies.
- **Per-user data isolation.** Firestore security rules enforce `request.auth.uid == uid`; a user can only ever read/write their own entries.
- **Abuse protection.** Per-user rate limiting on the LLM routes.
- **Input validation.** All inputs validated with zod, with length caps.
- **Secrets stay server-side.** Provider keys are server env vars; only the (safe-to-expose) Firebase web config is public. `.env*` is git-ignored.

---

## Accessibility

Mobile-first and calm by design (a stressed student on a phone, not a reviewer on a laptop): single column, large tap targets, soft palette with red reserved only for the crisis path. Semantic HTML, ARIA labels, keyboard navigation, `aria-live` for AI responses, and `prefers-reduced-motion` support. Voice journaling and read-aloud replies (Web Speech API, feature-detected with full text fallback).

---

## Tech stack

Next.js (App Router) · TypeScript · Tailwind CSS · Firebase Auth (anonymous + email/password) + Firestore · Google Gemini (multi-model fallback chain: 2.5-flash → 2.5-flash-lite → flash-latest) · AWS Bedrock / Claude (optional cross-cloud fallback, env-gated) · zod · vitest.

---

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in your keys (see below)
npm run dev                  # http://localhost:3000
npm test                     # unit tests
```

You need: a Gemini API key, a Firebase project (Auth with Anonymous enabled + Firestore), and optionally AWS Bedrock credentials for the fallback. All variables are documented in [`.env.example`](.env.example).

---

## Assumptions

- A Claude Max / Gemini subscription does **not** include API access; this app uses a Gemini API key and (optionally) AWS Bedrock.
- The app runs billing-free on the Firebase side (Auth + Firestore free tier) and on the Gemini free tier; AWS Bedrock (fallback) is the only billed dependency and is optional.
- Journals are personal data; they are stored in the student's own Firestore space, and only the minimum text needed is sent to the model provider.

---

## Helpline sources

Tele-MANAS (14416) — Ministry of Health & Family Welfare, Govt. of India. KIRAN (1800-599-0019) — DEPwD, Govt. of India. iCALL (TISS), Vandrevala Foundation, and national emergency 112. Numbers verified against official sources; see [`lib/knowledge/helplines.ts`](lib/knowledge/helplines.ts).
