"use server";

import { auth } from "@/auth";
import { submitStageResult, submitPuzzleSolved, getLeaderboard } from "@/lib/game/progress";
import { getDailyStatus, submitDaily, getLeagueStanding } from "@/lib/game/league";
import {
  getQuests, reportQuestEvent, claimQuest, getInventory, getWallet,
  buyItem, consumeItem, recordMistake, getMistakes, countMistakes, fixMistake, reviewStats,
} from "@/lib/game/engagement";
import type { QuestEvent } from "@/lib/game/quests";
import {
  ensureFriendCode, addFriendByCode, removeFriend, listFriends,
  createChallenge, listChallenges, answerChallenge, pendingChallengeCount,
} from "@/lib/game/friends";
import {
  createClassroom, myClassrooms, joinClassroom, leaveClassroom, myClassMemberships,
  classRoster, setAssignment, setClassOpen, removeStudent,
} from "@/lib/game/classroom";

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

/* ---------- engagement loop ---------- */

export async function questsAction() {
  const userId = await requireUserId();
  return getQuests(userId);
}

export async function reportQuestAction(event: QuestEvent, amount = 1) {
  const userId = await requireUserId();
  return reportQuestEvent(userId, event, amount);
}

export async function claimQuestAction(questId: string) {
  const userId = await requireUserId();
  return claimQuest(userId, questId);
}

export async function shopStateAction() {
  const userId = await requireUserId();
  const [inv, wallet] = await Promise.all([getInventory(userId), getWallet(userId)]);
  return { inventory: inv, balance: wallet.balance };
}

export async function buyItemAction(itemId: string) {
  const userId = await requireUserId();
  return buyItem(userId, itemId);
}

export async function consumeItemAction(itemId: string) {
  const userId = await requireUserId();
  return consumeItem(userId, itemId);
}

export async function recordMistakeAction(topicId: string, prompt: string, answer: number) {
  const userId = await requireUserId();
  await recordMistake(userId, topicId, prompt, answer);
}

export async function reviewListAction() {
  const userId = await requireUserId();
  const [rows, total, stats] = await Promise.all([
    getMistakes(userId),
    countMistakes(userId),
    reviewStats(userId),
  ]);
  return { rows, total, stats };
}

export async function fixMistakeAction(prompt: string) {
  const userId = await requireUserId();
  return fixMistake(userId, prompt);
}

/* ---------- friends & duels ---------- */

export async function friendCodeAction() {
  const userId = await requireUserId();
  return { code: await ensureFriendCode(userId) };
}

export async function addFriendAction(code: string) {
  const userId = await requireUserId();
  return addFriendByCode(userId, code);
}

export async function removeFriendAction(friendId: string) {
  const userId = await requireUserId();
  await removeFriend(userId, friendId);
}

export async function friendsAction() {
  const userId = await requireUserId();
  const [friends, duels, pending] = await Promise.all([
    listFriends(userId),
    listChallenges(userId),
    pendingChallengeCount(userId),
  ]);
  return { friends, duels, pending };
}

export async function challengeAction(toUserId: string, score: number, level: number) {
  const userId = await requireUserId();
  return createChallenge(userId, toUserId, score, level);
}

export async function answerChallengeAction(challengeId: string, score: number) {
  const userId = await requireUserId();
  return answerChallenge(userId, challengeId, score);
}

/* ---------- classroom ---------- */

export async function createClassAction(name: string) {
  const userId = await requireUserId();
  return createClassroom(userId, name);
}

export async function myClassesAction() {
  const userId = await requireUserId();
  const [teaching, enrolled] = await Promise.all([
    myClassrooms(userId),
    myClassMemberships(userId),
  ]);
  return { teaching, enrolled };
}

export async function joinClassAction(code: string) {
  const userId = await requireUserId();
  return joinClassroom(userId, code);
}

export async function leaveClassAction(classId: string) {
  const userId = await requireUserId();
  await leaveClassroom(userId, classId);
}

export async function rosterAction(classId: string) {
  const userId = await requireUserId();
  return classRoster(userId, classId);
}

export async function setAssignmentAction(classId: string, topicId: string | null, note: string | null) {
  const userId = await requireUserId();
  return setAssignment(userId, classId, topicId, note);
}

export async function setClassOpenAction(classId: string, open: boolean) {
  const userId = await requireUserId();
  return setClassOpen(userId, classId, open);
}

export async function removeStudentAction(classId: string, studentId: string) {
  const userId = await requireUserId();
  return removeStudent(userId, classId, studentId);
}
