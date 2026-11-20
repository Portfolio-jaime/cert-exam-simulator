import { DOMAINS, PASS_SCALED, type Attempt, type DomainResult, type ExamItem, type Question, type Result, type Domain } from '../types';

/** Multi-select is all-or-nothing, like the real exam: the selected set must equal the answer set. */
export function isCorrect(q: Question, selected: string[] | undefined): boolean {
  if (!selected || selected.length !== q.answer.length) return false;
  const a = new Set(q.answer);
  return selected.every((s) => a.has(s)) && new Set(selected).size === a.size;
}

/** Estimated scaled score (100-1000). AWS does not publish its formula, so this is only an estimate. */
export function scaledScore(correct: number, total: number): number {
  if (total === 0) return 100;
  return Math.round(100 + (900 * correct) / total);
}

export function scoreAttempt(
  items: ExamItem[],
  bank: Map<string, Question>,
  answers: Record<string, string[]>,
): Result {
  const by: Record<Domain, { correct: number; total: number }> = {
    secure: { correct: 0, total: 0 },
    resilient: { correct: 0, total: 0 },
    performance: { correct: 0, total: 0 },
    cost: { correct: 0, total: 0 },
  };
  let correct = 0;
  let total = 0;
  let unanswered = 0;

  for (const item of items) {
    const q = bank.get(item.id);
    if (!q) continue;
    if (!answers[item.id] || answers[item.id].length === 0) unanswered++;
    if (!item.scored) continue;
    total++;
    by[q.domain].total++;
    if (isCorrect(q, answers[item.id])) {
      correct++;
      by[q.domain].correct++;
    }
  }

  const byDomain = {} as Record<Domain, DomainResult>;
  for (const d of DOMAINS) {
    const { correct: c, total: t } = by[d];
    byDomain[d] = { correct: c, total: t, pct: t === 0 ? 0 : Math.round((c / t) * 100) };
  }
  const scaled = scaledScore(correct, total);
  return {
    correct,
    total,
    pct: total === 0 ? 0 : Math.round((correct / total) * 100),
    scaled,
    passed: scaled >= PASS_SCALED,
    byDomain,
    unanswered,
  };
}

/** The certificate is only issued for a passing full simulation. */
export function certificateEligible(a: Attempt): boolean {
  return a.mode === 'full' && a.result.passed;
}
