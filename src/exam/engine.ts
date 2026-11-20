import { examById, type ExamDef } from '../exams';
import { scoreAttempt } from './scoring';
import type { Attempt, ExamId, ExamItem, Mode, Question } from '../types';

export interface SessionState {
  id: string;
  exam?: ExamId;
  mode: Mode;
  startedAt: number;
  limitSec: number;
  items: ExamItem[];
  answers: Record<string, string[]>;
  flags: string[];
  index: number;
}

/** Mode settings come from the exam definition; review/domain practice reuse the block size. */
export function modeConfig(exam: ExamDef, mode: Mode): { size: number; limitSec: number; unscored: number } {
  if (mode === 'full') return { size: exam.full.size, limitSec: exam.full.limitSec, unscored: exam.full.unscored };
  return { ...exam.block, unscored: 0 };
}

export class ExamSession {
  constructor(
    public state: SessionState,
    private bank: Map<string, Question>,
  ) {}

  static create(exam: ExamDef, mode: Mode, items: ExamItem[], bank: Map<string, Question>, now: number): ExamSession {
    const limit = modeConfig(exam, mode).limitSec;
    // Shorter custom sets (e.g. few failed questions) scale the clock to 2 min per question.
    const limitSec = Math.min(limit, Math.max(items.length * 120, 120));
    return new ExamSession(
      { id: `${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`, exam: exam.id, mode, startedAt: now, limitSec, items, answers: {}, flags: [], index: 0 },
      bank,
    );
  }

  question(i = this.state.index): Question {
    return this.bank.get(this.state.items[i].id)!;
  }

  get length(): number {
    return this.state.items.length;
  }

  goto(i: number): void {
    this.state.index = Math.max(0, Math.min(this.length - 1, i));
  }

  /** Single: replaces the selection. Multi: toggles, and ignores picks beyond `choose` like the real exam UI. */
  select(optionId: string, i = this.state.index): void {
    const q = this.question(i);
    const cur = this.state.answers[q.id] ?? [];
    if (q.type === 'single') {
      this.state.answers[q.id] = [optionId];
      return;
    }
    if (cur.includes(optionId)) {
      this.state.answers[q.id] = cur.filter((x) => x !== optionId);
    } else if (cur.length < q.choose) {
      this.state.answers[q.id] = [...cur, optionId];
    }
  }

  toggleFlag(i = this.state.index): void {
    const id = this.state.items[i].id;
    const f = new Set(this.state.flags);
    if (!f.delete(id)) f.add(id);
    this.state.flags = [...f];
  }

  isAnswered(i: number): boolean {
    const q = this.question(i);
    return (this.state.answers[q.id]?.length ?? 0) > 0;
  }

  /** Multi-select left half-answered counts as incomplete. */
  isComplete(i: number): boolean {
    const q = this.question(i);
    return (this.state.answers[q.id]?.length ?? 0) === q.choose;
  }

  remainingSec(now: number): number {
    return Math.max(0, this.state.limitSec - Math.floor((now - this.state.startedAt) / 1000));
  }

  isExpired(now: number): boolean {
    return this.remainingSec(now) <= 0;
  }

  finish(now: number, autoSubmitted: boolean): Attempt {
    const s = this.state;
    const finishedAt = Math.min(now, s.startedAt + s.limitSec * 1000);
    return {
      id: s.id,
      exam: s.exam ?? 'saa',
      mode: s.mode,
      startedAt: s.startedAt,
      finishedAt,
      durationSec: Math.round((finishedAt - s.startedAt) / 1000),
      limitSec: s.limitSec,
      autoSubmitted,
      items: s.items,
      answers: s.answers,
      flags: s.flags,
      result: scoreAttempt(s.items, this.bank, s.answers, examById(s.exam)),
    };
  }
}
