"use client";
import { useSyncExternalStore } from "react";

/* ---------- 🏙️ Math Town ----------
   The meta-game: every right answer in any game earns town coins (🪙), and
   coins build a town — houses, trees, the sushi shop, the konbini, a castle…
   It lives in localStorage so guests have a town too. Some buildings are
   also doors: tapping the sushi shop opens the Sushi Shop game. */

export const TOWN_COLS = 5;
export const TOWN_ROWS = 7;
export const TOWN_PLOTS = TOWN_COLS * TOWN_ROWS;

export type Building = {
  id: string; emoji: string; name: string; nameJa: string; cost: number; pop: number;
  /* the town rank needed before it can be built */
  rank: number;
  /* a game this building opens */
  game?: string;
};
export const BUILDINGS: Building[] = [
  { id: "tree", emoji: "🌳", name: "Tree", nameJa: "木", cost: 5, pop: 0, rank: 1 },
  { id: "sakura", emoji: "🌸", name: "Sakura", nameJa: "さくら", cost: 10, pop: 0, rank: 1 },
  { id: "house", emoji: "🏠", name: "House", nameJa: "家", cost: 20, pop: 4, rank: 1 },
  { id: "flat", emoji: "🏢", name: "Apartments", nameJa: "マンション", cost: 60, pop: 12, rank: 2 },
  { id: "konbini", emoji: "🏪", name: "Konbini", nameJa: "コンビニ", cost: 80, pop: 2, rank: 2, game: "konbini" },
  { id: "sushi", emoji: "🍣", name: "Sushi shop", nameJa: "おすし屋", cost: 90, pop: 2, rank: 2, game: "sushi" },
  { id: "fountain", emoji: "⛲", name: "Fountain", nameJa: "ふんすい", cost: 60, pop: 0, rank: 2 },
  { id: "school", emoji: "🏫", name: "School", nameJa: "学校", cost: 150, pop: 6, rank: 3 },
  { id: "stadium", emoji: "🏟️", name: "Stadium", nameJa: "スタジアム", cost: 200, pop: 4, rank: 3, game: "race" },
  { id: "shrine", emoji: "⛩️", name: "Shrine", nameJa: "神社", cost: 220, pop: 2, rank: 3 },
  { id: "music", emoji: "🎵", name: "Music hall", nameJa: "音楽ホール", cost: 180, pop: 3, rank: 3, game: "rhythm" },
  { id: "castle", emoji: "🏯", name: "Castle", nameJa: "お城", cost: 400, pop: 8, rank: 4, game: "castle" },
  { id: "ferris", emoji: "🎡", name: "Ferris wheel", nameJa: "かんらん車", cost: 350, pop: 2, rank: 4 },
  { id: "tower", emoji: "🗼", name: "Tower", nameJa: "タワー", cost: 600, pop: 10, rank: 5 },
  { id: "rocket", emoji: "🚀", name: "Space centre", nameJa: "宇宙センター", cost: 1000, pop: 12, rank: 5 },
];
export const BUILDING = (id: string) => BUILDINGS.find((b) => b.id === id);

/* Town rank rises with population; each rank unlocks new buildings. */
export const RANKS = [
  { min: 0, name: "Village", nameJa: "むら" },
  { min: 12, name: "Town", nameJa: "まち" },
  { min: 40, name: "Big town", nameJa: "大きなまち" },
  { min: 90, name: "City", nameJa: "とし" },
  { min: 160, name: "Great city", nameJa: "大都市" },
];

export type TownState = { coins: number; earned: number; plots: (string | null)[]; welcome?: boolean };
const KEY = "sutraSprint.town";
const EMPTY: TownState = { coins: 0, earned: 0, plots: Array(TOWN_PLOTS).fill(null) };

let cache: { raw: string | null; value: TownState } = { raw: null, value: EMPTY };
const listeners = new Set<() => void>();

function read(): TownState {
  let raw: string | null = null;
  try { raw = localStorage.getItem(KEY); } catch { return EMPTY; }
  if (raw === cache.raw) return cache.value;
  let value = EMPTY;
  try {
    const p = raw ? (JSON.parse(raw) as TownState) : null;
    if (p && typeof p.coins === "number" && Array.isArray(p.plots)) {
      const plots = Array.from({ length: TOWN_PLOTS }, (_, i) => (typeof p.plots[i] === "string" && BUILDING(p.plots[i] as string) ? p.plots[i] : null));
      value = { coins: Math.max(0, p.coins), earned: p.earned ?? p.coins, plots, welcome: !!p.welcome };
    }
  } catch {}
  cache = { raw, value };
  return value;
}
function write(s: TownState) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
  listeners.forEach((fn) => fn());
}
function subscribe(fn: () => void) {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) fn(); };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(fn); window.removeEventListener("storage", onStorage); };
}
export function useTown(): TownState {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

/* one coin per right answer, from any game */
export function addTownCoins(n: number) {
  if (!(n > 0)) return;
  const s = read();
  write({ ...s, coins: s.coins + Math.round(n), earned: s.earned + Math.round(n) });
}
export function townPop(s: TownState): number {
  return s.plots.reduce((a, id) => a + (id ? BUILDING(id)?.pop ?? 0 : 0), 0);
}
export function townRank(s: TownState): number {
  return rankForPop(townPop(s));
}
export function rankForPop(pop: number): number {
  let r = 1;
  RANKS.forEach((k, i) => { if (pop >= k.min) r = i + 1; });
  return r;
}
export function build(plot: number, id: string): boolean {
  const s = read();
  const b = BUILDING(id);
  if (!b || s.plots[plot] || s.coins < b.cost || townRank(s) < b.rank) return false;
  const plots = [...s.plots]; plots[plot] = id;
  write({ ...s, coins: s.coins - b.cost, plots });
  return true;
}
/* knocking a building down gives half its cost back */
export function demolish(plot: number) {
  const s = read();
  const id = s.plots[plot];
  if (!id) return;
  const plots = [...s.plots]; plots[plot] = null;
  write({ ...s, coins: s.coins + Math.floor((BUILDING(id)?.cost ?? 0) / 2), plots });
}

/* a one-off gift so a new town can start with a house and a tree */
export const WELCOME_GIFT = 30;
export function claimWelcome() {
  const s = read();
  if (s.welcome) return;
  write({ ...s, welcome: true, coins: s.coins + WELCOME_GIFT });
}

/* spend coins in a friend's shop; false if you can't afford it */
export function spendTownCoins(n: number): boolean {
  const s = read();
  if (n <= 0 || s.coins < n) return false;
  write({ ...s, coins: s.coins - n });
  return true;
}
/* what a visitor pays in a shop building (a snack, a ride, a ticket) */
export function shopPrice(id: string): number {
  const b = BUILDING(id);
  return b ? Math.min(8, Math.max(3, Math.round(b.cost / 20))) : 3;
}
export const STICKERS = ["👍", "⭐", "❤️", "🎉", "🍣", "🏯", "😍", "🔥"];
