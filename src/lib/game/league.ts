import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { dailyChallenge, users } from "@/db/schema";
import { DAILY_QUESTIONS, scoreDaily, todayKey } from "./daily";

export type DailyStatus = {
  day: string;
  played: boolean;
  correct: number;
  total: number;
  points: number;
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

/** Records the one allowed attempt for today. */
export async function submitDaily(userId: string, correct: number, elapsedMs: number) {
  const db = getDb();
  const day = todayKey();

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

  return { alreadyPlayed: false, points, correct: safeCorrect };
}

/* ---------- today's Daily Challenge winners ----------
   A winner is anyone who got every question right, fastest first. Each one
   carries a streak: perfect days in a row ending on the day shown (1 = just
   that day). Before anyone has a perfect score today, yesterday's winners are
   shown instead, so the card on Home is never empty in the morning. */
export type DailyWinner = { userId: string; name: string; secs: number; streak: number; isMe: boolean };
export type DailyWinners = { day: string; isToday: boolean; winners: DailyWinner[] };
const WINNER_LIMIT = 40, STREAK_LOOKBACK = 120;
const dayBefore = (day: string, n = 1) => { const d = new Date(day + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() - n); return todayKey(d); };

export async function getDailyWinners(viewerId: string): Promise<DailyWinners> {
  const db = getDb();
  const perfect = sql`${dailyChallenge.total} > 0 and ${dailyChallenge.correct} >= ${dailyChallenge.total}`;
  const on = (day: string) => db
    .select({ userId: dailyChallenge.userId, ms: dailyChallenge.elapsedMs, name: users.name, username: users.username })
    .from(dailyChallenge).innerJoin(users, eq(users.id, dailyChallenge.userId))
    .where(and(eq(dailyChallenge.day, day), perfect))
    .orderBy(dailyChallenge.elapsedMs).limit(WINNER_LIMIT);

  const today = todayKey();
  let day = today, rows = await on(today);
  if (!rows.length) { day = dayBefore(today); rows = await on(day); }
  if (!rows.length) return { day: today, isToday: true, winners: [] };

  const past = await db.select({ userId: dailyChallenge.userId, day: dailyChallenge.day }).from(dailyChallenge)
    .where(and(inArray(dailyChallenge.userId, rows.map((r) => r.userId)), lt(dailyChallenge.day, day),
      sql`${dailyChallenge.day} >= ${dayBefore(day, STREAK_LOOKBACK)}`, perfect));
  const won = new Set(past.map((r) => `${r.userId}|${String(r.day)}`));
  return {
    day, isToday: day === today,
    winners: rows.map((r) => {
      let streak = 1;
      for (let d = dayBefore(day); won.has(`${r.userId}|${d}`); d = dayBefore(d)) streak++;
      return { userId: r.userId, name: r.username || r.name || "Player", secs: Math.round(r.ms / 1000), streak, isMe: r.userId === viewerId };
    }),
  };
}
