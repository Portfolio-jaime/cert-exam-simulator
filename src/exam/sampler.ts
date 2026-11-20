import { DOMAINS, DOMAIN_WEIGHT, type Domain, type ExamItem, type Question } from '../types';

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Largest-remainder allocation of `size` across domains following the exam weights. */
export function allocate(size: number, weights: Record<Domain, number> = DOMAIN_WEIGHT): Record<Domain, number> {
  const raw = DOMAINS.map((d) => ({ d, v: weights[d] * size }));
  const out = {} as Record<Domain, number>;
  let used = 0;
  for (const r of raw) {
    out[r.d] = Math.floor(r.v);
    used += out[r.d];
  }
  const order = raw
    .map((r) => ({ d: r.d, frac: r.v - Math.floor(r.v) }))
    .sort((x, y) => y.frac - x.frac);
  for (let i = 0; used < size; i = (i + 1) % order.length) {
    out[order[i].d]++;
    used++;
  }
  return out;
}

export interface BuildOptions {
  bank: Question[];
  size: number;
  seed: number;
  seen?: Set<string>;
  failed?: Set<string>;
  domain?: Domain;
  onlyIds?: Set<string>;
  unscored?: number;
}

/** Priority: failed first, then never seen, then already answered correctly. */
function prioritise(pool: Question[], rnd: () => number, seen: Set<string>, failed: Set<string>): Question[] {
  const g1 = pool.filter((q) => failed.has(q.id));
  const g2 = pool.filter((q) => !failed.has(q.id) && !seen.has(q.id));
  const g3 = pool.filter((q) => !failed.has(q.id) && seen.has(q.id));
  return [...shuffle(g1, rnd), ...shuffle(g2, rnd), ...shuffle(g3, rnd)];
}

export function buildExam(opts: BuildOptions): ExamItem[] {
  const rnd = mulberry32(opts.seed);
  const seen = opts.seen ?? new Set<string>();
  const failed = opts.failed ?? new Set<string>();
  let bank = opts.bank;
  if (opts.onlyIds) bank = bank.filter((q) => opts.onlyIds!.has(q.id));
  if (opts.domain) bank = bank.filter((q) => q.domain === opts.domain);

  const size = Math.min(opts.size, bank.length);
  const picked: Question[] = [];

  if (opts.domain || opts.onlyIds) {
    picked.push(...prioritise(bank, rnd, seen, failed).slice(0, size));
  } else {
    const target = allocate(size);
    const pools = {} as Record<Domain, Question[]>;
    for (const d of DOMAINS) pools[d] = prioritise(bank.filter((q) => q.domain === d), rnd, seen, failed);
    let missing = 0;
    for (const d of DOMAINS) {
      const take = Math.min(target[d], pools[d].length);
      picked.push(...pools[d].splice(0, take));
      missing += target[d] - take;
    }
    // A domain ran out of questions: fill from whatever is left.
    if (missing > 0) {
      const rest = prioritise(DOMAINS.flatMap((d) => pools[d]), rnd, seen, failed);
      picked.push(...rest.slice(0, missing));
    }
  }

  const ordered = shuffle(picked, rnd);
  const unscoredIdx = new Set<number>();
  const n = Math.min(opts.unscored ?? 0, ordered.length);
  const idxs = shuffle(ordered.map((_, i) => i), rnd);
  for (let i = 0; i < n; i++) unscoredIdx.add(idxs[i]);
  return ordered.map((q, i) => ({ id: q.id, scored: !unscoredIdx.has(i) }));
}
