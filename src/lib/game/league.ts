import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { dailyChallenge, leaguePoints, users } from "@/db/schema";
import { DAILY_QUESTIONS, scoreDaily, todayKey, weekStartKey, leagueOf, type League } from "./daily";

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
};

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
    .values({ userId, weekStart: week, points, tier: 0 })
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
  const tier = mine?.tier ?? 0;

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
  };
}
