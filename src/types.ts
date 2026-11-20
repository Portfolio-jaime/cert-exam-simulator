export type Domain = 'secure' | 'resilient' | 'performance' | 'cost';

export const DOMAINS: Domain[] = ['secure', 'resilient', 'performance', 'cost'];

export const DOMAIN_LABEL: Record<Domain, string> = {
  secure: 'Design Secure Architectures',
  resilient: 'Design Resilient Architectures',
  performance: 'Design High-Performing Architectures',
  cost: 'Design Cost-Optimized Architectures',
};

export const DOMAIN_WEIGHT: Record<Domain, number> = {
  secure: 0.3,
  resilient: 0.26,
  performance: 0.24,
  cost: 0.2,
};

export interface Option {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  domain: Domain;
  topic: string;
  type: 'single' | 'multi';
  choose: number;
  stem: string;
  options: Option[];
  answer: string[];
  explanation: string;
  distractors: Record<string, string>;
  difficulty: 1 | 2 | 3;
}

export interface ExamItem {
  id: string;
  scored: boolean;
}

export type Mode = 'block' | 'full' | 'domain' | 'review';

export const MODE_LABEL: Record<Mode, string> = {
  block: 'Bloque de 22',
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

export const PASS_SCALED = 720;
