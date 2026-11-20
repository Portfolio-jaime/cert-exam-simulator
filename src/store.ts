import type { Attempt } from './types';
import type { SessionState } from './exam/engine';

const K_HISTORY = 'saa.history.v1';
const K_NAME = 'saa.name.v1';
const K_SESSION = 'saa.session.v1';

export type KV = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function defaultStorage(): KV | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export class Store {
  private mem = new Map<string, string>();
  constructor(private kv: KV | null = defaultStorage()) {}

  private read(key: string): string | null {
    try {
      if (this.kv) return this.kv.getItem(key);
    } catch {
      /* fall through to memory */
    }
    return this.mem.get(key) ?? null;
  }

  private write(key: string, value: string): void {
    this.mem.set(key, value);
    try {
      this.kv?.setItem(key, value);
    } catch {
      /* storage blocked: memory only */
    }
  }

  private remove(key: string): void {
    this.mem.delete(key);
    try {
      this.kv?.removeItem(key);
    } catch {
      /* ignore */
    }
  }

  history(): Attempt[] {
    try {
      const raw = this.read(K_HISTORY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? (parsed as Attempt[]) : [];
    } catch {
      return [];
    }
  }

  saveAttempt(a: Attempt): void {
    const h = this.history().filter((x) => x.id !== a.id);
    h.push(a);
    this.write(K_HISTORY, JSON.stringify(h));
  }

  clearHistory(): void {
    this.remove(K_HISTORY);
  }

  /** Questions ever answered, and questions whose latest scored appearance was wrong. */
  stats(isCorrect: (a: Attempt, id: string) => boolean): { seen: Set<string>; failed: Set<string> } {
    const seen = new Set<string>();
    const failed = new Set<string>();
    for (const a of this.history()) {
      for (const it of a.items) {
        if (!(a.answers[it.id]?.length)) continue;
        seen.add(it.id);
        if (isCorrect(a, it.id)) failed.delete(it.id);
        else failed.add(it.id);
      }
    }
    return { seen, failed };
  }

  name(): string {
    return this.read(K_NAME) ?? '';
  }

  setName(n: string): void {
    this.write(K_NAME, n.trim());
  }

  saveSession(s: SessionState): void {
    this.write(K_SESSION, JSON.stringify(s));
  }

  loadSession(): SessionState | null {
    try {
      const raw = this.read(K_SESSION);
      return raw ? (JSON.parse(raw) as SessionState) : null;
    } catch {
      return null;
    }
  }

  clearSession(): void {
    this.remove(K_SESSION);
  }
}
