import { describe, it, expect } from 'vitest';
import { buildFingerprint, type EntryLike } from '@/lib/patterns/aggregate';

function entry(
  createdAt: number,
  mood: number,
  triggers: string[],
  entities: { text: string; category: string }[] = [],
): EntryLike {
  return {
    createdAt,
    mood,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    analysis: { detectedMood: mood, triggers, entities } as any,
  };
}

describe('buildFingerprint', () => {
  it('asks for more data below the minimum', () => {
    const fp = buildFingerprint([entry(1, 5, ['self_doubt'])]);
    expect(fp.needsMoreData).toBe(true);
    expect(fp.topStressors).toHaveLength(0);
  });

  it('surfaces the trigger tied to lower moods as a top stressor', () => {
    const entries = [
      entry(1, 8, ['time_management']),
      entry(2, 3, ['peer_comparison'], [{ text: 'mock test', category: 'event' }]),
      entry(3, 7, ['time_management']),
      entry(4, 2, ['peer_comparison'], [{ text: 'mock test', category: 'event' }]),
      entry(5, 8, ['time_management']),
    ];
    const fp = buildFingerprint(entries);
    expect(fp.needsMoreData).toBe(false);
    const top = fp.topStressors[0];
    expect(top.key).toBe('peer_comparison');
    expect(top.avgMood).toBeLessThan(fp.overallAvgMood); // genuinely a low-mood driver
    // the repeated low-mood entity should also be picked up
    expect(fp.topStressors.some((s) => s.label === 'mock test')).toBe(true);
  });

  it('detects a declining mood trend', () => {
    const entries = [
      entry(1, 9, ['self_doubt']),
      entry(2, 7, ['self_doubt']),
      entry(3, 5, ['self_doubt']),
      entry(4, 3, ['self_doubt']),
    ];
    expect(buildFingerprint(entries).moodTrend).toBe('declining');
  });
});
