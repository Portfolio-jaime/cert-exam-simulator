import type { ExamDef } from '../exams';
import type { Attempt, DomainResult, ExamItem, Question, Result } from '../types';

/** Multi-select is all-or-nothing, like the real exam: the selected set must equal the answer set. */
export function isCorrect(q: Question, selected: string[] | undefined): boolean {
  if (!selected || selected.length !== q.answer.length) return false;
  const a = new Set(q.answer);
  return selected.every((s) => a.has(s)) && new Set(selected).size === a.size;
}

/** Estimated scaled score (100-1000). Neither exam publishes its formula, so this is only an estimate. */
export function scaledScore(correct: number, total: number): number {
  if (total === 0) return 100;
  return Math.round(100 + (900 * correct) / total);
}

export function scoreAttempt(
  items: ExamItem[],
  bank: Map<string, Question>,
  answers: Record<string, string[]>,
  exam: ExamDef,
): Result {
  const by: Record<string, { correct: number; total: number }> = {};
  for (const d of exam.domains) by[d.id] = { correct: 0, total: 0 };
  let correct = 0;
  let total = 0;
  let unanswered = 0;

  for (const item of items) {
    const q = bank.get(item.id);
    if (!q) continue;
    if (!answers[item.id] || answers[item.id].length === 0) unanswered++;
    if (!item.scored) continue;
    total++;
    const slot = (by[q.domain] ??= { correct: 0, total: 0 });
    slot.total++;
    if (isCorrect(q, answers[item.id])) {
      correct++;
      slot.correct++;
    }
  }

  const byDomain: Record<string, DomainResult> = {};
  for (const [id, { correct: c, total: t }] of Object.entries(by)) {
    byDomain[id] = { correct: c, total: t, pct: t === 0 ? 0 : Math.round((c / t) * 100) };
  }
  const scaled = scaledScore(correct, total);
  return {
    correct,
    total,
    pct: total === 0 ? 0 : Math.round((correct / total) * 100),
    scaled,
    passed: scaled >= exam.passScaled,
    byDomain,
    unanswered,
  };
}

/** The certificate is only issued for a passing full simulation. */
export function certificateEligible(a: Attempt): boolean {
  return a.mode === 'full' && a.result.passed;
}
