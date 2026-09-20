import { eq, and } from "drizzle-orm";
import { getDb } from "@/db";
import { topicProgress, arenaProgress } from "@/db/schema";
import { TOPICS, PASS_THRESHOLD, QUESTIONS_PER_STAGE } from "./topics";
import { PUZZLES } from "./matchstick";
import type { ProgressState, TopicProgressRow } from "./state";

export type { ProgressState, TopicProgressRow };
export { totalGems, levelInfo } from "./state";

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
