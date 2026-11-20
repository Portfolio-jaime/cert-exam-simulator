import { describe, expect, it } from 'vitest';
import { allocate, buildExam } from '../src/exam/sampler';
import { makeBank } from './helpers';

describe('sampler', () => {
  const bank = makeBank(40);
  const byId = new Map(bank.map((q) => [q.id, q]));

  it('allocates 65 questions following the weights', () => {
    const a = allocate(65);
    expect(a.secure + a.resilient + a.performance + a.cost).toBe(65);
    expect(a.secure).toBe(19);
    expect(a.resilient).toBe(17);
    expect(a.performance).toBe(16);
    expect(a.cost).toBe(13);
  });

  it('allocates 22 questions without losing any', () => {
    const a = allocate(22);
    expect(a.secure + a.resilient + a.performance + a.cost).toBe(22);
  });

  it('has no duplicates and is deterministic per seed', () => {
    const x = buildExam({ bank, size: 65, seed: 7, unscored: 15 });
    const y = buildExam({ bank, size: 65, seed: 7, unscored: 15 });
    expect(x).toEqual(y);
    expect(new Set(x.map((i) => i.id)).size).toBe(65);
    expect(x.filter((i) => !i.scored).length).toBe(15);
  });

  it('prefers failed, then unseen, over already-correct questions', () => {
    const failed = new Set(['secure-1', 'secure-2']);
    const seen = new Set(bank.filter((q) => q.domain === 'secure' && q.id !== 'secure-1' && q.id !== 'secure-2').slice(0, 30).map((q) => q.id));
    const items = buildExam({ bank, size: 22, seed: 3, seen, failed });
    const ids = new Set(items.map((i) => i.id));
    expect(ids.has('secure-1')).toBe(true);
    expect(ids.has('secure-2')).toBe(true);
    const secure = items.filter((i) => byId.get(i.id)!.domain === 'secure');
    expect(secure.every((i) => failed.has(i.id) || !seen.has(i.id))).toBe(true);
  });

  it('fills from other domains when one runs short', () => {
    const small = bank.filter((q) => q.domain !== 'cost' || Number(q.id.split('-')[1]) < 2);
    const items = buildExam({ bank: small, size: 65, seed: 1 });
    expect(items.length).toBe(65);
  });

  it('domain mode only returns that domain', () => {
    const items = buildExam({ bank, size: 22, seed: 1, domain: 'cost' });
    expect(items.every((i) => byId.get(i.id)!.domain === 'cost')).toBe(true);
  });
});
