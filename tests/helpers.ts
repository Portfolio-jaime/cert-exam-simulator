import { DOMAINS, type Domain, type Question } from '../src/types';

export function makeBank(perDomain = 30): Question[] {
  const out: Question[] = [];
  for (const d of DOMAINS) {
    for (let i = 0; i < perDomain; i++) {
      const multi = i % 4 === 0;
      out.push({
        id: `${d}-${i}`,
        domain: d as Domain,
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
