import { eq, and, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { stageOutcome } from "./state";
import { topicProgress, arenaProgress, users, inventory } from "@/db/schema";
import { TOPICS, QUESTIONS_PER_STAGE, STAGE_COUNT, rankFor } from "./topics";
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
function ri(a: number, b: number) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}
// 60% small, 30% medium, 10% jackpot — variable reward on first play of the day.
function rollChestReward(): number {
  const r = Math.random();
  if (r < 0.1) return ri(120, 200);
  if (r < 0.4) return ri(50, 80);
  return ri(20, 40);
}

export type DailyStreakInfo = {
  dailyStreak: number;
  bestDailyStreak: number;
  isNewDay: boolean;
  preferredLang: "en" | "ja";
  bonusGems: number;
  chestReward: number | null;
  /* true when a Streak Freeze was just spent to cover a missed day */
  streakFrozen: boolean;
};

// Called once per app-open (from the home page server component) — not tied
// to signing in, since a JWT session can persist across days without a
// fresh login. Advances the calendar streak at most once per calendar day,
// and on that first visit of the day also rolls a daily mystery chest reward.
export async function touchDailyStreak(userId: string): Promise<DailyStreakInfo> {
  const db = getDb();
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = rows[0];
  if (!user) return { dailyStreak: 0, bestDailyStreak: 0, isNewDay: false, preferredLang: "en", bonusGems: 0, chestReward: null, streakFrozen: false };

  const preferredLang: "en" | "ja" = user.preferredLang === "ja" ? "ja" : "en";
  const today = todayUTC();
  if (user.lastActiveDate === today) {
    return {
      dailyStreak: user.dailyStreak,
      bestDailyStreak: user.bestDailyStreak,
      isNewDay: false,
      preferredLang,
      bonusGems: user.bonusGems,
      chestReward: null,
      streakFrozen: false,
    };
  }

  const gap = user.lastActiveDate ? daysBetween(today, user.lastActiveDate) : null;

  /* A gap of 2 means exactly one day was missed. A held Streak Freeze covers
     it: consume one and carry the streak. Wider gaps are not coverable — a
     freeze forgives a slip, it does not bank a holiday. The conditional UPDATE
     is the whole guard, so two app-opens racing can only spend one freeze. */
  let frozeOver = false;
  if (gap === 2) {
    const spent = await db
      .update(inventory)
      .set({ streakFreezes: sql`${inventory.streakFreezes} - 1`, freezeUsedOn: today, updatedAt: new Date() })
      .where(and(eq(inventory.userId, userId), sql`${inventory.streakFreezes} > 0`))
      .returning({ userId: inventory.userId });
    frozeOver = spent.length > 0;
  }

  const nextStreak = gap === 1 || frozeOver ? user.dailyStreak + 1 : 1;
  const nextBest = Math.max(user.bestDailyStreak, nextStreak);
  const chestReward = rollChestReward();
  const nextBonusGems = user.bonusGems + chestReward;

  await db
    .update(users)
    .set({ lastActiveDate: today, dailyStreak: nextStreak, bestDailyStreak: nextBest, bonusGems: nextBonusGems })
    .where(eq(users.id, userId));

  return {
    dailyStreak: nextStreak,
    bestDailyStreak: nextBest,
    isNewDay: true,
    preferredLang,
    bonusGems: nextBonusGems,
    chestReward,
    streakFrozen: frozeOver,
  };
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
  const { stars, passed } = stageOutcome(correct, stageN, 0);

  const rows = await db
    .select()
    .from(topicProgress)
    .where(and(eq(topicProgress.userId, userId), eq(topicProgress.topicId, topicId)));
  const existing = rows[0];
  const prevCleared = existing?.cleared ?? 0;
  const prevStars: Record<string, number> = (existing?.stageStars as Record<string, number>) || {};

  const nextStars = { ...prevStars };
  if (stars > (nextStars[String(stageN)] || 0)) nextStars[String(stageN)] = stars;
  const { justUnlocked, gemsGained } = stageOutcome(correct, stageN, prevCleared);
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

  return { stars, passed, justUnlocked, gemsGained };
}

/* Carrying a guest's play into their new account. Merges rather than
   overwrites — take the better of each — so signing in on a device where you
   had also played as a guest can never cost you stars. */
export async function importGuestProgress(
  userId: string,
  incoming: ProgressState
): Promise<{ ok: boolean; topics: number }> {
  const db = getDb();
  const entries = Object.entries(incoming?.topics ?? {}).filter(
    ([id]) => typeof id === "string" && id.length > 0 && id.length < 64
  );
  if (!entries.length) return { ok: true, topics: 0 };

  const existing = await db
    .select()
    .from(topicProgress)
    .where(eq(topicProgress.userId, userId));
  const byId = new Map(existing.map((r) => [r.topicId, r]));

  let written = 0;
  for (const [topicId, row] of entries.slice(0, 64)) {
    const cleared = Math.max(0, Math.min(STAGE_COUNT, Number(row?.cleared) || 0));
    const starsIn: Record<string, number> = {};
    for (const [k, v] of Object.entries(row?.stageStars ?? {})) {
      const n = Number(v);
      if (Number.isInteger(n) && n >= 0 && n <= 3) starsIn[String(k)] = n;
    }
    const prev = byId.get(topicId);
    const prevStars: Record<string, number> = (prev?.stageStars as Record<string, number>) || {};
    const merged = { ...prevStars };
    for (const [k, v] of Object.entries(starsIn)) merged[k] = Math.max(merged[k] || 0, v);
    const nextCleared = Math.max(prev?.cleared ?? 0, cleared);

    if (prev) {
      await db
        .update(topicProgress)
        .set({ cleared: nextCleared, stageStars: merged, updatedAt: new Date() })
        .where(and(eq(topicProgress.userId, userId), eq(topicProgress.topicId, topicId)));
    } else {
      await db.insert(topicProgress).values({ userId, topicId, cleared: nextCleared, stageStars: merged });
    }
    written++;
  }
  return { ok: true, topics: written };
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

export type LeaderboardEntry = {
  userId: string;
  name: string;
  gems: number;
  level: number;
  rank: string;
  dailyStreak: number;
};

export async function getLeaderboard(
  currentUserId: string,
  limit = 20
): Promise<{ top: LeaderboardEntry[]; me: (LeaderboardEntry & { position: number }) | null }> {
  const db = getDb();
  const [userRows, tRows, aRows] = await Promise.all([
    db.select({ id: users.id, name: users.name, dailyStreak: users.dailyStreak, bonusGems: users.bonusGems }).from(users),
    db.select().from(topicProgress),
    db.select().from(arenaProgress),
  ]);

  const gemsByUser = new Map<string, number>();
  for (const u of userRows) gemsByUser.set(u.id, u.bonusGems);
  for (const row of tRows) {
    const stars = (row.stageStars as Record<string, number>) || {};
    let g = row.cleared * 50;
    for (const v of Object.values(stars)) g += (v || 0) * 25;
    gemsByUser.set(row.userId, (gemsByUser.get(row.userId) || 0) + g);
  }
  for (const row of aRows) {
    if (row.solved) gemsByUser.set(row.userId, (gemsByUser.get(row.userId) || 0) + 40);
  }

  const entries: LeaderboardEntry[] = userRows.map((u) => {
    const gems = gemsByUser.get(u.id) || 0;
    const level = Math.floor(gems / 150) + 1;
    return { userId: u.id, name: u.name, gems, level, rank: rankFor(level), dailyStreak: u.dailyStreak };
  });
  entries.sort((a, b) => b.gems - a.gems);

  const top = entries.slice(0, limit);
  const idx = entries.findIndex((e) => e.userId === currentUserId);
  const me = idx >= 0 ? { ...entries[idx], position: idx + 1 } : null;

  return { top, me };
}

export { QUESTIONS_PER_STAGE, PUZZLES };
