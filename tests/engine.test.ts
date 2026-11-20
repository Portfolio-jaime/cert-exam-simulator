import { describe, expect, it } from 'vitest';
import { ExamSession } from '../src/exam/engine';
import { buildExam } from '../src/exam/sampler';
import { makeBank, SAA } from './helpers';

const bank = makeBank(10);
const map = new Map(bank.map((q) => [q.id, q]));

function session() {
  const items = buildExam({ bank, exam: SAA, size: 22, seed: 5 });
  return ExamSession.create(SAA, 'block', items, map, 1_000_000);
}

describe('ExamSession', () => {
  it('multi-select caps at `choose` and toggles off', () => {
    const s = session();
    const i = s.state.items.findIndex((it) => map.get(it.id)!.type === 'multi');
    s.select('A', i);
    s.select('B', i);
    s.select('C', i); // ignored, already 2
    expect(s.state.answers[s.question(i).id]).toEqual(['A', 'B']);
    s.select('A', i);
    expect(s.state.answers[s.question(i).id]).toEqual(['B']);
    expect(s.isAnswered(i)).toBe(true);
    expect(s.isComplete(i)).toBe(false);
  });

  it('single select replaces', () => {
    const s = session();
    const i = s.state.items.findIndex((it) => map.get(it.id)!.type === 'single');
    s.select('A', i);
    s.select('B', i);
    expect(s.state.answers[s.question(i).id]).toEqual(['B']);
  });

  it('flags toggle', () => {
    const s = session();
    s.toggleFlag(0);
    expect(s.state.flags).toHaveLength(1);
    s.toggleFlag(0);
    expect(s.state.flags).toHaveLength(0);
  });

  it('timer expires and the attempt is capped at the limit', () => {
    const s = session();
    const t0 = s.state.startedAt;
    expect(s.remainingSec(t0 + 60_000)).toBe(s.state.limitSec - 60);
    expect(s.isExpired(t0 + s.state.limitSec * 1000)).toBe(true);
    const a = s.finish(t0 + s.state.limitSec * 1000 + 99_000, true);
    expect(a.durationSec).toBe(s.state.limitSec);
    expect(a.autoSubmitted).toBe(true);
  });

  it('full mode keeps 130 minutes', () => {
    const items = buildExam({ bank: makeBank(30), exam: SAA, size: 65, seed: 2, unscored: 15 });
    const s = ExamSession.create(SAA, 'full', items, new Map(makeBank(30).map((q) => [q.id, q])), 0);
    expect(s.state.limitSec).toBe(130 * 60);
  });
});
