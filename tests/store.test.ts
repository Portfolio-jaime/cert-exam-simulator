import { describe, expect, it } from 'vitest';
import { Store, type KV } from '../src/store';
import type { Attempt } from '../src/types';

function fakeKV(): KV {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
}

const attempt = (id: string, answers: Record<string, string[]>): Attempt => ({
  id, mode: 'block', startedAt: 0, finishedAt: 1, durationSec: 1, limitSec: 60, autoSubmitted: false,
  items: Object.keys(answers).map((k) => ({ id: k, scored: true })), answers, flags: [],
  result: { correct: 0, total: 0, pct: 0, scaled: 100, passed: false, unanswered: 0, byDomain: {} as never },
});

describe('Store', () => {
  it('persists and de-duplicates attempts', () => {
    const s = new Store(fakeKV());
    s.saveAttempt(attempt('a', { q1: ['A'] }));
    s.saveAttempt(attempt('a', { q1: ['B'] }));
    expect(s.history()).toHaveLength(1);
  });

  it('latest appearance decides failed/seen', () => {
    const s = new Store(fakeKV());
    s.saveAttempt(attempt('a', { q1: ['A'], q2: ['A'] }));
    s.saveAttempt(attempt('b', { q1: ['B'] }));
    const st = s.stats((a, id) => a.answers[id][0] === 'B');
    expect([...st.seen].sort()).toEqual(['q1', 'q2']);
    expect([...st.failed]).toEqual(['q2']);
  });

  it('works when storage throws', () => {
    const bad: KV = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); }, removeItem: () => { throw new Error('x'); } };
    const s = new Store(bad);
    s.setName('Ana');
    expect(s.name()).toBe('Ana');
    s.saveAttempt(attempt('a', { q1: ['A'] }));
    expect(s.history()).toHaveLength(1);
  });

  it('survives corrupt JSON', () => {
    const kv = fakeKV();
    kv.setItem('saa.history.v1', '{nope');
    expect(new Store(kv).history()).toEqual([]);
  });
});
