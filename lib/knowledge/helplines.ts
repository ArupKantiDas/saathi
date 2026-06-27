/**
 * Verified Indian mental-health helplines.
 *
 * These are REAL, government and established not-for-profit lines, verified
 * against official sources on 2026-06-27. They are shown verbatim whenever the
 * crisis path triggers — Saathi never improvises a number or paraphrases a
 * service. Do not edit a number without re-checking its official source.
 */
export interface Helpline {
  name: string;
  number: string;
  detail: string;
  hours: string;
  source: string;
}

export const HELPLINES: Helpline[] = [
  {
    name: 'Tele-MANAS (Govt. of India)',
    number: '14416',
    detail:
      'National mental health helpline by the Ministry of Health & Family Welfare. Also reachable at 1-800-891-4416.',
    hours: '24x7',
    source: 'https://telemanas.mohfw.gov.in/',
  },
  {
    name: 'KIRAN (Govt. of India)',
    number: '1800-599-0019',
    detail:
      'Mental health rehabilitation helpline (DEPwD), support in 13 languages.',
    hours: '24x7',
    source: 'https://pib.gov.in/PressReleasePage.aspx?PRID=1651963',
  },
  {
    name: 'iCALL (TISS)',
    number: '9152987821',
    detail:
      'Free psychosocial counselling by trained professionals, Tata Institute of Social Sciences.',
    hours: 'Mon-Sat, 8am-10pm',
    source: 'https://icallhelpline.org/',
  },
  {
    name: 'Vandrevala Foundation',
    number: '1860-2662-345',
    detail: 'Free 24x7 mental health support and crisis intervention.',
    hours: '24x7',
    source: 'https://www.vandrevalafoundation.com/',
  },
  {
    name: 'Emergency Services',
    number: '112',
    detail: 'National emergency number for immediate, life-threatening danger.',
    hours: '24x7',
    source: 'https://112.gov.in/',
  },
];
