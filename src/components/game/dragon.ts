"use client";
import { useSyncExternalStore } from "react";
import { todayKey } from "@/lib/game/daily";

/* ---------- 🐉 Dragon Pet ----------
   A pet that lives on the Home screen and eats right answers. Every right
   answer in any game is one bite; DAILY_GOAL bites feeds it for the day.
   Days fed in a row build its streak, and total bites grow it through five
   forms. Miss a day and it goes hungry (sad), but it never dies and never
   un-grows — this is a reason to come back, not a punishment. Stored in
   localStorage, so guests have a dragon too. */
export const DAILY_GOAL = 10;

export type DragonStage = { min: number; emoji: string; name: string; nameJa: string };
export const STAGES: DragonStage[] = [
  { min: 0, emoji: "🥚", name: "Egg", nameJa: "たまご" },
  { min: 10, emoji: "🐣", name: "Hatchling", nameJa: "ひな" },
  { min: 60, emoji: "🐲", name: "Young dragon", nameJa: "こどもドラゴン" },
  { min: 200, emoji: "🐉", name: "Dragon", nameJa: "ドラゴン" },
  { min: 500, emoji: "🐉", name: "Golden dragon", nameJa: "きんのドラゴン" },
];

export type DragonState = {
  bites: number;        /* total, ever */
  today: string;        /* the day `fedToday` counts for */
  fedToday: number;
  streak: number;       /* consecutive days fed */
  lastFedDay: string | null;
  name: string | null;  /* the child can name it */
};
const KEY = "sutraSprint.dragon";
const EMPTY: DragonState = { bites: 0, today: "", fedToday: 0, streak: 0, lastFedDay: null, name: null };

let cache: { raw: string | null; value: DragonState } = { raw: null, value: EMPTY };
const listeners = new Set<() => void>();

function dayBefore(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return todayKey(new Date(y, m - 1, d - 1));
}
/* roll the day over: yesterday's count is gone, the streak survives only if
   yesterday was fed */
function rolled(s: DragonState): DragonState {
  const t = todayKey();
  if (s.today === t) return s;
  const keepStreak = s.lastFedDay === dayBefore(t) || s.lastFedDay === t;
  return { ...s, today: t, fedToday: 0, streak: keepStreak ? s.streak : 0 };
}

function read(): DragonState {
  let raw: string | null = null;
  try { raw = localStorage.getItem(KEY); } catch { return EMPTY; }
  if (raw === cache.raw) return cache.value;
  let value = EMPTY;
  try {
    const p = raw ? (JSON.parse(raw) as DragonState) : null;
    if (p && typeof p.bites === "number") value = { ...EMPTY, ...p };
  } catch {}
  cache = { raw, value };
  return value;
}
function write(s: DragonState) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
  listeners.forEach((fn) => fn());
}
function subscribe(fn: () => void) {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) fn(); };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(fn); window.removeEventListener("storage", onStorage); };
}
export function useDragon(): DragonState {
  const s = useSyncExternalStore(subscribe, read, () => EMPTY);
  /* a stale day is rolled on read, so the card never shows yesterday's meal */
  return s.today === todayKey() || !s.today ? s : rolled(s);
}

/* one bite per right answer, from any game */
export function feedDragon(n: number): { fedNow: boolean; grew: DragonStage | null } {
  if (!(n > 0)) return { fedNow: false, grew: null };
  const before = rolled(read());
  const t = todayKey();
  const bites = before.bites + Math.round(n);
  const fedToday = before.fedToday + Math.round(n);
  const wasFed = before.fedToday >= DAILY_GOAL;
  const fedNow = !wasFed && fedToday >= DAILY_GOAL;
  let streak = before.streak, lastFedDay = before.lastFedDay;
  if (fedNow) {
    streak = before.lastFedDay === dayBefore(t) ? before.streak + 1 : 1;
    lastFedDay = t;
  }
  write({ ...before, bites, fedToday, streak, lastFedDay, today: t });
  const grew = stageOf(bites) !== stageOf(before.bites) ? stageOf(bites) : null;
  return { fedNow, grew };
}
export function nameDragon(name: string) {
  write({ ...rolled(read()), name: name.trim().slice(0, 14) || null });
}
export function stageOf(bites: number): DragonStage {
  let st = STAGES[0];
  for (const s of STAGES) if (bites >= s.min) st = s;
  return st;
}
export function nextStage(bites: number): DragonStage | null {
  return STAGES.find((s) => s.min > bites) ?? null;
}
export type DragonMood = "happy" | "hungry" | "sad" | "full";
export function moodOf(s: DragonState): DragonMood {
  if (s.fedToday >= DAILY_GOAL) return "full";
  const t = todayKey();
  const missedYesterday = s.lastFedDay !== null && s.lastFedDay !== dayBefore(t) && s.lastFedDay !== t;
  if (missedYesterday) return "sad";
  return s.fedToday > 0 ? "happy" : "hungry";
}
