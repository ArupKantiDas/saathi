import { describe, it, expect } from 'vitest';
import { rateLimit } from '@/lib/security/ratelimit';

describe('rateLimit (fixed window)', () => {
  it('allows up to the cap then blocks with a retry hint', () => {
    const key = `t:${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(key, 5).allowed).toBe(true);
    }
    const blocked = rateLimit(key, 5);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it('tracks remaining count correctly', () => {
    const key = `t:${Math.random()}`;
    expect(rateLimit(key, 3).remaining).toBe(2);
    expect(rateLimit(key, 3).remaining).toBe(1);
    expect(rateLimit(key, 3).remaining).toBe(0);
  });

  it('resets after the window elapses', () => {
    const key = `t:${Math.random()}`;
    expect(rateLimit(key, 1, 1).allowed).toBe(true); // 1ms window
    const wait = new Promise((r) => setTimeout(r, 5));
    return wait.then(() => {
      expect(rateLimit(key, 1, 1).allowed).toBe(true);
    });
  });

  it('isolates separate keys', () => {
    const a = `a:${Math.random()}`;
    const b = `b:${Math.random()}`;
    expect(rateLimit(a, 1).allowed).toBe(true);
    expect(rateLimit(a, 1).allowed).toBe(false);
    expect(rateLimit(b, 1).allowed).toBe(true); // independent bucket
  });
});
