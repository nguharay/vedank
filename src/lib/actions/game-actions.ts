"use server";

import { auth } from "@/auth";
import { submitStageResult, importGuestProgress, submitPuzzleSolved, getLeaderboard } from "@/lib/game/progress";
import { getDailyStatus, submitDaily, getLeagueStanding } from "@/lib/game/league";
import {
  getQuests, reportQuestEvent, claimQuest, getInventory, getWallet,
  buyItem, consumeItem, recordMistake, getMistakes, countMistakes, fixMistake, reviewStats,
} from "@/lib/game/engagement";
import type { QuestEvent } from "@/lib/game/quests";
import {
  ensureFriendCode, addFriendByCode, removeFriend, listFriends,
  createChallenge, listChallenges, answerChallenge, pendingChallengeCount,
  friendIdsOf, displayName,
} from "@/lib/game/friends";
import {
  createClassroom, myClassrooms, joinClassroom, leaveClassroom, myClassMemberships,
  classRoster, setAssignment, setClassOpen, removeStudent,
} from "@/lib/game/classroom";
import {
  createCompetition, createFriendCompetition, endCompetition, visibleCompetitions, competitionsForClass,
  startCompetition, submitCompetition, leaderboard,
} from "@/lib/game/competition";
import { pushConfigured, saveSubscription, removeSubscription, sendTo } from "@/lib/game/push";
import { saveOverride } from "@/lib/game/overrides";
import { getAdminSession } from "@/lib/admin";
import { TOPIC_BY_ID } from "@/lib/game/topics";

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

export async function importGuestProgressAction(progress: unknown) {
  const userId = await requireUserId();
  return importGuestProgress(userId, progress as Parameters<typeof importGuestProgress>[1]);
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
  const res = await createChallenge(userId, toUserId, score, level);
  /* Awaited so a serverless invocation does not end mid-send, but its own
     failures are swallowed — the duel exists whether or not a phone hears
     about it. */
  if (res.ok) {
    try {
      const me = await displayName(userId);
      await sendTo(toUserId, {
        title: `${me || "友だち"} さんから挑戦状`,
        body: `${Math.floor(score)}点に挑戦しよう！ · Beat ${Math.floor(score)} to win`,
        url: "/",
        tag: "duel",
      });
    } catch {}
  }
  return res;
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

/* ---------- topic overrides (admin edits lesson text) ---------- */

export async function saveTopicOverrideAction(topicId: string, data: unknown) {
  /* Admin only — checked on the server, not by whether the button was drawn. */
  const admin = await getAdminSession();
  if (!admin) return { ok: false as const, error: "Not allowed." };
  if (typeof topicId !== "string" || !TOPIC_BY_ID[topicId]) return { ok: false as const, error: "Unknown topic." };
  const saved = await saveOverride(topicId, data, admin.email);
  return { ok: true as const, data: saved };
}

/* ---------- push notifications ---------- */

export async function pushStatusAction() {
  /* No session needed to know whether the feature exists at all. */
  return { configured: pushConfigured(), publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "" };
}

export async function savePushSubscriptionAction(sub: unknown) {
  const userId = await requireUserId();
  return saveSubscription(userId, sub as Parameters<typeof saveSubscription>[1]);
}

export async function removePushSubscriptionAction(endpoint: string) {
  await requireUserId();
  await removeSubscription(String(endpoint || ""));
  return { ok: true };
}

/* ---------- competitions ---------- */

export async function createCompetitionAction(
  classId: string, name: string, level: string, durationSec: number, questionCount?: number
) {
  const userId = await requireUserId();
  return createCompetition(userId, classId, name, level, durationSec, questionCount);
}

/* A player hosting a race for their friends. No classId — the host's friends
   list is the entry list. */
export async function createFriendCompetitionAction(
  name: string, level: string, durationSec: number, questionCount?: number
) {
  const userId = await requireUserId();
  const res = await createFriendCompetition(userId, name, level, durationSec, questionCount);
  /* A race nobody knows about is a race of one. */
  if (res.ok && res.id && res.notify) {
    try {
      const [host, ids] = await Promise.all([displayName(userId), friendIdsOf(userId)]);
      const n = res.notify;
      await Promise.all(
        ids.slice(0, 50).map((id) =>
          sendTo(id, {
            title: `${host || "友だち"} さんがレースを開催！`,
            body: `${n.name} · ${n.levelName} — ${n.minutes}分`,
            url: `/r/${res.id}`,
            tag: "race",
          })
        )
      );
    } catch {}
  }
  return res;
}

export async function endCompetitionAction(competitionId: string) {
  const userId = await requireUserId();
  return endCompetition(userId, competitionId);
}

export async function competitionsAction() {
  const userId = await requireUserId();
  return { rows: await visibleCompetitions(userId) };
}

export async function classCompetitionsAction(classId: string) {
  const userId = await requireUserId();
  return competitionsForClass(userId, classId);
}

export async function startCompetitionAction(competitionId: string) {
  const userId = await requireUserId();
  return startCompetition(userId, competitionId);
}

export async function submitCompetitionAction(competitionId: string, answers: (number | null)[]) {
  const userId = await requireUserId();
  return submitCompetition(userId, competitionId, answers);
}

export async function competitionBoardAction(competitionId: string) {
  const userId = await requireUserId();
  return leaderboard(userId, competitionId);
}
