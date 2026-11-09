import { and, desc, eq, gt, lt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { dailyChallenge, leaguePoints, users } from "@/db/schema";
import { DAILY_QUESTIONS, scoreDaily, todayKey, weekStartKey, leagueOf, nextTier, TOP_LEAGUE, type League } from "./daily";

export type DailyStatus = {
  day: string;
  played: boolean;
  correct: number;
  total: number;
  points: number;
};

export type LeagueRow = {
  userId: string;
  name: string;
  points: number;
  rank: number;
  isMe: boolean;
  /* admin view: played last week, not yet this week — shown in the league
     they have moved into, with no points and no rank */
  waiting?: boolean;
};

export type LeagueStanding = {
  league: League;
  weekStart: string;
  rows: LeagueRow[];
  myRank: number;
  myPoints: number;
  /* how many players are in this league this week, and how many of them
     move up / down when the week ends (0 when there are too few to move) */
  size: number;
  promote: number;
  relegate: number;
};

/* The league a player is in this week. A player's first Daily Challenge of a
   new week settles last week: top 20% of their old league move up a tier,
   bottom 20% move down (only when the league had 5+ players). A player who
   skipped weeks keeps their last league. */
async function tierForWeek(userId: string, week: string): Promise<number> {
  const db = getDb();
  const cur = (await db.select().from(leaguePoints)
    .where(and(eq(leaguePoints.userId, userId), eq(leaguePoints.weekStart, week))).limit(1))[0];
  if (cur) return cur.tier;
  const prev = (await db.select().from(leaguePoints)
    .where(and(eq(leaguePoints.userId, userId), lt(leaguePoints.weekStart, week)))
    .orderBy(desc(leaguePoints.weekStart)).limit(1))[0];
  if (!prev) return 0;
  const lastWeek = new Date(week + "T00:00:00");
  lastWeek.setDate(lastWeek.getDate() - 7);
  if (String(prev.weekStart) !== todayKey(lastWeek)) return prev.tier;
  const same = and(eq(leaguePoints.weekStart, prev.weekStart), eq(leaguePoints.tier, prev.tier));
  const [{ n: size }] = await db.select({ n: sql<number>`count(*)::int` }).from(leaguePoints).where(same);
  const [{ n: ahead }] = await db.select({ n: sql<number>`count(*)::int` }).from(leaguePoints).where(and(same, gt(leaguePoints.points, prev.points)));
  return nextTier(prev.tier, ahead + 1, size);
}

export async function getDailyStatus(userId: string): Promise<DailyStatus> {
  const db = getDb();
  const day = todayKey();
  const row = (
    await db
      .select()
      .from(dailyChallenge)
      .where(and(eq(dailyChallenge.userId, userId), eq(dailyChallenge.day, day)))
      .limit(1)
  )[0];
  return {
    day,
    played: !!row,
    correct: row?.correct ?? 0,
    total: row?.total ?? DAILY_QUESTIONS,
    points: row?.points ?? 0,
  };
}

/** Records the one allowed attempt for today and adds its points to this week's league. */
export async function submitDaily(userId: string, correct: number, elapsedMs: number) {
  const db = getDb();
  const day = todayKey();
  const week = weekStartKey();

  const existing = (
    await db
      .select()
      .from(dailyChallenge)
      .where(and(eq(dailyChallenge.userId, userId), eq(dailyChallenge.day, day)))
      .limit(1)
  )[0];
  if (existing) {
    return { alreadyPlayed: true, points: existing.points, correct: existing.correct };
  }

  const tier = await tierForWeek(userId, week);
  const safeCorrect = Math.max(0, Math.min(DAILY_QUESTIONS, Math.floor(correct)));
  const points = scoreDaily(safeCorrect, Math.max(0, elapsedMs));

  await db.insert(dailyChallenge).values({
    userId,
    day,
    correct: safeCorrect,
    total: DAILY_QUESTIONS,
    elapsedMs: Math.max(0, Math.floor(elapsedMs)),
    points,
  });

  await db
    .insert(leaguePoints)
    .values({ userId, weekStart: week, points, tier })
    .onConflictDoUpdate({
      target: [leaguePoints.userId, leaguePoints.weekStart],
      set: { points: sql`${leaguePoints.points} + ${points}`, updatedAt: new Date() },
    });

  return { alreadyPlayed: false, points, correct: safeCorrect };
}

/** This week's table for the player's own tier. */
/* The player's own league this week: everyone in this tier who has played
   this week. Built from the same tables as the admin "All leagues" view
   (minus its waiting players, who have not played yet), so the two agree. */
export async function getLeagueStanding(userId: string): Promise<LeagueStanding> {
  const db = getDb();
  const week = weekStartKey();
  const mine = (
    await db
      .select()
      .from(leaguePoints)
      .where(and(eq(leaguePoints.userId, userId), eq(leaguePoints.weekStart, week)))
      .limit(1)
  )[0];
  /* not on this week's table yet: show the league they will join */
  const tier = mine?.tier ?? (await tierForWeek(userId, week));
  const all = await getAllLeagues(userId, week);
  const table = all.tables.find((t) => t.league.tier === tier);
  const rows = (table?.rows ?? []).filter((r) => !r.waiting);
  const me = rows.find((r) => r.isMe && !r.waiting);
  return {
    league: leagueOf(tier),
    weekStart: week,
    rows,
    myRank: me?.rank ?? 0,
    myPoints: mine?.points ?? 0,
    size: table?.size ?? 0,
    promote: table?.promote ?? 0,
    relegate: table?.relegate ?? 0,
  };
}

/* ---------- admin: every league at once ----------
   The players' sheet shows only their own tier; the admin sees this week's
   table for every tier, everyone in it, with the same up/down zones. */
export type LeagueTable = { league: League; size: number; promote: number; relegate: number; rows: LeagueRow[] };

export async function getAllLeagues(viewerId: string, week = weekStartKey()): Promise<{ weekStart: string; tables: LeagueTable[] }> {
  const db = getDb();
  const pick = { userId: leaguePoints.userId, points: leaguePoints.points, tier: leaguePoints.tier, name: users.name, username: users.username };
  const rows = await db.select(pick).from(leaguePoints)
    .innerJoin(users, eq(users.id, leaguePoints.userId))
    .where(eq(leaguePoints.weekStart, week))
    .orderBy(desc(leaguePoints.tier), desc(leaguePoints.points));

  /* A new week starts empty until people play, so on a Monday whole leagues
     vanished. Last week's players who have not played yet are listed in the
     league they move into (the same settlement tierForWeek applies). */
  const prevDate = new Date(week + "T00:00:00");
  prevDate.setDate(prevDate.getDate() - 7);
  const prev = await db.select(pick).from(leaguePoints)
    .innerJoin(users, eq(users.id, leaguePoints.userId))
    .where(eq(leaguePoints.weekStart, todayKey(prevDate)))
    .orderBy(desc(leaguePoints.points));
  const played = new Set(rows.map((r) => r.userId));
  const prevByTier = new Map<number, typeof prev>();
  for (const r of prev) prevByTier.set(r.tier, [...(prevByTier.get(r.tier) ?? []), r]);
  const waiting: { userId: string; name: string; tier: number }[] = [];
  for (const [tier, list] of prevByTier) {
    list.forEach((r) => {
      /* the same settlement as tierForWeek: a tie shares the better rank */
      const rank = 1 + list.filter((o) => o.points > r.points).length;
      if (!played.has(r.userId)) waiting.push({ userId: r.userId, name: r.username || r.name, tier: nextTier(tier, rank, list.length) });
    });
  }

  const byTier = new Map<number, typeof rows>();
  for (const r of rows) byTier.set(r.tier, [...(byTier.get(r.tier) ?? []), r]);
  for (const w of waiting) if (!byTier.has(w.tier)) byTier.set(w.tier, []);
  const tables: LeagueTable[] = [...byTier.entries()].sort((a, b) => b[0] - a[0]).map(([tier, list]) => {
    const size = list.length;
    const moving = size >= 5 ? Math.max(1, Math.floor(size * 0.2)) : 0;
    return {
      league: leagueOf(tier), size,
      promote: tier < TOP_LEAGUE ? moving : 0,
      relegate: tier > 0 ? moving : 0,
      rows: [
        ...list.map((r, i) => ({ userId: r.userId, name: r.username || r.name, points: r.points, rank: i + 1, isMe: r.userId === viewerId })),
        ...waiting.filter((w) => w.tier === tier).map((w) => ({ userId: w.userId, name: w.name, points: 0, rank: 0, isMe: w.userId === viewerId, waiting: true })),
      ],
    };
  });
  return { weekStart: week, tables };
}
