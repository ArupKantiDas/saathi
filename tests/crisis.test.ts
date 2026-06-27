import { describe, it, expect } from 'vitest';
import { keywordCrisis, assessCrisis } from '@/lib/safety/crisis';

describe('keywordCrisis (deterministic floor)', () => {
  it('flags explicit self-harm language', () => {
    expect(keywordCrisis('I want to kill myself')).toBe(true);
    expect(keywordCrisis('honestly I want to die')).toBe(true);
    expect(keywordCrisis('thinking about self-harm again')).toBe(true);
    expect(keywordCrisis('I feel suicidal')).toBe(true);
    expect(keywordCrisis('everyone would be better off if I ended my life')).toBe(true);
  });

  it('does NOT flag ordinary exam stress (guards false positives)', () => {
    expect(keywordCrisis('This physics paper is killing me lol')).toBe(false);
    expect(keywordCrisis('I am so stressed about NEET')).toBe(false);
    expect(keywordCrisis('I bombed the mock test and feel low')).toBe(false);
    expect(keywordCrisis('dead tired after studying all night')).toBe(false);
  });
});

describe('assessCrisis (OR of keyword + model, fail-safe)', () => {
  it('triggers when only the keyword screen fires, even if model says none', () => {
    const v = assessCrisis('I want to end my life', false, 'none');
    expect(v.flagged).toBe(true);
    expect(v.severity).toBe('high');
    expect(v.source).toBe('keyword');
  });

  it('triggers when only the model flags it', () => {
    const v = assessCrisis('everything feels pointless lately', true, 'medium');
    expect(v.flagged).toBe(true);
    expect(v.source).toBe('model');
    expect(v.severity).toBe('medium');
  });

  it('takes the MAX severity when both fire', () => {
    const v = assessCrisis('I want to die', true, 'low');
    expect(v.flagged).toBe(true);
    expect(v.severity).toBe('high');
    expect(v.source).toBe('both');
  });

  it('stays calm for a benign-but-sad entry (no false positive)', () => {
    const v = assessCrisis('I feel discouraged and tired', false, 'none');
    expect(v.flagged).toBe(false);
    expect(v.severity).toBe('none');
  });
});
