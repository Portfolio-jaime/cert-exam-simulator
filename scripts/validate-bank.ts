// Validates data/questions/*.json. Run: npm run validate:bank
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EXAMS } from '../src/exams.ts';

const ROOT = join(import.meta.dirname, '..', 'data', 'questions');
const errors: string[] = [];
const ids = new Set<string>();
const stems = new Set<string>();
const perDomain: Record<string, number> = {};
let multi = 0;
let missingEn = 0;
let total = 0;
const answerPos: Record<string, number> = {};

const err = (id: string, msg: string) => errors.push(`${id}: ${msg}`);

for (const { exam, file } of EXAMS.flatMap((e) => readdirSync(join(ROOT, e.id)).filter((f) => f.endsWith('.json')).map((f) => ({ exam: e, file: `${e.id}/${f}` })))) {
  const DOMAINS = new Set(exam.domains.map((d) => d.id));
  const scenarios = new Set((exam.scenarios ?? []).map((x) => x.id));
  const list = JSON.parse(readFileSync(join(ROOT, file), 'utf8'));
  if (!Array.isArray(list)) { errors.push(`${file}: not an array`); continue; }
  for (const q of list) {
    total++;
    const id = String(q.id ?? `${file}#?`);
    if (ids.has(id)) err(id, 'duplicate id'); ids.add(id);
    if (stems.has(q.stem)) err(id, 'duplicate stem'); stems.add(q.stem);
    if (!DOMAINS.has(q.domain)) err(id, `bad domain ${q.domain}`);
    perDomain[q.domain] = (perDomain[q.domain] ?? 0) + 1;
    if (typeof q.stem !== 'string' || q.stem.length < 40) err(id, 'stem too short');
    if (!q.topic) err(id, 'missing topic');
    if (scenarios.size && !scenarios.has(q.scenario)) err(id, `bad scenario ${q.scenario}`);
    if (exam.bilingual && !q.en) missingEn++;
    if (q.en) {
      const keys = (o: object) => Object.keys(o).sort().join(',');
      if (!q.en.stem || !q.en.explanation) err(id, 'en: missing stem/explanation');
      if (keys(q.en.options ?? {}) !== [...(q.options ?? [])].map((o: { id: string }) => o.id).sort().join(',')) err(id, 'en: option ids differ');
      if (keys(q.en.distractors ?? {}) !== keys(q.distractors ?? {})) err(id, 'en: distractor keys differ');
    }
    if (!q.explanation || q.explanation.length < 30) err(id, 'explanation too short');
    if (![1, 2, 3].includes(q.difficulty)) err(id, 'bad difficulty');
    const optIds: string[] = (q.options ?? []).map((o: { id: string }) => o.id);
    if (new Set(optIds).size !== optIds.length) err(id, 'duplicate option ids');
    if (!Array.isArray(q.answer) || q.answer.length === 0) { err(id, 'missing answer'); continue; }
    for (const a of q.answer) if (!optIds.includes(a)) err(id, `answer ${a} not in options`);
    if (new Set(q.answer).size !== q.answer.length) err(id, 'duplicate answers');
    if (q.type === 'single') {
      if (q.choose !== 1 || q.answer.length !== 1) err(id, 'single must choose 1 with 1 answer');
      if (optIds.length !== 4) err(id, 'single needs 4 options');
    } else if (q.type === 'multi') {
      multi++;
      if (q.choose < 2 || q.choose > 3 || q.answer.length !== q.choose) err(id, 'multi: choose must equal answer count (2-3)');
      if (optIds.length < 5) err(id, 'multi needs >= 5 options');
    } else err(id, `bad type ${q.type}`);
    for (const o of q.options ?? []) {
      if (!o.text || o.text.length < 2) err(id, `option ${o.id} empty`);
      if (!q.answer.includes(o.id) && !q.distractors?.[o.id]) err(id, `missing distractor reason for ${o.id}`);
    }
    if (q.answer.length === 1) answerPos[q.answer[0]] = (answerPos[q.answer[0]] ?? 0) + 1;
  }
}

console.log(`questions: ${total} | multi: ${multi} (${total ? Math.round((multi / total) * 100) : 0}%)`);
console.log('per domain:', perDomain);
console.log('single-answer position spread:', answerPos);
if (missingEn) console.warn(`warning: ${missingEn} question(s) of bilingual exams have no English text yet`);
if (errors.length) {
  console.error(`\n${errors.length} problem(s):\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log('bank OK');
