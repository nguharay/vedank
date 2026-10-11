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
export async function getLeagueStanding(userId: string, limit = 25): Promise<LeagueStanding> {
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
  const [{ n: size }] = await db.select({ n: sql<number>`count(*)::int` }).from(leaguePoints)
    .where(and(eq(leaguePoints.weekStart, week), eq(leaguePoints.tier, tier)));
  const moving = size >= 5 ? Math.max(1, Math.floor(size * 0.2)) : 0;

  const rows = await db
    .select({
      userId: leaguePoints.userId,
      points: leaguePoints.points,
      name: users.name,
      username: users.username,
    })
    .from(leaguePoints)
    .innerJoin(users, eq(users.id, leaguePoints.userId))
    .where(and(eq(leaguePoints.weekStart, week), eq(leaguePoints.tier, tier)))
    .orderBy(desc(leaguePoints.points))
    .limit(limit);

  const table: LeagueRow[] = rows.map((r, i) => ({
    userId: r.userId,
    name: r.username || r.name,
    points: r.points,
    rank: i + 1,
    isMe: r.userId === userId,
  }));

  const me = table.find((r) => r.isMe);
  return {
    league: leagueOf(tier),
    weekStart: week,
    rows: table,
    myRank: me?.rank ?? 0,
    myPoints: mine?.points ?? 0,
    size,
    promote: tier < TOP_LEAGUE ? moving : 0,
    relegate: tier > 0 ? moving : 0,
  };
}
