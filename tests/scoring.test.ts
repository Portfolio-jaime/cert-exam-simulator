import { describe, expect, it } from 'vitest';
import { isCorrect, scaledScore, scoreAttempt } from '../src/exam/scoring';
import { makeBank, SAA } from './helpers';

describe('scoring', () => {
  const bank = makeBank(8);
  const map = new Map(bank.map((q) => [q.id, q]));
  const multi = bank.find((q) => q.type === 'multi')!;
  const single = bank.find((q) => q.type === 'single')!;

  it('multi-select is all-or-nothing', () => {
    expect(isCorrect(multi, ['A', 'C'])).toBe(true);
    expect(isCorrect(multi, ['C', 'A'])).toBe(true);
    expect(isCorrect(multi, ['A'])).toBe(false);
    expect(isCorrect(multi, ['A', 'B'])).toBe(false);
    expect(isCorrect(multi, ['A', 'C', 'D'])).toBe(false);
    expect(isCorrect(multi, undefined)).toBe(false);
  });

  it('single answer', () => {
    expect(isCorrect(single, ['B'])).toBe(true);
    expect(isCorrect(single, ['A'])).toBe(false);
  });

  it('scaled score bounds and the 720 border', () => {
    expect(scaledScore(0, 50)).toBe(100);
    expect(scaledScore(50, 50)).toBe(1000);
    expect(scaledScore(0, 0)).toBe(100);
    expect(scaledScore(34, 50)).toBe(712); // 68 %
    expect(scaledScore(35, 50)).toBe(730); // 70 %
  });

  it('ignores unscored items and groups by domain', () => {
    const items = [
      { id: single.id, scored: true },
      { id: multi.id, scored: false },
    ];
    const r = scoreAttempt(items, map, { [single.id]: ['B'], [multi.id]: ['A'] }, SAA);
    expect(r.total).toBe(1);
    expect(r.correct).toBe(1);
    expect(r.scaled).toBe(1000);
    expect(r.passed).toBe(true);
    expect(r.byDomain[single.domain].total).toBe(1);
  });

  it('counts unanswered and fails below 720', () => {
    const items = bank.slice(0, 10).map((q) => ({ id: q.id, scored: true }));
    const r = scoreAttempt(items, map, {}, SAA);
    expect(r.unanswered).toBe(10);
    expect(r.passed).toBe(false);
    expect(r.scaled).toBe(100);
  });
});
