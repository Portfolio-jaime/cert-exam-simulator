import { describe, expect, it } from 'vitest';
import { allocate, buildExam } from '../src/exam/sampler';
import { CCAF, makeBank, makeScenarioBank, SAA } from './helpers';

describe('sampler', () => {
  const bank = makeBank(40);
  const byId = new Map(bank.map((q) => [q.id, q]));

  it('allocates 65 questions following the weights', () => {
    const a = allocate(65, SAA.domains);
    expect(a.secure + a.resilient + a.performance + a.cost).toBe(65);
    expect(a.secure).toBe(19);
    expect(a.resilient).toBe(17);
    expect(a.performance).toBe(16);
    expect(a.cost).toBe(13);
  });

  it('allocates 22 questions without losing any', () => {
    const a = allocate(22, SAA.domains);
    expect(a.secure + a.resilient + a.performance + a.cost).toBe(22);
  });

  it('has no duplicates and is deterministic per seed', () => {
    const x = buildExam({ bank, exam: SAA, size: 65, seed: 7, unscored: 15 });
    const y = buildExam({ bank, exam: SAA, size: 65, seed: 7, unscored: 15 });
    expect(x).toEqual(y);
    expect(new Set(x.map((i) => i.id)).size).toBe(65);
    expect(x.filter((i) => !i.scored).length).toBe(15);
  });

  it('prefers failed, then unseen, over already-correct questions', () => {
    const failed = new Set(['secure-1', 'secure-2']);
    const seen = new Set(bank.filter((q) => q.domain === 'secure' && q.id !== 'secure-1' && q.id !== 'secure-2').slice(0, 30).map((q) => q.id));
    const items = buildExam({ bank, exam: SAA, size: 22, seed: 3, seen, failed });
    const ids = new Set(items.map((i) => i.id));
    expect(ids.has('secure-1')).toBe(true);
    expect(ids.has('secure-2')).toBe(true);
    const secure = items.filter((i) => byId.get(i.id)!.domain === 'secure');
    expect(secure.every((i) => failed.has(i.id) || !seen.has(i.id))).toBe(true);
  });

  it('fills from other domains when one runs short', () => {
    const small = bank.filter((q) => q.domain !== 'cost' || Number(q.id.split('-')[1]) < 2);
    const items = buildExam({ bank: small, exam: SAA, size: 65, seed: 1 });
    expect(items.length).toBe(65);
  });

  it('domain mode only returns that domain', () => {
    const items = buildExam({ bank, exam: SAA, size: 22, seed: 1, domain: 'cost' });
    expect(items.every((i) => byId.get(i.id)!.domain === 'cost')).toBe(true);
  });

  it('allocates the 5 Claude domains and still sums to the size', () => {
    const a = allocate(60, CCAF.domains);
    expect(Object.values(a).reduce((x, y) => x + y, 0)).toBe(60);
    expect(a.agentic).toBe(16);
  });

  it('scenario mode picks 4 distinct scenarios and groups their questions', () => {
    const sb = makeScenarioBank(15);
    const byId = new Map(sb.map((q) => [q.id, q]));
    const items = buildExam({ bank: sb, exam: CCAF, size: 60, seed: 11, byScenario: true });
    expect(items.length).toBe(60);
    const seq = items.map((i) => byId.get(i.id)!.scenario!);
    expect(new Set(seq).size).toBe(4);
    // grouped: a scenario never reappears after another one started
    const order = seq.filter((s, i) => i === 0 || s !== seq[i - 1]);
    expect(order.length).toBe(4);
    expect(new Set(items.map((i) => i.id)).size).toBe(60);
  });

  it('scenario mode copes with a small bank', () => {
    const sb = makeScenarioBank(3);
    const items = buildExam({ bank: sb, exam: CCAF, size: 60, seed: 4, byScenario: true });
    expect(items.length).toBe(12);
  });
});
