import { seedFromKey, todayKey } from "@/lib/game/daily";

/* The games that also live on the Home tab: today's game card, the bonus
   stops along the map, and the bonus round after a boss. They rotate by
   date, so Home looks a little different every day. */
export type HomeGameId = "runner" | "race" | "sushi" | "castle" | "pop" | "ttt";
export type HomeGame = { id: HomeGameId; icon: string; name: string; nameJa: string; blurb: string; blurbJa: string; tint: string };

export const HOME_GAMES: HomeGame[] = [
  { id: "castle", icon: "🏯", name: "Castle Defense", nameJa: "お城をまもれ！", blurb: "Answer to fire arrows at the marching monsters.", blurbJa: "答えて矢をうて！モンスターからお城をまもろう。", tint: "linear-gradient(130deg,#5a3fb8,#2f6fd0)" },
  { id: "sushi", icon: "🍣", name: "Sushi Shop", nameJa: "おすし屋さん", blurb: "Total the plates before your customers lose patience.", blurbJa: "お皿の合計を計算してお会計！", tint: "linear-gradient(130deg,#b8322e,#e0773a)" },
  { id: "runner", icon: "🏃", name: "Math Runner", nameJa: "計算ランナー", blurb: "Answer to jump the rocks. How far can you run?", blurbJa: "答えてジャンプ！どこまで走れる？", tint: "linear-gradient(130deg,#2E8B57,#1E7A8C)" },
  { id: "race", icon: "🏁", name: "Math Race", nameJa: "計算レース", blurb: "Every right answer is a dash to the line.", blurbJa: "正解でダッシュ！ゴールをめざせ。", tint: "linear-gradient(130deg,#E0457B,#FF7A3D)" },
  { id: "pop", icon: "🎈", name: "Number Pop", nameJa: "かずの風船ポップ", blurb: "Pop the balloon with the answer.", blurbJa: "答えの風船をポップ！", tint: "linear-gradient(130deg,#2a9fd6,#6fc3ef)" },
  { id: "ttt", icon: "⭕", name: "Math Tic-Tac-Toe", nameJa: "計算○×ゲーム", blurb: "Claim squares by answering.", blurbJa: "答えてマスを取ろう。", tint: "linear-gradient(130deg,#1C5FA8,#3A1D7A)" },
];

function dayIndex(): number {
  return seedFromKey(todayKey()) >>> 0;
}
export function todaysGame(): HomeGame {
  return HOME_GAMES[dayIndex() % HOME_GAMES.length];
}
/* The k-th bonus stop on the map today — never the same as today's card. */
export function bonusStopGame(k: number): HomeGame {
  const others = HOME_GAMES.filter((g) => g.id !== todaysGame().id);
  return others[(dayIndex() + k) % others.length];
}
/* The bonus round offered after beating a topic's boss. */
export function bossBonusGame(topicIdx: number): HomeGame {
  const action = HOME_GAMES.filter((g) => g.id === "castle" || g.id === "runner" || g.id === "race" || g.id === "sushi");
  return action[(dayIndex() + topicIdx) % action.length];
}
