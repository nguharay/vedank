"use server";

import { auth } from "@/auth";
import { submitStageResult, submitPuzzleSolved, getLeaderboard } from "@/lib/game/progress";
import { getDailyStatus, submitDaily, getLeagueStanding } from "@/lib/game/league";

async function requireUserId(): Promise<string> {
  const session = await auth();
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!id) throw new Error("Not signed in.");
  return id;
}

export async function finishStageAction(topicId: string, stageN: number, correct: number) {
  const userId = await requireUserId();
  return submitStageResult(userId, topicId, stageN, correct);
}

export async function solvePuzzleAction(puzzleId: string, moves: number) {
  const userId = await requireUserId();
  return submitPuzzleSolved(userId, puzzleId, moves);
}

export async function dailyStatusAction() {
  const userId = await requireUserId();
  return getDailyStatus(userId);
}

export async function submitDailyAction(correct: number, elapsedMs: number) {
  const userId = await requireUserId();
  return submitDaily(userId, correct, elapsedMs);
}

export async function leagueAction() {
  const userId = await requireUserId();
  return getLeagueStanding(userId);
}

export async function leaderboardAction() {
  const userId = await requireUserId();
  return getLeaderboard(userId);
}
