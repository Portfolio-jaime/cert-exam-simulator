import { EXAMS } from '../src/exams';
import type { Question } from '../src/types';

export const SAA = EXAMS[0];
export const CCAF = EXAMS[1];
const DOMAINS = SAA.domains.map((d) => d.id);

export function makeBank(perDomain = 30): Question[] {
  const out: Question[] = [];
  for (const d of DOMAINS) {
    for (let i = 0; i < perDomain; i++) {
      const multi = i % 4 === 0;
      out.push({
        id: `${d}-${i}`,
        domain: d,
        topic: 't',
        type: multi ? 'multi' : 'single',
        choose: multi ? 2 : 1,
        stem: 's',
        options: ['A', 'B', 'C', 'D', 'E'].map((x) => ({ id: x, text: x })),
        answer: multi ? ['A', 'C'] : ['B'],
        explanation: 'e',
        distractors: {},
        difficulty: 1,
      });
    }
  }
  return out;
}

/** Scenario-based bank for the Claude exam: `perScenario` questions in each of its 6 scenarios. */
export function makeScenarioBank(perScenario = 15): Question[] {
  const out: Question[] = [];
  const domains = CCAF.domains.map((d) => d.id);
  for (const sc of CCAF.scenarios ?? []) {
    for (let i = 0; i < perScenario; i++) {
      out.push({
        id: `${sc.id}-${i}`, domain: domains[i % domains.length], topic: 't', scenario: sc.id, type: 'single', choose: 1, stem: 's',
        options: ['A', 'B', 'C', 'D'].map((x) => ({ id: x, text: x })), answer: ['B'], explanation: 'e', distractors: {}, difficulty: 1,
      });
    }
  }
  return out;
}
