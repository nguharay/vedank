import { todayKey } from "./daily";

/* What gameplay reports upward. Every quest counts one of these. */
export type QuestEvent =
  | "stage_cleared"
  | "stage_perfect"
  | "correct_answer"
  | "puzzle_solved"
  | "blitz_score"
  | "blitz_played"
  | "daily_played"
  | "mistake_fixed"
  | "trick_viewed";

export type QuestDef = {
  id: string;
  icon: string;
  event: QuestEvent;
  /* Target is a count for most quests; for blitz_score it is a score to reach. */
  target: number;
  reward: number;
  title: string;
  titleJa: string;
};

/* The pool. Kept deliberately reachable in one sitting — a quest a child can't
   finish today is a quest that teaches them to ignore quests. */
export const QUEST_POOL: QuestDef[] = [
  { id: "clear2", icon: "🎯", event: "stage_cleared", target: 2, reward: 40, title: "Clear 2 stages", titleJa: "ステージを2つクリア" },
  { id: "clear4", icon: "🎯", event: "stage_cleared", target: 4, reward: 70, title: "Clear 4 stages", titleJa: "ステージを4つクリア" },
  { id: "perfect1", icon: "🌟", event: "stage_perfect", target: 1, reward: 50, title: "Finish a stage with no mistakes", titleJa: "ノーミスでステージクリア" },
  { id: "correct20", icon: "✅", event: "correct_answer", target: 20, reward: 40, title: "Answer 20 questions correctly", titleJa: "20問正解する" },
  { id: "correct40", icon: "✅", event: "correct_answer", target: 40, reward: 70, title: "Answer 40 questions correctly", titleJa: "40問正解する" },
  { id: "puzzle1", icon: "🧩", event: "puzzle_solved", target: 1, reward: 35, title: "Solve a matchstick puzzle", titleJa: "マッチ棒パズルを1問解く" },
  { id: "puzzle2", icon: "🧩", event: "puzzle_solved", target: 2, reward: 60, title: "Solve 2 matchstick puzzles", titleJa: "マッチ棒パズルを2問解く" },
  { id: "blitz10", icon: "⚡", event: "blitz_score", target: 10, reward: 30, title: "Score 10 in Number Blitz", titleJa: "ブリッツで10点" },
  { id: "blitz20", icon: "⚡", event: "blitz_score", target: 20, reward: 55, title: "Score 20 in Number Blitz", titleJa: "ブリッツで20点" },
  { id: "blitz2x", icon: "⚡", event: "blitz_played", target: 2, reward: 30, title: "Play Number Blitz twice", titleJa: "ブリッツを2回プレイ" },
  { id: "daily1", icon: "📅", event: "daily_played", target: 1, reward: 45, title: "Finish today's Daily Challenge", titleJa: "デイリーチャレンジを終える" },
  { id: "fix3", icon: "🩹", event: "mistake_fixed", target: 3, reward: 50, title: "Fix 3 questions you got wrong", titleJa: "まちがえた問題を3問なおす" },
  { id: "trick1", icon: "🎩", event: "trick_viewed", target: 1, reward: 25, title: "Learn a magic trick", titleJa: "マジックを1つ見る" },
];

const BY_ID = new Map(QUEST_POOL.map((q) => [q.id, q]));
export function questById(id: string): QuestDef | undefined {
  return BY_ID.get(id);
}

/* Same three quests for everyone on a given day, so "what did you get today?"
   is a conversation. Deterministic from the date — no storage needed to decide
   which quests are live, only to record progress against them. */
export function questsForDay(day: string = todayKey()): QuestDef[] {
  let h = 2166136261;
  for (let i = 0; i < day.length; i++) {
    h ^= day.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rand = () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return Math.abs(h) / 2147483647;
  };

  /* Draw from distinct events so the three quests can't all be "clear stages",
     which would collapse into one goal wearing three hats. */
  const pool = [...QUEST_POOL];
  const picked: QuestDef[] = [];
  const usedEvents = new Set<QuestEvent>();
  while (picked.length < 3 && pool.length) {
    const i = Math.floor(rand() * pool.length) % pool.length;
    const q = pool.splice(i, 1)[0];
    if (usedEvents.has(q.event)) continue;
    usedEvents.add(q.event);
    picked.push(q);
  }
  return picked;
}

export function questDone(q: QuestDef, count: number): boolean {
  return count >= q.target;
}

/* ---------- shop ---------- */

export type ShopItemId = "hint" | "fifty" | "timeBoost" | "streakFreeze";

export type ShopItem = {
  id: ShopItemId;
  icon: string;
  cost: number;
  title: string;
  titleJa: string;
  blurb: string;
  blurbJa: string;
  /* How many you may hold at once — a cap keeps gems flowing instead of
     being hoarded into a permanent advantage. */
  max: number;
};

/* Everything here helps a player keep going. Nothing here gates play behind a
   purchase, and nothing is buyable with money — gems are earned only. */
export const SHOP_ITEMS: ShopItem[] = [
  {
    id: "hint",
    icon: "💡",
    cost: 60,
    max: 9,
    title: "Hint",
    titleJa: "ヒント",
    blurb: "Reveals the sutra step for one question.",
    blurbJa: "1問だけスートラの手順を見せます。",
  },
  {
    id: "fifty",
    icon: "✂️",
    cost: 80,
    max: 9,
    title: "50/50",
    titleJa: "50/50",
    blurb: "Removes two wrong choices. One extra use per stage.",
    blurbJa: "まちがいの選択肢を2つ消します。",
  },
  {
    id: "timeBoost",
    icon: "⏱️",
    cost: 70,
    max: 9,
    title: "Time Boost",
    titleJa: "タイムブースト",
    blurb: "Starts your next Blitz run with 4 extra seconds.",
    blurbJa: "次のブリッツを4秒長く始めます。",
  },
  {
    id: "streakFreeze",
    icon: "❄️",
    cost: 150,
    max: 2,
    title: "Streak Freeze",
    titleJa: "ストリークフリーズ",
    blurb: "Covers one missed day so your streak survives.",
    blurbJa: "1日休んでも連続日数が途切れません。",
  },
];

export function shopItem(id: string): ShopItem | undefined {
  return SHOP_ITEMS.find((s) => s.id === id);
}
