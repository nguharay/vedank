import { TOPICS, type Problem, type Difficulty } from "./topics";

export const DAILY_QUESTIONS = 10;

/** The challenge day as YYYY-MM-DD. A new day starts at 9:00 in Japan
 * (00:00 UTC) for everyone, on every phone and on the server alike, so the
 * questions, the "played today" record and the winners all turn
 * over together. */
export function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** Deterministic PRNG so every player gets the same puzzle on the same date. */
export function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function seedFromKey(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* The 25 topic generators each call Math.random() internally, so a seeded PRNG
   alone only fixes which topics are chosen — the numbers still differ per call,
   which meant "the same puzzle for everyone" was not actually true. Swapping
   Math.random for the seeded stream around a generator call fixes every
   generator at once without rewriting all 25.

   Safe because gen() is synchronous: nothing can await between the swap and the
   restore, and the finally block puts the real one back even if gen throws. */
export function withSeededRandom<T>(rand: () => number, fn: () => T): T {
  const real = Math.random;
  Math.random = rand;
  try {
    return fn();
  } finally {
    Math.random = real;
  }
}

export type DailyQuestion = { problem: Problem; topicId: string; options: number[] };

function distractors(rand: () => number, answer: number, n: number): number[] {
  const out = new Set<number>();
  let guard = 0;
  while (out.size < n && guard++ < 200) {
    const spread = Math.max(2, Math.round(Math.abs(answer) * 0.12));
    const delta = Math.ceil(rand() * spread) * (rand() < 0.5 ? -1 : 1);
    const v = answer + delta;
    if (v !== answer && v >= 0) out.add(v);
  }
  while (out.size < n) out.add(answer + out.size + 1);
  return [...out];
}

/**
 * The day's puzzle set. Pure function of the date string, so the server and
 * every client independently derive an identical set without storing it.
 */
export function dailyQuestions(dayKey: string): DailyQuestion[] {
  const rand = seededRandom(seedFromKey(dayKey));
  const out: DailyQuestion[] = [];
  const used = new Set<string>();

  for (let i = 0; i < DAILY_QUESTIONS; i++) {
    let topic = TOPICS[Math.floor(rand() * TOPICS.length)];
    let guard = 0;
    while (used.has(topic.id) && used.size < TOPICS.length && guard++ < 50) {
      topic = TOPICS[Math.floor(rand() * TOPICS.length)];
    }
    used.add(topic.id);

    const diff: Difficulty = i < 3 ? "easy" : i < 7 ? "medium" : "hard";
    const problem = withSeededRandom(rand, () => topic.gen(diff));
    const opts = [problem.answer, ...distractors(rand, problem.answer, 3)];
    // deterministic shuffle
    for (let k = opts.length - 1; k > 0; k--) {
      const j = Math.floor(rand() * (k + 1));
      [opts[k], opts[j]] = [opts[j], opts[k]];
    }
    out.push({ problem, topicId: topic.id, options: opts });
  }
  return out;
}

/** Correctness is most of it, with a modest speed bonus so accuracy still wins. */
export function scoreDaily(correct: number, elapsedMs: number): number {
  const base = correct * 100;
  if (correct === 0) return 0;
  const avgSec = elapsedMs / 1000 / Math.max(1, correct);
  const speed = Math.max(0, Math.round((12 - Math.min(12, avgSec)) * 5));
  const perfect = correct === DAILY_QUESTIONS ? 150 : 0;
  return base + speed + perfect;
}

