export type ExamId = 'saa' | 'ccaf';

/** Domain ids are defined per exam in exams.ts. */
export type Domain = string;

export interface Option {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  domain: Domain;
  topic: string;
  /** Scenario id (exams with scenario-based questions). */
  scenario?: string;
  type: 'single' | 'multi';
  choose: number;
  stem: string;
  options: Option[];
  answer: string[];
  explanation: string;
  distractors: Record<string, string>;
  difficulty: 1 | 2 | 3;
  /** Optional English version of the text (exams offered in both languages). */
  en?: QuestionText;
}

export interface QuestionText {
  stem: string;
  options: Record<string, string>;
  explanation: string;
  distractors: Record<string, string>;
  topic?: string;
}

export interface ExamItem {
  id: string;
  scored: boolean;
}

export type Mode = 'block' | 'full' | 'domain' | 'review';

export const MODE_LABEL: Record<Mode, string> = {
  block: 'Bloque',
  full: 'Simulacro completo',
  domain: 'Práctica por dominio',
  review: 'Repaso de falladas',
};

export interface DomainResult {
  correct: number;
  total: number;
  pct: number;
}

export interface Result {
  correct: number;
  total: number;
  pct: number;
  scaled: number;
  passed: boolean;
  byDomain: Record<Domain, DomainResult>;
  unanswered: number;
}

export interface Attempt {
  id: string;
  exam?: ExamId;
  mode: Mode;
  startedAt: number;
  finishedAt: number;
  durationSec: number;
  limitSec: number;
  autoSubmitted: boolean;
  items: ExamItem[];
  answers: Record<string, string[]>;
  flags: string[];
  result: Result;
}
