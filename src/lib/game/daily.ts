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
function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function seedFromKey(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
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
    const problem = topic.gen(diff);
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

/** Promote the top of a league, relegate the bottom. */
export function nextTier(tier: number, rank: number, size: number): number {
  if (size >= 5 && rank <= Math.max(1, Math.floor(size * 0.2))) return Math.min(TOP_LEAGUE, tier + 1);
  if (size >= 5 && rank > size - Math.max(1, Math.floor(size * 0.2))) return Math.max(0, tier - 1);
  return tier;
}
