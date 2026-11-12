
/* What gameplay reports upward (quests are gone; the events remain as the
   names the games use when they report a right answer or a finished round). */
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
    icon: "🧹",
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
    blurbJa: "次のスピードクイズを4秒長く始めます。",
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
