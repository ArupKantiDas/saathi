/**
 * Curated, evidence-based coping techniques — the ONLY techniques Saathi may
 * recommend. The LLM selects an id from this list and personalizes the framing;
 * it never invents a technique or clinical advice. Each entry cites a
 * reputable source so suggestions are grounded and auditable.
 */
export interface Technique {
  id: string;
  name: string;
  category: 'breathing' | 'grounding' | 'cognitive' | 'behavioral' | 'rest';
  durationMin: number;
  /** When this technique tends to help — used to match to detected triggers. */
  helpsWith: string[];
  oneLiner: string;
  steps: string[];
  source: string;
}

export const TECHNIQUES: Technique[] = [
  {
    id: 'box-breathing',
    name: 'Box Breathing',
    category: 'breathing',
    durationMin: 3,
    helpsWith: ['test_anxiety', 'academic_pressure', 'self_doubt'],
    oneLiner: 'Steady your nervous system with an even 4-4-4-4 breath.',
    steps: [
      'Breathe in through your nose for 4 counts.',
      'Hold gently for 4 counts.',
      'Breathe out slowly for 4 counts.',
      'Hold for 4 counts. Repeat 4 rounds.',
    ],
    source: 'https://www.healthline.com/health/box-breathing',
  },
  {
    id: '478-breathing',
    name: '4-7-8 Breathing',
    category: 'breathing',
    durationMin: 4,
    helpsWith: ['sleep_deprivation', 'test_anxiety', 'future_uncertainty'],
    oneLiner: 'A longer exhale that helps the body wind down, useful before sleep.',
    steps: [
      'Breathe in quietly through your nose for 4 counts.',
      'Hold your breath for 7 counts.',
      'Exhale fully through your mouth for 8 counts.',
      'Repeat for 4 cycles.',
    ],
    source: 'https://www.medicalnewstoday.com/articles/324417',
  },
  {
    id: '54321-grounding',
    name: '5-4-3-2-1 Grounding',
    category: 'grounding',
    durationMin: 4,
    helpsWith: ['test_anxiety', 'social_isolation', 'self_doubt'],
    oneLiner: 'Pull yourself out of a spiral by naming what your senses notice.',
    steps: [
      'Name 5 things you can see.',
      'Name 4 things you can feel.',
      'Name 3 things you can hear.',
      'Name 2 things you can smell.',
      'Name 1 thing you can taste.',
    ],
    source: 'https://www.urmc.rochester.edu/behavioral-health-partners/bhp-blog/april-2018/5-4-3-2-1-coping-technique-for-anxiety.aspx',
  },
  {
    id: 'cognitive-reframe',
    name: 'Thought Reframing',
    category: 'cognitive',
    durationMin: 6,
    helpsWith: ['self_doubt', 'peer_comparison', 'parental_expectation'],
    oneLiner: 'Catch a harsh thought and test it against the evidence.',
    steps: [
      'Write the exact worried thought ("I will definitely fail").',
      'List facts for and against it from your real experience.',
      'Write a fairer, more balanced version.',
      'Notice how the balanced thought feels in your body.',
    ],
    source: 'https://www.apa.org/topics/stress/tips',
  },
  {
    id: 'pomodoro',
    name: 'Pomodoro Focus',
    category: 'behavioral',
    durationMin: 25,
    helpsWith: ['time_management', 'academic_pressure', 'self_doubt'],
    oneLiner: 'Shrink an overwhelming task into one honest 25-minute block.',
    steps: [
      'Pick one small next step, not the whole syllabus.',
      'Set a timer for 25 minutes and work only on that.',
      'Take a real 5-minute break away from the screen.',
      'After 4 rounds, take a longer 20-minute break.',
    ],
    source: 'https://en.wikipedia.org/wiki/Pomodoro_Technique',
  },
  {
    id: 'pmr',
    name: 'Progressive Muscle Relaxation',
    category: 'rest',
    durationMin: 10,
    helpsWith: ['physical_health', 'sleep_deprivation', 'test_anxiety'],
    oneLiner: 'Release tension you did not realise your body was holding.',
    steps: [
      'Sit or lie comfortably and close your eyes.',
      'Tense one muscle group for 5 seconds, then release.',
      'Move from feet up to your face, group by group.',
      'Notice the warmth and looseness as you let go.',
    ],
    source: 'https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/breathing-exercises-for-stress/',
  },
  {
    id: 'self-compassion',
    name: 'Self-Compassion Break',
    category: 'cognitive',
    durationMin: 5,
    helpsWith: ['self_doubt', 'parental_expectation', 'peer_comparison'],
    oneLiner: 'Speak to yourself the way you would to a struggling friend.',
    steps: [
      'Acknowledge: "This is a hard moment."',
      'Remind yourself: "Struggle is part of preparing, not proof of failure."',
      'Place a hand on your chest and take a slow breath.',
      'Offer yourself one kind sentence you would tell a friend.',
    ],
    source: 'https://self-compassion.org/exercise-2-self-compassion-break/',
  },
  {
    id: 'worry-postpone',
    name: 'Worry Postponement',
    category: 'behavioral',
    durationMin: 5,
    helpsWith: ['future_uncertainty', 'test_anxiety', 'financial_stress'],
    oneLiner: 'Park spinning worries in a set "worry time" so you can study now.',
    steps: [
      'Write the worry down in one line.',
      'Tell yourself you will think about it at a set time (e.g. 7pm).',
      'Return your attention to the task in front of you.',
      'At worry time, review the list — many will have shrunk.',
    ],
    source: 'https://www.getselfhelp.co.uk/worry-time/',
  },
  {
    id: 'movement-reset',
    name: 'Movement Reset',
    category: 'behavioral',
    durationMin: 10,
    helpsWith: ['physical_health', 'social_isolation', 'academic_pressure'],
    oneLiner: 'A short walk or stretch to shift a stuck, heavy mood.',
    steps: [
      'Stand up and step away from your study spot.',
      'Walk, stretch, or move for 10 minutes.',
      'Let your eyes rest on something far away.',
      'Return and notice if your mind feels a little clearer.',
    ],
    source: 'https://www.who.int/news-room/fact-sheets/detail/physical-activity',
  },
  {
    id: 'sleep-winddown',
    name: 'Sleep Wind-Down',
    category: 'rest',
    durationMin: 20,
    helpsWith: ['sleep_deprivation', 'future_uncertainty', 'time_management'],
    oneLiner: 'A simple routine to protect the sleep your memory depends on.',
    steps: [
      'Stop studying and put screens away 30 minutes before bed.',
      'Dim the lights and do something calm (reading, slow breathing).',
      'Jot tomorrow\'s first task so your mind can let it go.',
      'Keep a consistent sleep and wake time, even near exams.',
    ],
    source: 'https://www.cdc.gov/sleep/about/index.html',
  },
];

export const TECHNIQUE_IDS = TECHNIQUES.map((t) => t.id);

export function getTechnique(id: string): Technique | undefined {
  return TECHNIQUES.find((t) => t.id === id);
}

/** Compact catalogue injected into the prompt so the model picks a real id. */
export function techniqueCatalogue(): string {
  return TECHNIQUES.map(
    (t) => `- ${t.id}: ${t.name} — ${t.oneLiner} (helps with: ${t.helpsWith.join(', ')})`,
  ).join('\n');
}

/** Deterministic fallback pick if the model returns an unknown id. */
export function fallbackTechnique(triggers: string[]): Technique {
  const match = TECHNIQUES.find((t) =>
    t.helpsWith.some((h) => triggers.includes(h)),
  );
  return match ?? TECHNIQUES[0];
}
