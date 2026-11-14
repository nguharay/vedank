/* The leagues on the Rank board. A league is your place among all players,
   not a fixed score: the top 10% are Diamond, the next 20% Gold, the next 30%
   Silver and everyone else Bronze. When others clear more stages they push
   the line up, so staying on top means clearing more. */

export type RankLeague = { tier: number; name: string; nameJa: string; icon: string; color: string; share: number };

/* best first; share = the fraction of players at or above this league */
export const RANK_LEAGUES: RankLeague[] = [
  { tier: 3, name: "Diamond", nameJa: "ダイヤ", icon: "💎", color: "#2563EB", share: 0.1 },
  { tier: 2, name: "Gold", nameJa: "ゴールド", icon: "🥇", color: "#D97706", share: 0.3 },
  { tier: 1, name: "Silver", nameJa: "シルバー", icon: "🥈", color: "#64748B", share: 0.6 },
  { tier: 0, name: "Bronze", nameJa: "ブロンズ", icon: "🥉", color: "#B45309", share: 1 },
];

export function rankLeague(tier: number): RankLeague {
  return RANK_LEAGUES.find((l) => l.tier === tier) ?? RANK_LEAGUES[RANK_LEAGUES.length - 1];
}

/* the last place (1-based) still inside a league, out of `total` ranked players */
export function leagueCutoff(tier: number, total: number): number {
  return Math.max(1, Math.ceil(rankLeague(tier).share * total));
}

/* the league for the player in `position` (1-based) of `total` */
export function leagueAt(position: number, total: number): number {
  for (const l of RANK_LEAGUES) if (position <= leagueCutoff(l.tier, total)) return l.tier;
  return 0;
}
