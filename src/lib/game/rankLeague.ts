/* The leagues on the Rank board. A league is your place among all players,
   not a fixed score: the top 2 are Legend Ninjas, the next 4 Thunder, the
   next 5 Wind and everyone else Rookie. When others clear more stages they push
   the line up, so staying on top means clearing more. */

export type RankLeague = { tier: number; name: string; nameJa: string; icon: string; color: string; upTo: number };

/* best first; upTo = the last place inside this league: the top 2 are
   Legend, the next 4 Thunder, the next 5 Wind, everyone else Rookie */
export const RANK_LEAGUES: RankLeague[] = [
  { tier: 3, name: "Legend Ninja", nameJa: "伝説の忍者", icon: "🔥", color: "#DC2626", upTo: 2 },
  { tier: 2, name: "Thunder Ninja", nameJa: "雷の忍者", icon: "⚡", color: "#D97706", upTo: 6 },
  { tier: 1, name: "Wind Ninja", nameJa: "風の忍者", icon: "🌀", color: "#0E8FA8", upTo: 11 },
  { tier: 0, name: "Rookie Ninja", nameJa: "見習い忍者", icon: "🌱", color: "#3F8F3A", upTo: Infinity },
];

export function rankLeague(tier: number): RankLeague {
  return RANK_LEAGUES.find((l) => l.tier === tier) ?? RANK_LEAGUES[RANK_LEAGUES.length - 1];
}

/* the last place (1-based) still inside a league, out of `total` ranked players */
export function leagueCutoff(tier: number, total: number): number {
  return Math.min(total, rankLeague(tier).upTo);
}

/* the league for the player in `position` (1-based) of `total` */
export function leagueAt(position: number, total: number): number {
  for (const l of RANK_LEAGUES) if (position <= leagueCutoff(l.tier, total)) return l.tier;
  return 0;
}
