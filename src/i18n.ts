import type { ExamDef, ScenarioDef } from './exams';
import type { Question, QuestionText } from './types';

export type Lang = 'es' | 'en';

export interface View {
  stem: string;
  options: { id: string; text: string }[];
  explanation: string;
  distractors: Record<string, string>;
  topic: string;
}

/** Inline translation helper: `tr(lang, 'Empezar', 'Start')`. */
export const tr = (lang: Lang, es: string, en: string): string => (lang === 'en' ? en : es);

/** Question text in the requested language, falling back to Spanish when no translation exists. */
export function view(q: Question, lang: Lang): View {
  const e: QuestionText | undefined = lang === 'en' ? q.en : undefined;
  return {
    stem: e?.stem ?? q.stem,
    options: q.options.map((o) => ({ id: o.id, text: e?.options?.[o.id] ?? o.text })),
    explanation: e?.explanation ?? q.explanation,
    distractors: e?.distractors ?? q.distractors,
    topic: e?.topic ?? q.topic,
  };
}

export function scenarioView(exam: ExamDef, id: string | undefined, lang: Lang): { title: string; text: string } | null {
  const s: ScenarioDef | undefined = exam.scenarios?.find((x) => x.id === id);
  if (!s) return null;
  return lang === 'en' ? s.en : { title: s.title, text: s.text };
}
