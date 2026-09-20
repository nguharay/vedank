import { eq, and } from "drizzle-orm";
import { getDb } from "@/db";
import { topicProgress, arenaProgress, users } from "@/db/schema";
import { TOPICS, PASS_THRESHOLD, QUESTIONS_PER_STAGE } from "./topics";
import { PUZZLES } from "./matchstick";
import type { ProgressState, TopicProgressRow } from "./state";

export type { ProgressState, TopicProgressRow };
export { totalGems, levelInfo } from "./state";

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}
function daysBetween(a: string, b: string) {
  return Math.round((new Date(a + "T00:00:00Z").getTime() - new Date(b + "T00:00:00Z").getTime()) / 86_400_000);
}

export type DailyStreakInfo = { dailyStreak: number; bestDailyStreak: number; isNewDay: boolean };

// Called once per app-open (from the home page server component) — not tied
// to signing in, since a JWT session can persist across days without a
// fresh login. Advances the calendar streak at most once per calendar day.
export async function touchDailyStreak(userId: string): Promise<DailyStreakInfo> {
  const db = getDb();
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = rows[0];
  if (!user) return { dailyStreak: 0, bestDailyStreak: 0, isNewDay: false };

  const today = todayUTC();
  if (user.lastActiveDate === today) {
    return { dailyStreak: user.dailyStreak, bestDailyStreak: user.bestDailyStreak, isNewDay: false };
  }

  const gap = user.lastActiveDate ? daysBetween(today, user.lastActiveDate) : null;
  const nextStreak = gap === 1 ? user.dailyStreak + 1 : 1;
  const nextBest = Math.max(user.bestDailyStreak, nextStreak);

  await db
    .update(users)
    .set({ lastActiveDate: today, dailyStreak: nextStreak, bestDailyStreak: nextBest })
    .where(eq(users.id, userId));

  return { dailyStreak: nextStreak, bestDailyStreak: nextBest, isNewDay: true };
}

export async function loadProgress(userId: string): Promise<ProgressState> {
  const db = getDb();
  const [tRows, aRows] = await Promise.all([
    db.select().from(topicProgress).where(eq(topicProgress.userId, userId)),
    db.select().from(arenaProgress).where(eq(arenaProgress.userId, userId)),
  ]);

  const topics: Record<string, TopicProgressRow> = {};
  for (const t of TOPICS) topics[t.id] = { cleared: 0, stageStars: {} };
  for (const row of tRows) {
    topics[row.topicId] = {
      cleared: row.cleared,
      stageStars: (row.stageStars as Record<string, number>) || {},
    };
  }

  const solved: Record<string, boolean> = {};
  const bestMoves: Record<string, number> = {};
  for (const row of aRows) {
    solved[row.puzzleId] = row.solved;
    if (row.bestMoves != null) bestMoves[row.puzzleId] = row.bestMoves;
  }

  return { topics, arena: { solved, bestMoves } };
}

export type StageResult = {
  stars: number;
  passed: boolean;
  justUnlocked: boolean;
  gemsGained: number;
};

export async function submitStageResult(
  userId: string,
  topicId: string,
  stageN: number,
  correct: number
): Promise<StageResult> {
  const db = getDb();
  const stars = correct >= 5 ? 3 : correct >= 4 ? 2 : correct >= 3 ? 1 : 0;
  const passed = correct >= PASS_THRESHOLD;

  const rows = await db
    .select()
    .from(topicProgress)
    .where(and(eq(topicProgress.userId, userId), eq(topicProgress.topicId, topicId)));
  const existing = rows[0];
  const prevCleared = existing?.cleared ?? 0;
  const prevStars: Record<string, number> = (existing?.stageStars as Record<string, number>) || {};

  const nextStars = { ...prevStars };
  if (stars > (nextStars[String(stageN)] || 0)) nextStars[String(stageN)] = stars;
  const justUnlocked = passed && stageN > prevCleared;
  const nextCleared = justUnlocked ? stageN : prevCleared;

  if (existing) {
    await db
      .update(topicProgress)
      .set({ cleared: nextCleared, stageStars: nextStars, updatedAt: new Date() })
      .where(and(eq(topicProgress.userId, userId), eq(topicProgress.topicId, topicId)));
  } else {
    await db.insert(topicProgress).values({
      userId,
      topicId,
      cleared: nextCleared,
      stageStars: nextStars,
    });
  }

  const gemsGained = correct * 10 + (justUnlocked ? 50 : 0);
  return { stars, passed, justUnlocked, gemsGained };
}

export async function submitPuzzleSolved(userId: string, puzzleId: string, moves: number) {
  const db = getDb();
  const rows = await db
    .select()
    .from(arenaProgress)
    .where(and(eq(arenaProgress.userId, userId), eq(arenaProgress.puzzleId, puzzleId)));
  const existing = rows[0];
  const alreadySolved = existing?.solved ?? false;
  const bestMoves =
    existing?.bestMoves != null ? Math.min(existing.bestMoves, moves) : moves;

  if (existing) {
    await db
      .update(arenaProgress)
      .set({ solved: true, bestMoves, updatedAt: new Date() })
      .where(and(eq(arenaProgress.userId, userId), eq(arenaProgress.puzzleId, puzzleId)));
  } else {
    await db.insert(arenaProgress).values({ userId, puzzleId, solved: true, bestMoves });
  }
  return { alreadySolved, bestMoves };
}

export { QUESTIONS_PER_STAGE, PUZZLES };
