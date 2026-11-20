import type { ExamId, Question } from './types';

const files = import.meta.glob<Question[]>('../data/questions/*/*.json', { eager: true, import: 'default' });

const byExam: Record<string, Question[]> = {};
for (const [path, list] of Object.entries(files)) {
  const exam = path.split('/').slice(-2, -1)[0];
  (byExam[exam] ??= []).push(...list);
}

export const bankFor = (exam: ExamId): Question[] => byExam[exam] ?? [];
export const ALL_QUESTIONS: Question[] = Object.values(byExam).flat();
export const BANK_MAP = new Map(ALL_QUESTIONS.map((q) => [q.id, q]));
