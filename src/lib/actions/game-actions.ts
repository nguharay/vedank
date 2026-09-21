"use server";

import { auth } from "@/auth";
import { submitStageResult, submitPuzzleSolved, getLeaderboard } from "@/lib/game/progress";

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

export async function leaderboardAction() {
  const userId = await requireUserId();
  return getLeaderboard(userId);
}
