/**
 * The single structured contract for journal analysis.
 *
 * One LLM call returns ALL of: detected mood, the entities the student named
 * (the raw material for the Stress Fingerprint), detected stress triggers, a
 * crisis assessment, the id of a grounded coping technique to recommend, an
 * optional evidence-style reframe, and a warm supportive message.
 *
 * The same zod schema validates the output of BOTH providers, so anything
 * off-contract is rejected rather than shown to a vulnerable user. The trigger
 * and entity categories are fixed enums — the model classifies into our
 * taxonomy instead of inventing labels.
 */
import { z } from 'zod';

export const ENTITY_CATEGORIES = [
  'subject', // e.g. organic chemistry, calculus
  'person', // parents, friends, rivals, teachers
  'event', // mock test, result day, exam
  'time', // late night, early morning
  'habit', // scrolling, skipping meals
  'sleep', // sleep quantity/quality
  'place', // coaching, hostel, home
  'other',
] as const;

export const TRIGGER_TAXONOMY = [
  'academic_pressure',
  'peer_comparison',
  'parental_expectation',
  'time_management',
  'test_anxiety',
  'self_doubt',
  'sleep_deprivation',
  'social_isolation',
  'physical_health',
  'future_uncertainty',
  'financial_stress',
  'other',
] as const;

export const CRISIS_SEVERITY = ['none', 'low', 'medium', 'high'] as const;

export const analysisSchema = z.object({
  detectedMood: z
    .number()
    .min(1)
    .max(10)
    .describe('Mood inferred from the text, 1 (very low) to 10 (great).'),
  emotions: z.array(z.string()).max(6),
  entities: z
    .array(
      z.object({
        text: z.string(),
        category: z.enum(ENTITY_CATEGORIES),
      }),
    )
    .max(10),
  triggers: z.array(z.enum(TRIGGER_TAXONOMY)).max(5),
  themes: z.array(z.string()).max(5),
  crisis: z.object({
    flagged: z.boolean(),
    severity: z.enum(CRISIS_SEVERITY),
    rationale: z.string(),
  }),
  copingTechniqueId: z
    .string()
    .describe('MUST be one of the technique ids provided in the prompt.'),
  reframe: z
    .string()
    .describe('Optional gentle reframe grounded in what the student wrote.'),
  supportiveMessage: z
    .string()
    .describe('Warm, human, non-clinical response. 2-4 sentences.'),
});

export type Analysis = z.infer<typeof analysisSchema>;

/** JSON Schema for Bedrock tool-use (constrains Claude's output). */
export const analysisJsonSchema: Record<string, unknown> = {
  type: 'object',
  properties: {
    detectedMood: { type: 'integer', minimum: 1, maximum: 10 },
    emotions: { type: 'array', items: { type: 'string' }, maxItems: 6 },
    entities: {
      type: 'array',
      maxItems: 10,
      items: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          category: { type: 'string', enum: [...ENTITY_CATEGORIES] },
        },
        required: ['text', 'category'],
      },
    },
    triggers: {
      type: 'array',
      maxItems: 5,
      items: { type: 'string', enum: [...TRIGGER_TAXONOMY] },
    },
    themes: { type: 'array', items: { type: 'string' }, maxItems: 5 },
    crisis: {
      type: 'object',
      properties: {
        flagged: { type: 'boolean' },
        severity: { type: 'string', enum: [...CRISIS_SEVERITY] },
        rationale: { type: 'string' },
      },
      required: ['flagged', 'severity', 'rationale'],
    },
    copingTechniqueId: { type: 'string' },
    reframe: { type: 'string' },
    supportiveMessage: { type: 'string' },
  },
  required: [
    'detectedMood',
    'emotions',
    'entities',
    'triggers',
    'themes',
    'crisis',
    'copingTechniqueId',
    'reframe',
    'supportiveMessage',
  ],
};

/** Human-readable shape injected into the Gemini prompt. */
export const analysisSchemaHint = `{
  "detectedMood": number (1-10),
  "emotions": string[] (max 6),
  "entities": [{ "text": string, "category": one of ${JSON.stringify(ENTITY_CATEGORIES)} }],
  "triggers": (subset of ${JSON.stringify(TRIGGER_TAXONOMY)}),
  "themes": string[] (max 5),
  "crisis": { "flagged": boolean, "severity": one of ${JSON.stringify(CRISIS_SEVERITY)}, "rationale": string },
  "copingTechniqueId": string (one of the technique ids listed in the prompt),
  "reframe": string,
  "supportiveMessage": string
}`;
