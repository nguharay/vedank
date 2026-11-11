import { TOPICS, type Problem, type Difficulty } from "./topics";

export const DAILY_QUESTIONS = 8;

export type League = { tier: number; name: string; nameJa: string; icon: string; color: string };

export const LEAGUES: League[] = [
  { tier: 0, name: "Clay", nameJa: "土", icon: "🥉", color: "#A16207" },
  { tier: 1, name: "Bronze", nameJa: "銅", icon: "🟤", color: "#B45309" },
  { tier: 2, name: "Silver", nameJa: "銀", icon: "⚪", color: "#64748B" },
  { tier: 3, name: "Gold", nameJa: "金", icon: "🟡", color: "#D97706" },
  { tier: 4, name: "Sapphire", nameJa: "青玉", icon: "🔵", color: "#2563EB" },
  { tier: 5, name: "Ruby", nameJa: "紅玉", icon: "🔴", color: "#DC2626" },
  { tier: 6, name: "Diamond", nameJa: "金剛石", icon: "💎", color: "#0891B2" },
];

export const TOP_LEAGUE = LEAGUES.length - 1;

export function leagueOf(tier: number): League {
  return LEAGUES[Math.max(0, Math.min(TOP_LEAGUE, tier))];
}

/** YYYY-MM-DD in the player's own timezone, so "today" means their today. */
export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday of the week containing `d`, as YYYY-MM-DD. */
export function weekStartKey(d = new Date()): string {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - dow);
  return todayKey(x);
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

    const diff: Difficulty = i < 3 ? "easy" : i < 6 ? "medium" : "hard";
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

/* ---------- the league rules ----------
   Moving UP is by points: reach your league's weekly target (Daily Challenge
   points, Monday to Monday) and you move up one league at the reset, however
   many others played. A perfect day is worth about 1,000 points, so a
   target is roughly 3 to 5 good days.
   Moving DOWN is by missed days: a player who misses the Daily Challenge two
   days in a row drops one league (personal reminders go out on each of those
   two evenings). One lapse costs one league, however long it lasts. */
export const LEAGUE_TARGETS = [2500, 3000, 3500, 4000, 4500, 5000];      /* by tier; Diamond has none */
export const LAPSE_DAYS = 2;
export function weeklyTarget(tier: number): number | null {
  return tier < TOP_LEAGUE ? LEAGUE_TARGETS[Math.min(tier, LEAGUE_TARGETS.length - 1)] : null;
}
/* whole days from day a to day b (YYYY-MM-DD) */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400_000);
}
/* full days missed in a row before `today`, counting back from yesterday */
export function missedDaysBefore(lastPlay: string | null, today: string): number {
  return lastPlay ? Math.max(0, daysBetween(lastPlay, today) - 1) : 0;
}
/* A player's league right now.
     cur      this week's row, if they have played this week
     prev     their latest earlier row (settled: +1 if it met its target)
     lastPlay their last Daily Challenge day before today
     playedToday  a lapse is applied (once) by today's play, so after it
              nothing is pending
   A lapse of LAPSE_DAYS+ missed days not yet applied takes one league off. */
export function settleTier(o: { curTier: number | null; prev: { tier: number; points: number } | null; lastPlay: string | null; playedToday: boolean; today: string }): { tier: number; lapsed: boolean } {
  let tier = o.curTier ?? (o.prev ? (o.prev.points >= (weeklyTarget(o.prev.tier) ?? Infinity) ? o.prev.tier + 1 : o.prev.tier) : 0);
  tier = Math.max(0, Math.min(TOP_LEAGUE, tier));
  const lapsed = !o.playedToday && missedDaysBefore(o.lastPlay, o.today) >= LAPSE_DAYS && tier > 0;
  return { tier: lapsed ? tier - 1 : tier, lapsed };
}
