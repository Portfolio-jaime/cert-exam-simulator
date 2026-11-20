import type { Question } from './types';

const files = import.meta.glob<Question[]>('../data/questions/*.json', { eager: true, import: 'default' });

export const BANK: Question[] = Object.values(files).flat();
export const BANK_MAP = new Map(BANK.map((q) => [q.id, q]));
