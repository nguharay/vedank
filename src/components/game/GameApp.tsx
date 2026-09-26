"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { signOut } from "next-auth/react";
import {
  TOPICS,
  TOPIC_BY_ID,
  STAGE_COUNT,
  STAGE_DIFF,
  BLITZ_TOPICS,
  BLITZ_LEVELS,
  blitzDiff,
  blitzLevel,
  QUESTIONS_PER_STAGE,
  makeDistractors,
  RANKS_JA,
  type Difficulty,
  type Problem,
  type Topic,
  type Lang,
} from "@/lib/game/topics";
import {
  PUZZLES,
  TRAY_SIZE,
  slotsFor,
  cloneGlyphs,
  currentEquationText,
  evalEquation,
  type Glyph,
} from "@/lib/game/matchstick";
import {
  topicProgressOf,
  stageUnlocked,
  totalGems,
  levelInfo,
  stageOutcome,
  type ProgressState,
} from "@/lib/game/state";
import { finishStageAction, solvePuzzleAction, leaderboardAction, dailyStatusAction, submitDailyAction, leagueAction } from "@/lib/actions/game-actions";
import {
  questsAction, reportQuestAction, claimQuestAction, shopStateAction, buyItemAction,
  importGuestProgressAction,
  consumeItemAction, recordMistakeAction, reviewListAction, fixMistakeAction,
} from "@/lib/actions/game-actions";
import { SHOP_ITEMS, type QuestEvent } from "@/lib/game/quests";
import {
  friendCodeAction, addFriendAction, removeFriendAction, friendsAction,
  challengeAction, answerChallengeAction,
} from "@/lib/actions/game-actions";
import type { Friend, ChallengeRow } from "@/lib/game/friends";
import { myClassesAction, joinClassAction, leaveClassAction } from "@/lib/actions/game-actions";
import {
  competitionsAction, startCompetitionAction, submitCompetitionAction, competitionBoardAction,
  createFriendCompetitionAction, endCompetitionAction, saveTopicOverrideAction,
  pushStatusAction, savePushSubscriptionAction, removePushSubscriptionAction,
  tttCreateAction, tttJoinAction, tttRoomAction, tttMoveAction, tttRematchAction, tttChallengeFriendAction,
} from "@/lib/actions/game-actions";
import type { CompetitionSummary, CompQuestion, CompRow } from "@/lib/game/competition";
import { COMP_LEVELS } from "@/lib/game/competition";
import type { QuestState, InventoryState, ReviewStats } from "@/lib/game/engagement";
import type { LeaderboardEntry } from "@/lib/game/progress";
import { ACHIEVEMENTS } from "@/lib/game/achievements";
import { Mascot } from "./Mascot";
import { BOOK_DIAGRAM_EQ } from "./BookDiagrams";
import { TRICK_BY_ID } from "@/lib/game/tricks";
import { dailyQuestions, todayKey, seededRandom, withSeededRandom, type DailyQuestion } from "@/lib/game/daily";
import { applyOverride, type OverrideMap, type TopicOverride } from "@/lib/game/overrides";
import { newGame as tttNewGame, play as tttPlay, pass as tttPass, cpuMove as tttCpu, turnSeconds as tttTurnSeconds, normaliseRoomCode, type TTTState, type TTTLevel, type Mark } from "@/lib/game/ttt";
import type { RoomView } from "@/lib/game/tttOnline";
import { InterestForm, ClassesHero } from "@/components/InterestForm";
import { buildPopRound, popUpMs, popPoints, type PopRound } from "@/lib/game/minigames";
import { buildMatchRound, isPair, matchScore, buildBiggerPair, biggerScore,
  buildOddRound, digitSum, buildSortRound, sortedIds,
  dailySeed, dailyGameId, dailyGameKey, QUICK_GAMES, quickGame,
  type QuickRound,
  type MatchTile, type BiggerPair, type OddRound, type SortRound } from "@/lib/game/minigames";
import type { DailyStatus, LeagueStanding } from "@/lib/game/league";
import { useConfetti } from "./useConfetti";
import { useSound } from "./useSound";
import { useTheme } from "./useTheme";
import { useSkins, SKINS, skinName, skinBlurb, skinUnlockLabel } from "./useSkins";
import { Buddy } from "./Buddy";
import { useBuddy, line } from "./useBuddy";
import { makeQuoteCycle, quoteText } from "@/lib/game/quotes";
import { useBuddyPos } from "./useBuddyPos";
import { ShareSheet, type ShareFocus } from "./ShareCard";
import { useLang, UI } from "./i18n";
import { ri, shuffle, weightedPick, urlBase64ToUint8Array, RollUp, fmt, sameLoc, haptic, rankLabel, SPRINT_LEN, BLITZ_DEFAULT_LEVEL, BLITZ_BOOST_MS } from "./util";
import type { View, Mode, Loc } from "./util";
import { HomeView, PracticeView, ArenaView, TopicView, StageMapView, DailyView, TricksView, BlitzView } from "./views";

/* A reward that snaps into place reads as a label. One that climbs reads as
   something you earned — the whole difference is ~600ms. */

/* Blitz pacing now comes from the chosen level (see BLITZ_LEVELS in topics.ts)
   rather than one fixed ramp. */

/* "tomorrow" / "in 3 days" — a date stamp would mean nothing to a child, and
   the exact hour is noise when reviews land at the start of a day. */

export function GameApp({
  initialProgress,
  dailyStreak,
  initialLang,
  initialBonusGems,
  dailyChestReward,
  user,
  isAdmin = false,
  guest = false,
  overrides = {},
  classesEnabled = false,
}: {
  initialProgress: ProgressState;
  dailyStreak: number;
  initialLang?: "en" | "ja";
  initialBonusGems?: number;
  dailyChestReward?: number | null;
  user: { name: string | null; email: string | null };
  /* Class-enquiry links show only once the owner's sheet (SHEET_WEBHOOK_URL) is configured, so a form never fails in front of a parent. */
  classesEnabled?: boolean;
  /* Server-resolved; the /admin page re-checks it, so this only decides
     whether the menu row is drawn. */
  isAdmin?: boolean;
  /* Playing without an account. Nothing is written to the server — progress
     lives in localStorage until they sign up — and the parts that are
     meaningless alone (friends, classes, leagues, the shop) stay hidden. */
  guest?: boolean;
  /* The admin's edits to lesson text, keyed by topic id. */
  overrides?: OverrideMap;
}) {
  const [progress, setProgress] = useState<ProgressState>(initialProgress);
  const [view, setView] = useState<View>("home");
  const GAME_VIEWS: View[] = ["match", "bigger", "memory", "odd", "sortg", "quick", "ttt", "pop"];
  const [quickId, setQuickId] = useState<string>("tf");
  const [menuOpen, setMenuOpen] = useState(false);
  const [skinsOpen, setSkinsOpen] = useState(false);
  const [bonusGems, setBonusGems] = useState(initialBonusGems || 0);
  const [chestReward, setChestReward] = useState<number | null>(dailyChestReward ?? null);
  const [chestOpened, setChestOpened] = useState(false);
  const theme = useTheme();
  const skin = useSkins();
  const langHook = useLang(initialLang);
  const lang: Lang = langHook.lang;
  const t = UI[lang];
  const [currentTopicId, setCurrentTopicId] = useState<string | null>(null);
  /* Admin edits to lesson prose sit over the code's defaults. Applied here,
     once, so the lesson page, the hint sheet and the recap all agree. */
  const [ovr, setOvr] = useState<OverrideMap>(overrides);
  const currentTopic: Topic | null = currentTopicId
    ? applyOverride(TOPIC_BY_ID[currentTopicId], ovr[currentTopicId])
    : null;
  async function saveOverride(topicId: string, data: TopicOverride) {
    const res = await saveTopicOverrideAction(topicId, data);
    if (res.ok) {
      setOvr((m) => ({ ...m, [topicId]: res.data }));
      spawnToast(lang === "ja" ? "保存しました" : "Saved", null);
    } else {
      spawnToast(res.error ?? "Could not save", null);
    }
    return res.ok;
  }

  const [hearts, setHearts] = useState(5);
  const [bestStreakEver, setBestStreakEver] = useState(0);
  const [gemPop, setGemPop] = useState(false);
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [leaderboard, setLeaderboard] = useState<{ top: LeaderboardEntry[]; me: (LeaderboardEntry & { position: number }) | null } | null>(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  useEffect(() => {
    dailyStatusAction().then(setDailyStatus).catch(() => {});
  }, []);

  async function toggleLeague() {
    const next = !leagueOpen;
    setLeagueOpen(next);
    if (next) {
      setLeagueLoading(true);
      try {
        setLeague(await leagueAction());
      } finally {
        setLeagueLoading(false);
      }
    }
  }

  function startDaily() {
    if (dailyStatus?.played) return;
    setDailyQs(dailyQuestions(todayKey()));
    setDailyIdx(0);
    setDailyCorrect(0);
    setDailyPick(null);
    setDailyDone(null);
    dailyStartRef.current = Date.now();
    setView("daily");
  }

  async function onDailyPick(v: number) {
    if (dailyPick !== null) return;
    const q = dailyQs[dailyIdx];
    const ok = v === q.problem.answer;
    setDailyPick(v);
    if (ok) {
      setDailyCorrect((c) => c + 1);
      sound.correct();
      haptic(14);
    } else {
      sound.wrong();
      haptic([20, 40, 20]);
    }
    const nextCorrect = dailyCorrect + (ok ? 1 : 0);
    setTimeout(async () => {
      if (dailyIdx + 1 >= dailyQs.length) {
        const elapsed = Date.now() - dailyStartRef.current;
        const res = await submitDailyAction(nextCorrect, elapsed);
        fireQuest("daily_played");
        setDailyDone({ points: res.points, correct: res.correct });
        setDailyStatus({ day: todayKey(), played: true, correct: res.correct, total: dailyQs.length, points: res.points });
        setLeague(null);
        if (res.correct >= 6) confetti.burstCenter();
      } else {
        setDailyIdx((i) => i + 1);
        setDailyPick(null);
      }
    }, 750);
  }

  async function toggleLeaderboard() {
    const next = !leaderboardOpen;
    setLeaderboardOpen(next);
    if (next && !leaderboard) {
      setLeaderboardLoading(true);
      try {
        const data = await leaderboardAction();
        setLeaderboard(data);
      } finally {
        setLeaderboardLoading(false);
      }
    }
  }
  /* Decorative particles. Seeded rather than random so the server and the
     client draw the same ones — that is what let this stop being a mount
     effect that set state. Nobody can tell seeded confetti from random. */
  const sparkles = useMemo(() => {
    const rnd = seededRandom(0x5ea1);
    const r = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
    return Array.from({ length: 14 }, () => ({ left: r(0, 98), top: r(0, 96), delay: rnd() * 6, size: 10 + rnd() * 14 }));
  }, []);
  const [toasts, setToasts] = useState<{ id: number; x: number; y: number; text: string }[]>([]);
  const toastIdRef = useRef(0);

  const confetti = useConfetti();
  const sound = useSound();
  const practiceCardRef = useRef<HTMLDivElement | null>(null);
  const puzzleSvgRef = useRef<SVGSVGElement | null>(null);
  const typeInputRef = useRef<HTMLInputElement | null>(null);

  function spawnToast(text: string, fromEl: HTMLElement | null) {
    const r = fromEl?.getBoundingClientRect();
    const x = r ? r.left + r.width / 2 : window.innerWidth / 2;
    const y = r ? r.top : window.innerHeight / 3;
    const id = ++toastIdRef.current;
    setToasts((t) => [...t, { id, x, y, text }]);
    setTimeout(() => setToasts((t) => t.filter((tt) => tt.id !== id)), 1000);
  }

  const sparkleGlyphs = ["✦", "✧", "⋆", "✺", "✴"];

  const sakura = useMemo(() => {
    const rnd = seededRandom(0x5a4a);
    const r = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
    return Array.from({ length: 10 }, () => ({
      left: r(0, 96), delay: rnd() * 8, duration: 9 + rnd() * 6, size: 34 + rnd() * 18, sway: r(-40, 40),
    }));
  }, []);

  const li = useMemo(() => levelInfo(progress), [progress]);
  const gems = useMemo(() => totalGems(progress) + bonusGems, [progress, bonusGems]);
  const solvedCount = Object.values(progress.arena.solved).filter(Boolean).length;
  const bossClears = useMemo(
    () => Object.values(progress.topics).filter((p) => p.cleared >= STAGE_COUNT).length,
    [progress]
  );
  const activeSkin = SKINS.find((s) => s.id === skin.skinId) || SKINS[0];

  /* The buddy: floats over the app, speaks only when something just happened. */
  const buddy = useBuddy();
  /* Tapping the buddy shows a quote from the books — maths, encouragement, or a
     line about India and the sutras — a different one each time. Event lines
     (combos, cleared stages) still interrupt on their own. */
  const nextQuote = useRef(makeQuoteCycle());
  const [quoteBy, setQuoteBy] = useState<string | null>(null);
  /* Until it has been tapped once, the buddy wears a hint badge — a character
     in the corner with no affordance is a feature nobody finds. */
  const [buddyTapped, setBuddyTapped] = useState(false);
  /* Drag it anywhere; position is remembered. tapBuddy is declared below, so the
     handler reads it through a ref rather than capturing it before it exists. */
  const tapRef = useRef<() => void>(() => {});
  const buddyPos = useBuddyPos(() => tapRef.current());

  function tapBuddy() {
    setBuddyTapped(true);
    if (buddy.say) {
      buddy.quiet();
      setQuoteBy(null);
      return;
    }
    const q = nextQuote.current();
    setQuoteBy(q.by ?? null);
    buddy.speak({
      text: quoteText(q, lang === "ja"),
      mood: q.kind === "hope" ? "excited" : "happy",
      hold: 9000,
    });
  }
  const ja = lang === "ja";
  const sayLine = useCallback(
    (key: Parameters<typeof line>[0]) => {
      setQuoteBy(null);
      buddy.speak(line(key, ja));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ja, buddy.speak]
  );

  const rank = lang === "ja" ? RANKS_JA[li.rank] || li.rank : li.rank;

  /* ---------- engagement loop: quests, shop wallet, mistake review ---------- */
  const [quests, setQuests] = useState<QuestState[]>([]);
  const [questsOpen, setQuestsOpen] = useState(false);
  const [inventory, setInventory] = useState<InventoryState | null>(null);
  const [gemBalance, setGemBalance] = useState<number | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [shopBusy, setShopBusy] = useState<string | null>(null);
  const [shopNote, setShopNote] = useState<string | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [reviewQueue, setReviewQueue] = useState<Problem[]>([]);
  const [reviewIdx, setReviewIdx] = useState(0);
  const [reviewOptions, setReviewOptions] = useState<number[]>([]);
  const [reviewFeedback, setReviewFeedback] = useState<"ok" | "bad" | null>(null);
  const [reviewFixed, setReviewFixed] = useState(0);
  const [hintOpen, setHintOpen] = useState(false);
  /* correct answers are tallied per stage and reported once at the end rather
     than one round trip per question */
  const stageCorrectRef = useRef(0);
  /* consecutive misses on the current question, so the buddy escalates its help */
  const wrongRunRef = useRef(0);

  const claimableQuests = quests.filter((q) => q.done && !q.claimed).length;

  async function refreshQuests() {
    try {
      setQuests((await questsAction()).quests);
    } catch {}
  }
  async function refreshShop() {
    try {
      const st = await shopStateAction();
      setInventory(st.inventory);
      setGemBalance(st.balance);
    } catch {}
  }
  async function refreshReview() {
    try {
      const r = await reviewListAction();
      setReviewCount(r.total);
      setReviewStats(r.stats);
    } catch {}
  }

  tapRef.current = tapBuddy;

  /* A quote once, a beat after the app settles, so a first-time player sees what
     the buddy does instead of having to guess that it is tappable. */
  useEffect(() => {
    if (buddy.hidden) return;
    const id = setTimeout(() => {
      const q = nextQuote.current();
      setQuoteBy(q.by ?? null);
      buddy.speak({ text: quoteText(q, lang === "ja"), mood: "happy", hold: 11000 });
    }, 1600);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* One parallel load on mount; each value is also refreshed by the action that
     changes it, so the panels never show a stale number. The alive flag keeps a
     slow response from setting state on an unmounted component. */
  useEffect(() => {
    if (guest) return;            /* nothing of this exists without an account */
    let alive = true;
    (async () => {
      try {
        const [q, sh, rv, fr] = await Promise.all([
          questsAction(), shopStateAction(), reviewListAction(), friendsAction(),
        ]);
        if (!alive) return;
        setQuests(q.quests);
        setInventory(sh.inventory);
        setGemBalance(sh.balance);
        setReviewCount(rv.total);
        setReviewStats(rv.stats);
        setFriends(fr.friends);
        setDuels(fr.duels);
        setPendingDuels(fr.pending);
        refreshClasses();
        refreshComps();
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, [guest]);

  /* Fire-and-forget: a quest that fails to record must never break gameplay. */
  function fireQuest(event: QuestEvent, amount = 1) {
    if (guest) return;
    reportQuestAction(event, amount)
      .then((r) => setQuests(r.quests))
      .catch(() => {});
  }

  async function onClaimQuest(id: string) {
    const res = await claimQuestAction(id);
    if (res.ok) {
      setBonusGems((g) => g + res.reward);
      spawnToast(`+${res.reward} 💎`, null);
      confetti.burstCenter(70, 0.4);
      sound.correct();
    }
    await Promise.all([refreshQuests(), refreshShop()]);
  }

  async function onBuy(itemId: string) {
    setShopBusy(itemId);
    setShopNote(null);
    const res = await buyItemAction(itemId);
    if (res.ok) {
      setInventory(res.inventory ?? null);
      setGemBalance(res.balance ?? null);
      sound.correct();
      const item = SHOP_ITEMS.find((i) => i.id === itemId);
      spawnToast(`${item?.icon ?? "✅"} ${lang === "ja" ? "購入しました" : "Bought!"}`, null);
    } else {
      setShopNote(res.error ?? null);
      sound.wrong();
    }
    setShopBusy(null);
  }

  /* ---------- classroom (the child's side) ---------- */
  type Enrolled = { id: string; name: string; teacherName: string; assignedTopicId: string | null; assignedNote: string | null };
  const [classOpen, setClassOpen] = useState(false);
  const [enrolled, setEnrolled] = useState<Enrolled[]>([]);
  const [teachingCount, setTeachingCount] = useState(0);
  const [classCode, setClassCode] = useState("");
  const [classNote, setClassNote] = useState<string | null>(null);

  async function refreshClasses() {
    try {
      const r = await myClassesAction();
      setEnrolled(r.enrolled);
      setTeachingCount(r.teaching.length);
    } catch {}
  }

  async function onJoinClass() {
    if (!classCode.trim()) return;
    const res = await joinClassAction(classCode);
    if (res.ok) {
      setClassCode("");
      setClassNote(ja ? `${res.name} に参加しました！` : `Joined ${res.name}!`);
      sound.correct();
      refreshClasses();
    } else {
      setClassNote(res.error ?? null);
      sound.wrong();
    }
  }

  /* The assignment the child should see, if a teacher has set one. */
  const assignment = enrolled.find((e) => e.assignedTopicId);
  const assignedTopic = assignment ? TOPIC_BY_ID[assignment.assignedTopicId!] : undefined;

  /* ---------- competitions (the student's side) ---------- */
  const [comps, setComps] = useState<CompetitionSummary[]>([]);
  const [compQs, setCompQs] = useState<CompQuestion[]>([]);
  const [compAnswers, setCompAnswers] = useState<(number | null)[]>([]);
  const [compIdx, setCompIdx] = useState(0);
  const [compId, setCompId] = useState<string | null>(null);
  const [compName, setCompName] = useState("");
  const [compEndsAt, setCompEndsAt] = useState<number | null>(null);
  const [compLeft, setCompLeft] = useState(0);
  const [compResult, setCompResult] = useState<{ correct: number; total: number; score: number; rank: number } | null>(null);
  const [compBoard, setCompBoard] = useState<{ name: string; rows: CompRow[] } | null>(null);
  const compSubmittedRef = useRef(false);

  const liveComps = comps.filter((c) => c.status === "live" && c.myScore === null);

  /* Competitions split by where they came from: the class sheet shows class
     races, the friends sheet shows friends races. */
  const classComps = comps.filter((c) => c.scope !== "friends");
  const friendComps = comps.filter((c) => c.scope === "friends");
  const myLiveRace = friendComps.find((c) => c.hostedByMe && c.status === "live") ?? null;

  const [raceFormOpen, setRaceFormOpen] = useState(false);
  const [raceName, setRaceName] = useState("");
  const [raceLevel, setRaceLevel] = useState("easy");
  const [raceMinutes, setRaceMinutes] = useState(3);
  const [raceNote, setRaceNote] = useState<string | null>(null);

  async function onHostRace() {
    const name = raceName.trim() || (lang === "ja" ? "フレンド対決" : "Friends race");
    const res = await createFriendCompetitionAction(name, raceLevel, raceMinutes * 60);
    if (!res.ok) {
      setRaceNote(res.error ?? null);
      return;
    }
    setRaceNote(null);
    setRaceName("");
    setRaceFormOpen(false);
    await refreshComps();
  }

  const [copiedRace, setCopiedRace] = useState<string | null>(null);
  async function onShareRace(id: string) {
    const url = `${window.location.origin}/r/${id}`;
    const text = lang === "ja" ? "レースに参加してね！" : "Race me on Sutra Sprint!";
    /* The native sheet where there is one — on a phone this is the difference
       between sharing and copy-then-hunt-for-the-app. */
    try {
      if (navigator.share) {
        await navigator.share({ title: "Sutra Sprint", text, url });
        return;
      }
    } catch {
      return; /* the user dismissed the sheet */
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiedRace(id);
      setTimeout(() => setCopiedRace(null), 1600);
    } catch {}
  }

  /* Rematch: a duel's score is fixed when it is created, so a rematch is not
     a row to insert — it is "play Blitz now at that level, and send the
     result to that person". Remember who, then fire it off when the run ends. */
  const rematchRef = useRef<{ id: string; name: string } | null>(null);
  function onRematch(friendId: string, name: string, level: number) {
    rematchRef.current = { id: friendId, name };
    setFriendsOpen(false);
    startBlitz(level);
  }

  async function onEndRace(id: string) {
    await endCompetitionAction(id);
    await refreshComps();
  }

  async function refreshComps() {
    try {
      setComps((await competitionsAction()).rows);
    } catch {}
  }

  async function beginCompetition(c: CompetitionSummary) {
    const res = await startCompetitionAction(c.id);
    if (!res.ok) {
      setClassNote(res.error);
      return;
    }
    compSubmittedRef.current = false;
    setCompId(c.id);
    setCompName(res.name);
    setCompQs(res.questions);
    setCompAnswers(new Array(res.questions.length).fill(null));
    setCompIdx(0);
    setCompResult(null);
    setCompEndsAt(Date.now() + res.durationSec * 1000);
    setCompLeft(res.durationSec * 1000);
    setClassOpen(false);
    setFriendsOpen(false);
    setView("comp");
  }

  /* One submit per attempt, whether it comes from the last question or the
     clock running out. */
  const finishCompetition = useCallback(
    async (answers: (number | null)[]) => {
      if (!compId || compSubmittedRef.current) return;
      compSubmittedRef.current = true;
      setCompEndsAt(null);
      const res = await submitCompetitionAction(compId, answers);
      if (res.ok) {
        setCompResult({
          correct: res.correct ?? 0,
          total: answers.length,
          score: res.score ?? 0,
          rank: res.rank ?? 0,
        });
        confetti.burstCenter(120, 0.5);
        sound.levelUp();
      }
      refreshComps();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [compId]
  );

  /* The clock. Server-side elapsed is what actually counts; this is the display
     and the auto-submit. */
  useEffect(() => {
    if (view !== "comp" || compEndsAt === null) return;
    const id = setInterval(() => {
      const left = compEndsAt - Date.now();
      setCompLeft(Math.max(0, left));
      if (left <= 0) finishCompetition(compAnswers);
    }, 200);
    return () => clearInterval(id);
  }, [view, compEndsAt, compAnswers, finishCompetition]);

  function onCompPick(value: number) {
    const next = [...compAnswers];
    next[compIdx] = value;
    setCompAnswers(next);
    sound.click();
    if (compIdx + 1 >= compQs.length) finishCompetition(next);
    else setCompIdx(compIdx + 1);
  }

  async function openCompBoard(id: string) {
    const res = await competitionBoardAction(id);
    if (res.ok) setCompBoard({ name: res.name ?? "", rows: res.rows ?? [] });
    else setClassNote(res.error ?? null);
  }

  /* ---------- friends & duels ---------- */
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [friendCode, setFriendCode] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [duels, setDuels] = useState<ChallengeRow[]>([]);
  const [pendingDuels, setPendingDuels] = useState(0);
  const [addCode, setAddCode] = useState("");
  const [friendNote, setFriendNote] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  /* set while a Blitz run is answering a specific duel */
  const [activeDuelId, setActiveDuelId] = useState<string | null>(null);
  const [duelResult, setDuelResult] = useState<{ won: boolean; opponent: string } | null>(null);

  const openDuels = duels.filter((d) => d.incoming && d.status === "open");

  async function refreshFriends() {
    try {
      const r = await friendsAction();
      setFriends(r.friends);
      setDuels(r.duels);
      setPendingDuels(r.pending);
    } catch {}
  }

  async function openFriends() {
    setFriendsOpen(true);
    setFriendNote(null);
    refreshFriends();
    if (!friendCode) {
      try {
        setFriendCode((await friendCodeAction()).code);
      } catch {}
    }
  }

  async function onAddFriend() {
    const code = addCode.trim();
    if (!code) return;
    const res = await addFriendAction(code);
    if (res.ok) {
      setAddCode("");
      setFriendNote(lang === "ja" ? `${res.name} を追加しました！` : `Added ${res.name}!`);
      sound.correct();
      refreshFriends();
    } else {
      setFriendNote(res.error ?? null);
      sound.wrong();
    }
  }

  async function copyFriendCode() {
    if (!friendCode) return;
    try {
      await navigator.clipboard.writeText(friendCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 1800);
    } catch {}
  }

  /* Sending your just-finished Blitz score as a duel. */
  async function onChallenge(friendId: string) {
    const res = await challengeAction(friendId, blitzScore, blitzLevelRef.current);
    if (res.ok) {
      spawnToast(lang === "ja" ? "対戦を送りました！" : "Duel sent!", null);
      sound.correct();
      setFriendsOpen(false);
      setBlitzOver(false);
      goHome();
      refreshFriends();
    } else {
      setFriendNote(res.error ?? null);
    }
  }

  /* Accepting: the next Blitz run settles this duel. */
  function acceptDuel(d: ChallengeRow) {
    setActiveDuelId(d.id);
    setDuelResult(null);
    setFriendsOpen(false);
    /* Same level the challenger played, so the two scores mean the same thing. */
    startBlitz(d.level);
  }

  /* ---------- mistake review ----------
     Pays out through the daily quest rather than per fix: fixMistakeAction is a
     client-trusted call, so a per-fix gem reward would be a forgeable faucet. */
  function dealReviewQuestion(queue: Problem[], idx: number) {
    const p = queue[idx];
    if (!p) return;
    setReviewOptions(shuffle([p.answer, ...makeDistractors(p.answer, 3)]));
  }

  async function startReview() {
    const { rows } = await reviewListAction();
    if (!rows.length) return;
    const queue: Problem[] = rows.map((r) => ({ prompt: r.prompt, answer: r.answer }));
    setReviewQueue(queue);
    setReviewIdx(0);
    setReviewFixed(0);
    setReviewFeedback(null);
    dealReviewQuestion(queue, 0);
    setQuestsOpen(false);
    setView("review");
  }

  function onReviewAnswer(v: number) {
    const p = reviewQueue[reviewIdx];
    if (!p || reviewFeedback) return;
    const ok = v === p.answer;
    setReviewFeedback(ok ? "ok" : "bad");
    if (ok) {
      sound.correct();
      haptic(15);
      confetti.burstFromEl(practiceCardRef.current, 16);
      setReviewFixed((n) => n + 1);
      sayLine("reviewFixed");
      fixMistakeAction(p.prompt).then(refreshReview).catch(() => {});
      fireQuest("mistake_fixed");
    } else {
      sound.wrong();
      haptic([25, 45, 25]);
    }
    setTimeout(() => {
      setReviewFeedback(null);
      const next = reviewIdx + 1;
      if (next >= reviewQueue.length) {
        confetti.burstCenter(90, 0.45);
        sayLine("reviewDone");
        goHome();
        return;
      }
      setReviewIdx(next);
      dealReviewQuestion(reviewQueue, next);
    }, ok ? 700 : 1400);
  }

  /* share sheet: every header stat and the blitz result open it focused on that number */
  const [shareOpen, setShareOpen] = useState(false);
  const [shareFocus, setShareFocus] = useState<ShareFocus>("level");
  function openShare(f: ShareFocus) {
    setShareFocus(f);
    setShareOpen(true);
  }
  const achievementCtx = useMemo(
    () => ({ progress, level: li.level, gems, dailyStreak, bestStreakEver, solvedCount, totalPuzzles: PUZZLES.length, bossClears }),
    [progress, li.level, gems, dailyStreak, bestStreakEver, solvedCount, bossClears]
  );
  const unlockedAchievements = useMemo(
    () => ACHIEVEMENTS.filter((a) => a.isUnlocked(achievementCtx)).length,
    [achievementCtx]
  );

  function goHome() {
    setView("home");
  }
  function openTopic(id: string) {
    if (guest && TOPICS.findIndex((t) => t.id === id) >= GUEST_TOPICS) { setLockOpen("topic"); return; }
    setCurrentTopicId(id);
    setView("topic");
  }
  function openStageMap(id: string) {
    setCurrentTopicId(id);
    setView("stagemap");
  }

  const headerTitle =
    view === "quick"
      ? (lang === "ja" ? quickGame(quickId)?.nameJa : quickGame(quickId)?.name) ?? t.headerTitles.quick
      : t.headerTitles[view];

  /* Guests get a taste — the first two topics, Blitz, Game of the Day and
     three shelf games — and a lock everywhere else. Everything is one tap
     from a sign-up that keeps their progress. */
  const GUEST_TOPICS = 2;
  const GUEST_GAMES = new Set(["match", "bigger", "memory", "pop"]);
  const [lockOpen, setLockOpen] = useState<string | null>(null);
  function guestLocked(kind: string): boolean {
    if (!guest) return false;
    setLockOpen(kind);
    return true;
  }

  function handleBack() {
    if (view === "practice") { openStageMap(currentTopicId!); }
    else if (view === "stagemap") { openTopic(currentTopicId!); }
    /* Out of a game goes back to the shelf, not all the way home — finishing
       one and wanting another is the common case. */
    else if (GAME_VIEWS.includes(view) || (view === "arena" && (sprintRef.current || sprintOver))) {
      sprintRef.current = null; setSprintOver(null); openGames();
    }
    else { goHome(); }
  }

  // Restore whatever screen the player was on before a refresh, instead of
  // always dropping them back at the home screen.
  /* eslint-disable react-hooks/set-state-in-effect -- restoring from
     localStorage has to happen after hydration: the server must render home,
     and only the browser knows where the player was. One-shot, not a cascade. */
  useEffect(() => {
    try {
      const savedView = localStorage.getItem("sutraSprint.navView");
      const savedTopic = localStorage.getItem("sutraSprint.navTopic");
      if (savedTopic) setCurrentTopicId(savedTopic);
      if (savedView === "topic" && savedTopic) setView("topic");
      else if (savedView === "stagemap" && savedTopic) setView("stagemap");
      else if (savedView === "arena") {
        loadPuzzle(0);
        setView("arena");
      }
      /* A game round cannot survive a refresh, but the shelf it came from
         can — landing there beats landing on home. */
      else if (savedView === "games" || GAME_VIEWS.includes(savedView as View)) setView("games");
      else if (savedView === "tricks") setView("tricks");
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    try {
      const persistView = view === "practice" ? "stagemap" : view === "blitz" ? "home" : view;
      localStorage.setItem("sutraSprint.navView", persistView);
      if (currentTopicId) localStorage.setItem("sutraSprint.navTopic", currentTopicId);
    } catch {}
  }, [view, currentTopicId]);

  // Make the phone/browser back gesture behave the same as the in-app back
  // arrow, instead of leaving the app or doing nothing.
  useEffect(() => {
    try {
      window.history.pushState({ appNav: true }, "");
    } catch {}
  }, [view]);

  useEffect(() => {
    function onPopState() {
      handleBack();
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, currentTopicId]);

  /* ================= PRACTICE ================= */
  const [curStage, setCurStage] = useState({ n: 1, qIndex: 0, correct: 0 });
  /* How each question of the current stage went, so the run can be read at a
     glance while it is still happening rather than only in the result. */
  const [stageMarks, setStageMarks] = useState<(boolean | null)[]>([]);
  /* And what actually happened, so the result screen can show the questions
     back. Stars tell you how you did; this tells you what to fix. */
  type RunEntry = { prompt: string; answer: number; given: string; ok: boolean; timedOut: boolean };
  const [stageLog, setStageLog] = useState<RunEntry[]>([]);
  const [curProblem, setCurProblem] = useState<Problem | null>(null);
  const [curMode, setCurMode] = useState<Mode>("type");
  const [tileOptions, setTileOptions] = useState<number[]>([]);
  const [curSelection, setCurSelection] = useState<number | boolean | null>(null);
  const [tfShown, setTfShown] = useState(0);
  const [tfIsTrue, setTfIsTrue] = useState(true);
  const [checkEnabled, setCheckEnabled] = useState(false);
  const [shakeQuestion, setShakeQuestion] = useState(false);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [shakeTile, setShakeTile] = useState(false);
  const [streakPop, setStreakPop] = useState(false);
  const [runs, setRuns] = useState(0);
  const [runReady, setRunReady] = useState(false);
  const [swingAnim, setSwingAnim] = useState<"hit" | "miss" | null>(null);
  const [comboStreak, setComboStreak] = useState(0);
  const [feedback, setFeedback] = useState<{ show: boolean; ok: boolean; t2: string } | null>(null);
  const [eliminated, setEliminated] = useState<number[]>([]);
  const [fiftyLeft, setFiftyLeft] = useState(1);
  const [timerKey, setTimerKey] = useState(0);
  const [timerMs, setTimerMs] = useState(8000);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const questionStartRef = useRef<number>(0);
  const answeredRef = useRef(false);
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasFeedbackRef = useRef(false);
  // the feedback banner sits directly on top of the footer rather than over it
  const footerRef = useRef<HTMLElement>(null);
  const [footerH, setFooterH] = useState(0);
  const [trickId, setTrickId] = useState<string | null>(null);
  const [trickStep, setTrickStep] = useState(0);
  const [trickNum, setTrickNum] = useState(0);

  const [dailyStatus, setDailyStatus] = useState<DailyStatus | null>(null);
  const [dailyQs, setDailyQs] = useState<DailyQuestion[]>([]);
  const [dailyIdx, setDailyIdx] = useState(0);
  const [dailyCorrect, setDailyCorrect] = useState(0);
  const [dailyPick, setDailyPick] = useState<number | null>(null);
  const [dailyDone, setDailyDone] = useState<{ points: number; correct: number } | null>(null);
  const dailyStartRef = useRef(0);
  const [leagueOpen, setLeagueOpen] = useState(false);
  const [league, setLeague] = useState<LeagueStanding | null>(null);
  const [leagueLoading, setLeagueLoading] = useState(false);
  const [stageIntro, setStageIntro] = useState<number | null>(null);
  const isBoss = curStage.n === STAGE_COUNT;

  const [stageResult, setStageResult] = useState<
    | null
    | { passed: boolean; stars: number; correct: number; gemsGained: number; n: number; isBoss: boolean }
  >(null);
  const [celebrate, setCelebrate] = useState<{ mood: "happy" | "excited"; title: string; body: string } | null>(null);

  function newStageQuestion(topic: Topic, n: number) {
    wrongRunRef.current = 0;
    const problem = topic.gen(STAGE_DIFF[n - 1] as Difficulty);
    const mode =
      n === 1
        ? weightedPick<Mode>([["type", 1], ["choice", 2], ["truefalse", 2]])
        : weightedPick<Mode>([
            ["type", 1],
            ["choice", 1],
            ["target", 2],
            ["truefalse", 1],
            ["arcade", 3],
            ["catch", 2],
            ["balloon", 2],
            ["numberline", 2],
          ]);
    /* Dev only: localStorage "dev.forceMode" = "catch" etc. forces a question style for testing. */
    let forced: Mode | null = null;
    if (process.env.NODE_ENV !== "production") { try { forced = localStorage.getItem("dev.forceMode") as Mode | null; } catch {} }
    const useMode: Mode = forced ?? mode;
    setCurProblem(problem);
    setCurMode(useMode);
    setCurSelection(null);
    setCheckEnabled(false);
    setWrongFlash(false);
    setSwingAnim(null);
    setRunReady(false);
    setEliminated([]);
    answeredRef.current = false;
    setTimerMs((30 + 10 * (n - 1)) * 1000);
    setTimerKey((k) => k + 1);
    questionStartRef.current = Date.now();
    if (useMode === "choice") setTileOptions(shuffle([problem.answer, ...makeDistractors(problem.answer, 3)]));
    else if (useMode === "target" || useMode === "arcade" || useMode === "catch" || useMode === "balloon")
      setTileOptions(shuffle([problem.answer, ...makeDistractors(problem.answer, 5)]));
    else if (useMode === "numberline") setTileOptions(shuffle([problem.answer, ...makeDistractors(problem.answer, 4)]));
    else if (useMode === "truefalse") {
      const isTrue = Math.random() < 0.5;
      setTfIsTrue(isTrue);
      setTfShown(isTrue ? problem.answer : makeDistractors(problem.answer, 1)[0]);
    }
  }

  function startStage(n: number) {
    if (!currentTopic) return;
    if (!stageUnlocked(progress, currentTopic.id, n)) return;
    setCurStage({ n, qIndex: 0, correct: 0 });
    setStageMarks([]);
    setStageLog([]);
    setHearts(5);
    setRuns(0);
    setComboStreak(0);
    setFiftyLeft(1);
    newStageQuestion(currentTopic, n);
    setView("practice");
    setStageIntro(n);
    setTimeout(() => setStageIntro(null), 900);
  }

  // Jump straight into practice for a given topic+stage, without relying on
  // currentTopic already being set (used by the home-screen "Continue" card).
  function continueStage(topicId: string, n: number) {
    const topic = TOPIC_BY_ID[topicId];
    if (!topic) return;
    if (!stageUnlocked(progress, topicId, n)) return;
    setCurrentTopicId(topicId);
    setCurStage({ n, qIndex: 0, correct: 0 });
    setStageMarks([]);
    setStageLog([]);
    setHearts(5);
    setRuns(0);
    setComboStreak(0);
    setFiftyLeft(1);
    newStageQuestion(topic, n);
    setView("practice");
    setStageIntro(n);
    setTimeout(() => setStageIntro(null), 900);
  }

  const deadlineRef = useRef(0);
  const hintRemainingRef = useRef<number | null>(null);
  useEffect(() => {
    if (view !== "practice" || !curProblem) return;
    deadlineRef.current = Date.now() + timerMs;
    timeoutRef.current = setTimeout(() => handleTimeout(), timerMs);
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curProblem, view]);

  /* The lesson overlay stops the clock — both the one you see and the one
     that ends the question. Otherwise reading the method for twenty seconds
     times you out behind the sheet. */
  useEffect(() => {
    if (view !== "practice" || !curProblem || answeredRef.current) return;
    if (hintOpen) {
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
      hintRemainingRef.current = Math.max(0, deadlineRef.current - Date.now());
    } else if (hintRemainingRef.current !== null) {
      const left = hintRemainingRef.current;
      hintRemainingRef.current = null;
      deadlineRef.current = Date.now() + left;
      timeoutRef.current = setTimeout(() => handleTimeout(), left);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hintOpen]);

  function useFiftyFifty() {
    if (fiftyLeft <= 0 || !curProblem) return;
    const wrongs = tileOptions.filter((o) => o !== curProblem.answer);
    setEliminated(shuffle(wrongs).slice(0, 2));
    setFiftyLeft(0);
    sound.click();
  }

  /* The free 50/50 is one per stage. Once it is gone, a bought token buys
     another use — the server decrements, so the count can't be wished into
     existence client-side. */
  async function useFiftyToken() {
    if (!curProblem || (inventory?.fiftyTokens ?? 0) <= 0) return;
    const res = await consumeItemAction("fifty");
    if (!res.ok) return;
    setInventory(res.inventory ?? null);
    const wrongs = tileOptions.filter((o) => o !== curProblem.answer);
    setEliminated(shuffle(wrongs).slice(0, 2));
    sound.click();
    haptic(12);
  }

  /* A hint reveals the sutra's steps for the question in front of you. */
  async function useHintToken() {
    if ((inventory?.hintTokens ?? 0) <= 0) return;
    const res = await consumeItemAction("hint");
    if (!res.ok) return;
    setInventory(res.inventory ?? null);
    setHintOpen(true);
    sound.click();
  }

  useEffect(() => {
    if (curMode === "type" && view === "practice") {
      typeInputRef.current?.focus();
    }
  }, [curMode, curProblem, view]);

  function resolveAnswer(ok: boolean, timedOut: boolean, given = "") {
    if (!curProblem) return;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    const elapsed = Date.now() - questionStartRef.current;
    const speedy = ok && !timedOut && elapsed <= timerMs * 0.45;
    setStageMarks((m) => {
      const next = [...m];
      next[curStage.qIndex] = ok;
      return next;
    });
    setStageLog((l) => [
      ...l,
      { prompt: curProblem.prompt, answer: curProblem.answer, given, ok, timedOut },
    ]);

    if (ok) {
      stageCorrectRef.current += 1;
      setCurStage((s) => {
        const correct = s.correct + 1;
        setBestStreakEver((b) => Math.max(b, correct));
        return { ...s, correct };
      });
      const nextCombo = comboStreak + 1;
      const tier = nextCombo >= 9 ? 3 : nextCombo >= 6 ? 2 : nextCombo >= 3 ? 1 : 0;
      const multiplier = tier + 1;
      setComboStreak(nextCombo);
      confetti.burstFromEl(practiceCardRef.current, 18 + tier * 8 + (speedy ? 12 : 0));
      if (tier > 0 && (nextCombo === 3 || nextCombo === 6 || nextCombo === 9)) sound.combo(tier);
      else sound.correct();
      if (nextCombo === 3) sayLine("combo3");
      else if (nextCombo === 6) sayLine("combo6");
      else if (speedy && nextCombo === 1) sayLine("speedy");
      haptic(tier > 0 ? [15, 30, 15, 30, 25] : 15);
      spawnToast(
        speedy
          ? `⚡ +${10 * multiplier} SPEED!`
          : tier > 0
          ? `+${10 * multiplier} 💎 COMBO x${multiplier}!`
          : "+10 💎",
        practiceCardRef.current
      );
      setStreakPop(true);
      setTimeout(() => setStreakPop(false), 220);
      setGemPop(true);
      setTimeout(() => setGemPop(false), 320);
      if (curMode === "arcade") {
        sound.hit();
        setSwingAnim("hit");
        setTimeout(() => setSwingAnim(null), 900);
        setTimeout(() => setRunReady(true), 700);
      }
      if (curMode === "catch") sound.flip();
    } else {
      /* Bank the miss for review. Silent on failure — a dropped mistake is a
         smaller problem than an interrupted question. */
      if (currentTopic) {
        if (!guest) recordMistakeAction(currentTopic.id, curProblem.prompt, curProblem.answer)
          .then(refreshReview)
          .catch(() => {});
      }
      /* First miss on a question gets a nudge; a second gets pointed at the
         lesson, and once tokens exist it mentions them instead of repeating. */
      wrongRunRef.current += 1;
      if (wrongRunRef.current === 1) sayLine("wrongOnce");
      else if (wrongRunRef.current === 2) sayLine("wrongTwice");
      else if (wrongRunRef.current >= 3 && (inventory?.hintTokens ?? 0) > 0) sayLine("hintNudge");
      setHearts((h) => Math.max(0, h - 1));
      setComboStreak(0);
      sound.wrong();
      haptic([25, 45, 25]);
      if (curMode === "type") setWrongFlash(true);
      else setShakeTile(true);
      setShakeQuestion(true);
      setTimeout(() => setShakeQuestion(false), 400);
      setTimeout(() => setShakeTile(false), 400);
      if (curMode === "arcade") {
        setSwingAnim("miss");
        setTimeout(() => setSwingAnim(null), 700);
      }
    }
    setFeedback({
      show: true,
      ok,
      t2: ok ? "" : `${timedOut ? "⏰ " : ""}${curProblem.prompt} = ${fmt(curProblem.answer)}`,
    });
    hasFeedbackRef.current = true;
    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    if (curMode !== "arcade") {
      advanceTimeoutRef.current = setTimeout(() => onFeedbackContinue(), ok ? 1200 : 2000);
    }
  }

  function submitSelection(v: number | boolean) {
    if (!curProblem || answeredRef.current) return;
    answeredRef.current = true;
    setCurSelection(v);
    setCheckEnabled(true);
    sound.click();
    const ok = curMode === "truefalse" ? v === tfIsTrue : v === curProblem.answer;
    const given =
      curMode === "truefalse"
        ? v
          ? (lang === "ja" ? "正しい" : "True")
          : (lang === "ja" ? "誤り" : "False")
        : fmt(Number(v));
    setTimeout(() => resolveAnswer(ok, false, given), 220);
  }

  function checkPractice() {
    if (!curProblem || answeredRef.current) return;
    let ok: boolean;
    let given = "";
    if (curMode === "type") {
      const val = (typeInputRef.current?.value || "").trim().replace(/,/g, "");
      if (val === "") return;
      ok = Number(val) === curProblem.answer;
      given = fmt(Number(val));
      typeInputRef.current?.blur();
    } else if (curMode === "truefalse") {
      if (curSelection === null) return;
      ok = curSelection === tfIsTrue;
      given = curSelection ? (lang === "ja" ? "正しい" : "True") : (lang === "ja" ? "誤り" : "False");
    } else {
      if (curSelection === null) return;
      ok = curSelection === curProblem.answer;
      given = fmt(Number(curSelection));
    }
    answeredRef.current = true;
    resolveAnswer(ok, false, given);
  }

  function handleTimeout() {
    if (!curProblem || answeredRef.current) return;
    answeredRef.current = true;
    if (curMode === "type") typeInputRef.current?.blur();
    resolveAnswer(false, true, lang === "ja" ? "時間切れ" : "out of time");
  }

  function addRun() {
    setRuns((r) => r + 1);
    setRunReady(false);
    sound.correct();
  }

  async function onFeedbackContinue() {
    // the scheduled timeout closes over a render where `feedback` was still null,
    // so the guard has to read the ref, which is set synchronously alongside it
    if (!hasFeedbackRef.current) return;
    hasFeedbackRef.current = false;
    if (advanceTimeoutRef.current) {
      clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
    setFeedback(null);
    if (runReady) addRun();
    const nextIndex = curStage.qIndex + 1;
    if (nextIndex >= QUESTIONS_PER_STAGE) {
      await finishStage();
    } else {
      setCurStage((s) => ({ ...s, qIndex: nextIndex }));
      if (currentTopic) newStageQuestion(currentTopic, curStage.n);
    }
  }

  async function finishStage() {
    if (!currentTopic) return;
    const correct = curStage.correct;
    const n = curStage.n;
    /* Same numbers either way: the server and the browser both call
       stageOutcome, so a guest's stars do not change when they sign up. */
    const result = guest
      ? stageOutcome(correct, n, topicProgressOf(progress, currentTopic.id).cleared)
      : await finishStageAction(currentTopic.id, n, correct);
    const levelBefore = li.level;

    setProgress((prev) => {
      const p = topicProgressOf(prev, currentTopic.id);
      const nextStars = { ...p.stageStars };
      if (result.stars > (nextStars[String(n)] || 0)) nextStars[String(n)] = result.stars;
      const nextCleared = result.justUnlocked ? n : p.cleared;
      const next: ProgressState = {
        ...prev,
        topics: { ...prev.topics, [currentTopic.id]: { cleared: nextCleared, stageStars: nextStars } },
      };
      if (levelInfo(next).level > levelBefore) {
        setTimeout(() => sound.levelUp(), 500);
        setTimeout(() => sayLine("levelUp"), 900);
      }
      return next;
    });

    /* Report the run's quest-relevant facts in one go. */
    if (stageCorrectRef.current > 0) fireQuest("correct_answer", stageCorrectRef.current);
    stageCorrectRef.current = 0;
    if (result.passed) {
      fireQuest("stage_cleared");
      if (correct === QUESTIONS_PER_STAGE) fireQuest("stage_perfect");
    }

    const wasBoss = n === STAGE_COUNT;
    if (result.passed) {
      if (wasBoss) sayLine("bossDown");
      else if (correct === QUESTIONS_PER_STAGE) sayLine("stagePerfect");
      else sayLine("stagePass");
    }
    setStageResult({ passed: result.passed, stars: result.stars, correct, gemsGained: result.gemsGained, n, isBoss: wasBoss });
    if (result.passed) {
      confetti.burstCenter(wasBoss ? 160 : 100, wasBoss ? 0.55 : 0.4);
      if (wasBoss) sound.bossFanfare();
      else sound.stageClear();
      haptic(wasBoss ? [40, 60, 40, 60, 80] : [30, 50, 30]);
      if (result.stars === 3) {
        haptic([20, 30, 20, 30, 20, 30, 60]);
        setTimeout(() => confetti.burstCenter(140, 0.6), 200);
      }
    }
    if (result.passed && n === STAGE_COUNT) {
      setTimeout(() => {
        setCelebrate({
          mood: "excited",
          title: t.celebrate.sutraTitle,
          body: t.celebrate.sutraBody(lang === "ja" ? currentTopic.titleJa : currentTopic.title),
        });
      }, 900);
    }
  }

  function afterStageResult(action: "next" | "retry" | "map" | "nextTopic") {
    const n = stageResult?.n ?? 1;
    setStageResult(null);
    if (action === "next" && currentTopic) startStage(n + 1);
    else if (action === "nextTopic" && currentTopic) {
      /* The topic after this one — the boss just unlocked it. */
      const i = TOPICS.findIndex((tp) => tp.id === currentTopic.id);
      const nxt = TOPICS[i + 1];
      if (nxt) openTopic(nxt.id);
      else if (currentTopicId) openStageMap(currentTopicId);
    }
    else if (action === "retry") startStage(n);
    else if (currentTopicId) openStageMap(currentTopicId);
  }

  /* ================= MATCHSTICK DOJO ================= */
  const [puzIdx, setPuzIdx] = useState(0);
  const [glyphs, setGlyphs] = useState<Glyph[]>([]);
  const [startGlyphs, setStartGlyphs] = useState<Glyph[]>([]);
  const [tray, setTray] = useState<boolean[]>(new Array(TRAY_SIZE).fill(false));
  const [moveCount, setMoveCount] = useState(0);
  const [selection, setSelection] = useState<Loc | null>(null);
  const [hintPair, setHintPair] = useState<{ from: Loc; to: Loc } | null>(null);
  const [puzzleStatus, setPuzzleStatus] = useState<{ text: string; color: string }>({ text: "", color: "" });
  const [boardLocked, setBoardLocked] = useState(false);
  const [puzzleElapsed, setPuzzleElapsed] = useState(0);
  const puzzleStartRef = useRef<number>(0);

  function loadPuzzle(i: number) {
    const idx = ((i % PUZZLES.length) + PUZZLES.length) % PUZZLES.length;
    const p = PUZZLES[idx];
    const start = p.start();
    setPuzIdx(idx);
    setStartGlyphs(start);
    setGlyphs(cloneGlyphs(start));
    setTray(new Array(TRAY_SIZE).fill(false));
    setMoveCount(0);
    setSelection(null);
    setHintPair(null);
    setPuzzleStatus({ text: "", color: "" });
    setBoardLocked(false);
    setPuzzleElapsed(0);
    puzzleStartRef.current = Date.now();
  }

  useEffect(() => {
    if (view !== "arena") return;
    if (progress.arena.solved[PUZZLES[puzIdx].id]) return;
    const id = setInterval(() => setPuzzleElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, puzIdx, progress.arena.solved[PUZZLES[puzIdx]?.id]]);

  useEffect(() => {
    const el = footerRef.current;
    if (!el) return;
    const measure = () => setFooterH(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function getActive(loc: "board" | "tray", gi: number | null, slot: string | null, idx: number | null, g: Glyph[], tr: boolean[]) {
    return loc === "board" ? !!g[gi!].active[slot!] : !!tr[idx!];
  }

  function onSlotClick(loc: "board" | "tray", gi: number | null, slot: string | null, idx: number | null) {
    if (boardLocked) return;
    setHintPair(null);
    const here: Loc = { loc, gi, slot, idx };
    const isActive = getActive(loc, gi, slot, idx, glyphs, tray);

    if (selection === null) {
      if (isActive) setSelection(here);
      else setPuzzleStatus({ text: t.arena.tapFirst, color: "var(--ink-dim)" });
      return;
    }
    if (sameLoc(selection, here)) { setSelection(null); return; }
    if (isActive) { setSelection(here); return; }

    const nextGlyphs = cloneGlyphs(glyphs);
    const nextTray = [...tray];
    if (selection.loc === "board") nextGlyphs[selection.gi!].active[selection.slot!] = false;
    else nextTray[selection.idx!] = false;
    if (loc === "board") nextGlyphs[gi!].active[slot!] = true;
    else nextTray[idx!] = true;

    setGlyphs(nextGlyphs);
    setTray(nextTray);
    setMoveCount((m) => m + 1);
    setSelection(null);
    sound.click();
    checkSolved(nextGlyphs);
  }

  async function checkSolved(g: Glyph[]) {
    const eq = currentEquationText(g);
    if (!eq.valid) {
      setPuzzleStatus({ text: t.arena.shapeInProgress + eq.text, color: "var(--ink-dim)" });
      return;
    }
    const ok = evalEquation(eq.parts);
    if (ok) {
      setPuzzleStatus({ text: t.arena.solvedPrefix + eq.parts.join(" ") + t.arena.solvedSuffix, color: "var(--green-dk)" });
      setBoardLocked(true);
      const p = PUZZLES[puzIdx];
      const already = !!progress.arena.solved[p.id];
      const res = guest
        ? { bestMoves: Math.min(progress.arena.bestMoves[p.id] ?? Infinity, moveCount + 1) }
        : await solvePuzzleAction(p.id, moveCount + 1);
      fireQuest("puzzle_solved");
      sayLine("puzzleSolved");
      setProgress((prev) => ({
        ...prev,
        arena: {
          solved: { ...prev.arena.solved, [p.id]: true },
          bestMoves: { ...prev.arena.bestMoves, [p.id]: res.bestMoves },
        },
      }));
      const solveTime = Date.now() - puzzleStartRef.current;
      const speedy = solveTime <= 15000;
      confetti.burstFromEl(puzzleSvgRef.current as unknown as HTMLElement, speedy ? 100 : 70);
      sound.stageClear();
      if (speedy) spawnToast("⚡ Speed Solve!", puzzleSvgRef.current as unknown as HTMLElement);
      if (sprintRef.current) {
        setTimeout(sprintAdvance, 900);
        return;
      }
      if (!already) {
        setTimeout(() => {
          setCelebrate({
            mood: "excited",
            title: t.celebrate.dojoTitle,
            body: t.celebrate.dojoBody(moveCount + 1, p.par),
          });
        }, 300);
      }
    } else {
      setPuzzleStatus({ text: eq.parts.join(" ") + t.arena.notTrueYet, color: "var(--red-dk)" });
    }
  }

  function computeHintDiff(): { from: Loc; to: Loc } | null {
    const target = PUZZLES[puzIdx].hint();
    let from: Loc | null = null;
    let to: Loc | null = null;
    for (let gi = 0; gi < glyphs.length; gi++) {
      for (const slot of slotsFor(glyphs[gi])) {
        const cur = !!glyphs[gi].active[slot];
        const want = !!target[gi].active[slot];
        if (cur && !want && !from) from = { loc: "board", gi, slot, idx: null };
        if (!cur && want && !to) to = { loc: "board", gi, slot, idx: null };
      }
    }
    for (let i = 0; i < tray.length; i++) {
      if (tray[i] && !from) from = { loc: "tray", gi: null, slot: null, idx: i };
    }
    return from && to ? { from, to } : null;
  }
  function onHint() {
    const pair = computeHintDiff();
    if (!pair) {
      setPuzzleStatus({ text: t.arena.alreadySolved, color: "var(--ink-dim)" });
      return;
    }
    setHintPair(pair);
    setPuzzleStatus({ text: t.arena.hintText, color: "var(--ink-dim)" });
    setTimeout(() => setHintPair(null), 3200);
  }

  /* ================= NUMBER BLITZ (arcade mini-game) ================= */
  const [blitzProblem, setBlitzProblem] = useState<Problem | null>(null);
  const [blitzOptions, setBlitzOptions] = useState<number[]>([]);
  const [blitzScore, setBlitzScore] = useState(0);
  const [blitzHearts, setBlitzHearts] = useState(3);
  const [blitzLevelId, setBlitzLevelId] = useState(BLITZ_DEFAULT_LEVEL);
  const [blitzPicker, setBlitzPicker] = useState(false);
  /* best per level: a Warm-up record and a Sharp record are different things */
  const [blitzBests, setBlitzBests] = useState<Record<number, number>>({});
  const blitzLevelRef = useRef(BLITZ_DEFAULT_LEVEL);
  const [blitzTimerMs, setBlitzTimerMs] = useState(blitzLevel(BLITZ_DEFAULT_LEVEL).startMs);
  const [blitzBoost, setBlitzBoost] = useState(false);
  /* read inside newBlitzQuestion, which runs from timers outside render */
  const blitzBoostRef = useRef(false);
  const [blitzTimerKey, setBlitzTimerKey] = useState(0);
  const [blitzFeedback, setBlitzFeedback] = useState<"ok" | "bad" | null>(null);
  const [blitzOver, setBlitzOver] = useState(false);
  const [blitzJustBeatBest, setBlitzJustBeatBest] = useState(false);
  const blitzAnsweredRef = useRef(false);
  const blitzTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blitzCardRef = useRef<HTMLDivElement | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- per-level bests live in
     localStorage and are shown on the home card, so they are read once after
     hydration. Reading them lazily would leave the card blank. */
  useEffect(() => {
    try {
      const next: Record<number, number> = {};
      for (const l of BLITZ_LEVELS) {
        const v = localStorage.getItem(`sutraSprint.blitzBest.${l.id}`);
        if (v) next[l.id] = Number(v) || 0;
      }
      /* One unlabelled record predates levels; it was set under the old ramp,
         which is what level 2 now reproduces, so it lands there. */
      const legacy = localStorage.getItem("sutraSprint.blitzBest");
      if (legacy && next[BLITZ_DEFAULT_LEVEL] === undefined) {
        next[BLITZ_DEFAULT_LEVEL] = Number(legacy) || 0;
      }
      setBlitzBests(next);
    } catch {}
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function newBlitzQuestion(score: number) {
    const L = blitzLevel(blitzLevelRef.current);
    /* Only the mental topics, and each capped to the difficulty it stays
       mental at — see BLITZ_MAX_DIFF. */
    const topic = BLITZ_TOPICS[ri(0, BLITZ_TOPICS.length - 1)];
    const rung = L.step > 0 ? Math.min(L.ladder.length - 1, Math.floor(score / L.step)) : 0;
    const problem = topic.gen(blitzDiff(topic.id, L.ladder[rung]));
    setBlitzProblem(problem);
    setBlitzOptions(shuffle([problem.answer, ...makeDistractors(problem.answer, 3)]));
    const boost = blitzBoostRef.current ? BLITZ_BOOST_MS : 0;
    setBlitzTimerMs(Math.max(L.minMs + boost, L.startMs + boost - score * L.decayMs));
    setBlitzTimerKey((k) => k + 1);
    blitzAnsweredRef.current = false;
  }

  /* Tapping Blitz opens the level chooser; a duel skips it, because the duel
     already fixes the level both players fight at. */
  function openBlitzPicker() {
    setBlitzPicker(true);
  }

  function startBlitz(levelId: number = blitzLevelRef.current) {
    blitzLevelRef.current = levelId;
    setBlitzLevelId(levelId);
    setBlitzPicker(false);
    fireQuest("blitz_played");
    sayLine("blitzStart");
    /* Spend a Time Boost if one is held: the whole run gets a longer clock.
       Consumed server-side first, so a failed spend means no boost. */
    if ((inventory?.timeBoosts ?? 0) > 0) {
      consumeItemAction("timeBoost")
        .then((res) => {
          if (res.ok) {
            setInventory(res.inventory ?? null);
            blitzBoostRef.current = true;
            setBlitzBoost(true);
            spawnToast(`⏱️ +${BLITZ_BOOST_MS / 1000}s`, null);
          }
        })
        .catch(() => {});
    } else {
      blitzBoostRef.current = false;
      setBlitzBoost(false);
    }
    setBlitzScore(0);
    setBlitzHearts(3);
    setBlitzOver(false);
    setBlitzJustBeatBest(false);
    setBlitzFeedback(null);
    setView("blitz");
    newBlitzQuestion(0);
  }

  /* ---------- Number Match ----------
     A round is entirely client-side, so it works as a guest and offline —
     the two places the rest of the game cannot go. */
  const [matchTiles, setMatchTiles] = useState<MatchTile[]>([]);
  const [matchPicked, setMatchPicked] = useState<MatchTile[]>([]);
  const [matchDone, setMatchDone] = useState<string[]>([]);
  const [matchWrong, setMatchWrong] = useState<string[]>([]);
  const [matchMistakes, setMatchMistakes] = useState(0);
  const [matchStart, setMatchStart] = useState(0);
  const [matchResult, setMatchResult] = useState<{ secs: number; score: number; best: boolean } | null>(null);
  const [matchBest, setMatchBest] = useState(0);

  /* Game of the Day: the same board for everyone until midnight, so a score
     is worth telling someone. Only the fixed-board games qualify — the
     streak games have no shared thing to compare. */
  const [dailyGameDone, setDailyGameDone] = useState<number | null>(null);
  const isDailyRef = useRef(false);

  function readDailyGame() {
    try {
      const v = localStorage.getItem(dailyGameKey(todayKey()));
      setDailyGameDone(v === null ? null : Number(v));
    } catch {}
  }

  function recordDailyGame(value: number) {
    if (!isDailyRef.current) return;
    isDailyRef.current = false;
    try {
      const key = dailyGameKey(todayKey());
      const prev = localStorage.getItem(key);
      /* Match scores high, Memory scores low — the caller passes whichever
         direction is better, having already compared. */
      if (prev === null) localStorage.setItem(key, String(value));
      setDailyGameDone(prev === null ? value : Number(prev));
    } catch {}
  }

  function startDailyGame() {
    const key = todayKey();
    isDailyRef.current = true;
    if (dailyGameId(key) === "memory") startMemory(dailySeed(key));
    else startMatch(dailySeed(key));
  }

  function startMatch(seed?: number) {
    /* Read the best here rather than in a mount effect: it is only ever
       needed once the game opens, and an event handler is the honest place
       to touch localStorage. */
    try {
      setMatchBest(Number(localStorage.getItem("sutraSprint.matchBest") || 0));
    } catch {}
    const round = seed === undefined
      ? buildMatchRound(6, "easy")
      : withSeededRandom(seededRandom(seed), () => buildMatchRound(6, "easy"));
    setMatchTiles(round.tiles);
    setMatchPicked([]);
    setMatchDone([]);
    setMatchWrong([]);
    setMatchMistakes(0);
    setMatchResult(null);
    setMatchStart(Date.now());
    setView("match");
  }

  function onMatchTap(tile: MatchTile) {
    if (matchResult || matchDone.includes(tile.id) || matchWrong.length) return;
    if (matchPicked.some((t) => t.id === tile.id)) {
      setMatchPicked([]);                       /* tapping it again lets go */
      return;
    }
    const picked = [...matchPicked, tile];
    if (picked.length < 2) {
      setMatchPicked(picked);
      sound.click();
      return;
    }
    const [a, b] = picked;
    if (isPair(a, b)) {
      const done = [...matchDone, a.id, b.id];
      setMatchDone(done);
      setMatchPicked([]);
      sound.correct();
      haptic(18);
      if (done.length === matchTiles.length) {
        const secs = Math.round((Date.now() - matchStart) / 1000);
        const score = matchScore(matchTiles.length / 2, secs, matchMistakes);
        const best = score > matchBest;
        if (best) {
          setMatchBest(score);
          try {
            localStorage.setItem("sutraSprint.matchBest", String(score));
          } catch {}
        }
        setMatchResult({ secs, score, best });
        recordDailyGame(score);
        confetti.burstCenter(140, 0.5);
        sound.levelUp();
        if (!guest) fireQuest("correct_answer", matchTiles.length / 2);
      }
    } else {
      /* Show the wrong pairing for a beat rather than snapping it away —
         seeing what you got wrong is the only way to learn from it. */
      setMatchWrong([a.id, b.id]);
      setMatchMistakes((m) => m + 1);
      sound.wrong();
      haptic(30);
      setTimeout(() => {
        setMatchWrong([]);
        setMatchPicked([]);
      }, 620);
    }
  }

  /* ---------- Which is Bigger ---------- */
  const [bigPair, setBigPair] = useState<BiggerPair | null>(null);
  const [bigStreak, setBigStreak] = useState(0);
  const [bigBest, setBigBest] = useState(0);
  const [bigPick, setBigPick] = useState<"left" | "right" | null>(null);
  const [bigOver, setBigOver] = useState<{ streak: number; best: boolean } | null>(null);

  function startBigger() {
    try {
      setBigBest(Number(localStorage.getItem("sutraSprint.biggerBest") || 0));
    } catch {}
    setBigStreak(0);
    setBigPick(null);
    setBigOver(null);
    setBigPair(buildBiggerPair("easy"));
    setView("bigger");
  }

  function onBiggerPick(side: "left" | "right") {
    if (!bigPair || bigPick || bigOver) return;
    setBigPick(side);
    const chosen = side === "left" ? bigPair.left : bigPair.right;
    const other = side === "left" ? bigPair.right : bigPair.left;
    const right = chosen.answer > other.answer;
    if (right) {
      const streak = bigStreak + 1;
      setBigStreak(streak);
      sound.correct();
      haptic(14);
      /* Short beat so the green registers before the next pair. */
      setTimeout(() => {
        setBigPick(null);
        setBigPair(buildBiggerPair(streak >= 12 ? "hard" : streak >= 6 ? "medium" : "easy"));
      }, 420);
    } else {
      sound.wrong();
      haptic(34);
      const best = bigStreak > bigBest;
      if (best) {
        setBigBest(bigStreak);
        try {
          localStorage.setItem("sutraSprint.biggerBest", String(bigStreak));
        } catch {}
      }
      setTimeout(() => setBigOver({ streak: bigStreak, best }), 700);
      if (!guest && bigStreak > 0) fireQuest("correct_answer", bigStreak);
    }
  }

  /* The Games tab is a shelf, not one game: adding another is a row here
     plus its view. Bests are read when the tab opens so a fresh run shows up
     without a reload. */
  const [gameBests, setGameBests] = useState<Record<string, number>>({});
  function openGames() {
    try {
      setGameBests({
        match: Number(localStorage.getItem("sutraSprint.matchBest") || 0),
        bigger: Number(localStorage.getItem("sutraSprint.biggerBest") || 0),
        memory: Number(localStorage.getItem("sutraSprint.memBest") || 0),
        odd: Number(localStorage.getItem("sutraSprint.oddBest") || 0),
        sortg: Number(localStorage.getItem("sutraSprint.sortBest") || 0),
        sprint: Number(localStorage.getItem("sutraSprint.sprintBest") || 0),
        pop: Number(localStorage.getItem("sutraSprint.popBest") || 0),
        ...Object.fromEntries(QUICK_GAMES.map((g) => [g.id, Number(localStorage.getItem(`sutraSprint.quick.${g.id}`) || 0)])),
      });
    } catch {}
    readDailyGame();
    setView("games");
  }
  /* Tapping a shelf card is a free play, never the day's board. */
  const shelf = (fn: () => void, id?: string) => () => {
    isDailyRef.current = false;
    if (id && guest && !GUEST_GAMES.has(id)) { setLockOpen("game"); return; }
    fn();
  };
  const gameLocked = (id: string) => guest && !GUEST_GAMES.has(id);
  const GAMES = [
    {
      id: "match", icon: "🃏", tint: "var(--sky2)",
      name: "Number Match", nameJa: "ナンバーマッチ",
      blurb: "Pair each sum with its answer.", blurbJa: "式と答えをペアにしよう。",
      best: gameBests.match ?? 0, start: shelf(() => startMatch(), "match"),
    },
    {
      id: "pop", icon: "🎈", tint: "var(--sky2)",
      name: "Number Pop", nameJa: "かずの風船ポップ",
      blurb: "Balloons float up with numbers. Pop the one that equals the sum!",
      blurbJa: "数をつけた風船がうかんでくる。答えの風船をポップ！",
      best: gameBests.pop ?? 0, start: shelf(startPop, "pop"),
    },
    {
      id: "bigger", icon: "⚖️", tint: "var(--violet)",
      name: "Which is Bigger?", nameJa: "どっちが大きい？",
      blurb: "Tap the larger of two sums. One slip ends the run.",
      blurbJa: "大きいほうをタップ。まちがえたら終わり。",
      best: gameBests.bigger ?? 0, start: shelf(startBigger, "bigger"),
    },
    {
      id: "memory", icon: "🧠", tint: "var(--sun1)",
      name: "Memory Pairs", nameJa: "神経衰弱",
      blurb: "Same pairs, face down. Fewest turns wins.",
      blurbJa: "ふせたカードでペア探し。少ない回数でクリア。",
      best: gameBests.memory ?? 0, start: shelf(() => startMemory(), "memory"),
    },
    {
      id: "odd", icon: "🔍", tint: "var(--green-dk)",
      name: "Odd One Out", nameJa: "仲間はずれ",
      blurb: "Three share a digit sum. Spot the one that doesn't.",
      blurbJa: "3つは数字の合計が同じ。ちがう1つを見つけよう。",
      best: gameBests.odd ?? 0, start: shelf(startOdd, "odd"),
    },
    {
      id: "sortg", icon: "📊", tint: "var(--pink)",
      name: "Smallest First", nameJa: "小さい順",
      blurb: "Put four answers in order without working them all out.",
      blurbJa: "4つの答えを小さい順に並べよう。",
      best: gameBests.sortg ?? 0, start: shelf(startSort, "sortg"),
    },
    {
      id: "sprint", icon: "🔥", tint: "var(--sun1)",
      name: "Matchstick Sprint", nameJa: "マッチ棒スプリント",
      blurb: `${SPRINT_LEN} dojo puzzles against the clock.`,
      blurbJa: `道場のパズル${SPRINT_LEN}問をタイムアタック。`,
      best: gameBests.sprint ?? 0, start: shelf(startSprint, "sprint"),
    },
    ...QUICK_GAMES.map((g) => ({
      id: g.id, icon: g.icon, tint: g.tint,
      name: g.name, nameJa: g.nameJa, blurb: g.blurb, blurbJa: g.blurbJa,
      best: gameBests[g.id] ?? 0, start: shelf(() => startQuick(g.id), g.id),
    })),
  ];

  /* ---------- Number Pop ----------
     A round is: balloons hidden → up for popUpMs → popped, popped-wrong, or
     they float off (a miss). Three lives. Timers live in a ref so a fast tap cannot be
     followed by a stale "they ducked". */
  const [popRound, setPopRound] = useState<PopRound | null>(null);
  const [popPhase, setPopPhase] = useState<"hidden" | "up" | "hit" | "miss">("hidden");
  const [popHit, setPopHit] = useState<number | null>(null);
  const [popScore, setPopScore] = useState(0);
  const [popCombo, setPopCombo] = useState(0);
  const [popStreak, setPopStreak] = useState(0);
  const [popLives, setPopLives] = useState(3);
  const [popBest, setPopBest] = useState(0);
  const [popOver, setPopOver] = useState<{ score: number; best: boolean } | null>(null);
  const popTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const popLivesRef = useRef(3);

  function popClear() { if (popTimer.current) { clearTimeout(popTimer.current); popTimer.current = null; } }
  function startPop() {
    try { setPopBest(Number(localStorage.getItem("sutraSprint.popBest") || 0)); } catch {}
    popClear();
    setPopScore(0); setPopCombo(0); setPopStreak(0); setPopLives(3); popLivesRef.current = 3;
    setPopOver(null); setPopHit(null);
    setPopRound(null); setPopPhase("hidden");
    setView("pop");
    popNext(0, 380);
  }
  function popNext(streak: number, delay: number) {
    popClear();
    popTimer.current = setTimeout(() => {
      setPopRound(buildPopRound(streak)); setPopHit(null); setPopPhase("up");
      popTimer.current = setTimeout(() => popMiss(streak, null), popUpMs(streak));
    }, delay);
  }
  function popMiss(streak: number, hole: number | null) {
    popClear();
    setPopPhase("miss"); setPopHit(hole); setPopCombo(0);
    sound.wrong(); haptic(34);
    const lives = popLivesRef.current - 1;
    popLivesRef.current = lives; setPopLives(lives);
    if (lives <= 0) { popTimer.current = setTimeout(() => popEnd(), 650); return; }
    popNext(streak, 750);
  }
  function popWhack(hole: number) {
    if (!popRound || popPhase !== "up" || popRound.holes[hole] === null) return;
    if (popRound.holes[hole] !== popRound.answer) { popMiss(popStreak, hole); return; }
    popClear();
    const combo = popCombo + 1, streak = popStreak + 1;
    setPopPhase("hit"); setPopHit(hole); setPopCombo(combo); setPopStreak(streak);
    setPopScore((sc) => sc + popPoints(combo));
    sound.correct(); haptic(14);
    if (combo % 5 === 0) confetti.burstCenter(40, 0.4);
    popNext(streak, 420);
  }
  function popEnd() {
    popClear();
    setPopScore((sc) => {
      const best = sc > popBest;
      if (best) { setPopBest(sc); try { localStorage.setItem("sutraSprint.popBest", String(sc)); } catch {} }
      setPopOver({ score: sc, best });
      return sc;
    });
    if (!guest && popStreak > 0) fireQuest("correct_answer", popStreak);
  }
  /* Leaving the view mid-round must not leave a balloon timer running. */
  useEffect(() => { if (view !== "pop") popClear(); }, [view]);

  /* ---------- Odd One Out ---------- */
  const [oddRound, setOddRound] = useState<OddRound | null>(null);
  const [oddPick, setOddPick] = useState<string | null>(null);
  const [oddStreak, setOddStreak] = useState(0);
  const [oddBest, setOddBest] = useState(0);
  const [oddOver, setOddOver] = useState<{ streak: number; best: boolean } | null>(null);

  function startOdd() {
    try { setOddBest(Number(localStorage.getItem("sutraSprint.oddBest") || 0)); } catch {}
    setOddStreak(0); setOddPick(null); setOddOver(null);
    setOddRound(buildOddRound());
    setView("odd");
  }

  function onOddPick(id: string) {
    if (!oddRound || oddPick || oddOver) return;
    setOddPick(id);
    if (id === oddRound.oddId) {
      const streak = oddStreak + 1;
      setOddStreak(streak); sound.correct(); haptic(14);
      setTimeout(() => { setOddPick(null); setOddRound(buildOddRound()); }, 620);
    } else {
      sound.wrong(); haptic(34);
      const best = oddStreak > oddBest;
      if (best) {
        setOddBest(oddStreak);
        try { localStorage.setItem("sutraSprint.oddBest", String(oddStreak)); } catch {}
      }
      setTimeout(() => setOddOver({ streak: oddStreak, best }), 900);
      if (!guest && oddStreak > 0) fireQuest("correct_answer", oddStreak);
    }
  }

  /* ---------- Sort ---------- */
  const [sortRound, setSortRound] = useState<SortRound | null>(null);
  const [sortPicked, setSortPicked] = useState<string[]>([]);
  const [sortBad, setSortBad] = useState<string | null>(null);
  const [sortStreak, setSortStreak] = useState(0);
  const [sortBest, setSortBest] = useState(0);
  const [sortOver, setSortOver] = useState<{ streak: number; best: boolean } | null>(null);

  function startSort() {
    try { setSortBest(Number(localStorage.getItem("sutraSprint.sortBest") || 0)); } catch {}
    setSortStreak(0); setSortPicked([]); setSortBad(null); setSortOver(null);
    setSortRound(buildSortRound(4));
    setView("sortg");
  }

  function onSortPick(id: string) {
    if (!sortRound || sortBad || sortOver || sortPicked.includes(id)) return;
    const want = sortedIds(sortRound)[sortPicked.length];
    if (id === want) {
      const next = [...sortPicked, id];
      setSortPicked(next);
      sound.click();
      if (next.length === sortRound.cards.length) {
        const streak = sortStreak + 1;
        setSortStreak(streak); sound.correct(); confetti.burstCenter(70, 0.45);
        setTimeout(() => { setSortPicked([]); setSortRound(buildSortRound(4)); }, 700);
      }
    } else {
      setSortBad(id); sound.wrong(); haptic(34);
      const best = sortStreak > sortBest;
      if (best) {
        setSortBest(sortStreak);
        try { localStorage.setItem("sutraSprint.sortBest", String(sortStreak)); } catch {}
      }
      setTimeout(() => setSortOver({ streak: sortStreak, best }), 900);
      if (!guest && sortStreak > 0) fireQuest("correct_answer", sortStreak);
    }
  }

  /* ---------- Memory ----------
     The same round as Number Match, face down. Pairing is identical; what
     changes is that you have to remember where things were. */
  const [memTiles, setMemTiles] = useState<MatchTile[]>([]);
  const [memUp, setMemUp] = useState<string[]>([]);
  const [memDone, setMemDone] = useState<string[]>([]);
  const [memTurns, setMemTurns] = useState(0);
  const [memBest, setMemBest] = useState(0);
  const [memOver, setMemOver] = useState<{ turns: number; best: boolean } | null>(null);
  const memBusy = useRef(false);

  function startMemory(seed?: number) {
    try { setMemBest(Number(localStorage.getItem("sutraSprint.memBest") || 0)); } catch {}
    setMemTiles(
      (seed === undefined
        ? buildMatchRound(6, "easy")
        : withSeededRandom(seededRandom(seed), () => buildMatchRound(6, "easy"))
      ).tiles
    );
    setMemUp([]); setMemDone([]); setMemTurns(0); setMemOver(null);
    memBusy.current = false;
    setView("memory");
  }

  function onMemTap(tile: MatchTile) {
    if (memBusy.current || memOver) return;
    if (memDone.includes(tile.id) || memUp.includes(tile.id)) return;
    const up = [...memUp, tile.id];
    if (up.length < 2) { setMemUp(up); sound.click(); return; }
    setMemUp(up);
    setMemTurns((t) => t + 1);
    const [a, b] = up.map((id) => memTiles.find((t) => t.id === id)!);
    if (isPair(a, b)) {
      const done = [...memDone, a.id, b.id];
      sound.correct(); haptic(16);
      setMemDone(done); setMemUp([]);
      if (done.length === memTiles.length) {
        const turns = memTurns + 1;
        const best = memBest === 0 || turns < memBest;   /* fewer turns is better */
        if (best) {
          setMemBest(turns);
          try { localStorage.setItem("sutraSprint.memBest", String(turns)); } catch {}
        }
        setMemOver({ turns, best });
        recordDailyGame(turns);
        confetti.burstCenter(140, 0.5); sound.levelUp();
      }
    } else {
      /* Long enough to commit them to memory — that is the whole game. */
      memBusy.current = true;
      sound.wrong();
      setTimeout(() => { setMemUp([]); memBusy.current = false; }, 900);
    }
  }

  /* ---------- Math Tic-Tac-Toe ----------
     Three ways to play one board: pass the phone, the CPU, or a friend over
     a room. Level 1 is plain tic-tac-toe; from level 2 a sum guards each
     square. The board logic is pure (ttt.ts); online, the server owns it. */
  /* "Learn with a teacher" sheet — which link opened it travels with the enquiry. */
  const [classesFrom, setClassesFrom] = useState<string | null>(null);
  useEffect(() => {
    if (!classesFrom) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setClassesFrom(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [classesFrom]);
  const [tttMode, setTttMode] = useState<null | "local" | "cpu" | "online">(null);
  const [tttLevel, setTttLevel] = useState<TTTLevel>(1);
  const [ttt, setTtt] = useState<TTTState | null>(null);
  const [tttSel, setTttSel] = useState<number | null>(null);
  const [tttScore, setTttScore] = useState({ X: 0, O: 0, draw: 0 });
  const [tttRoom, setTttRoom] = useState<RoomView | null>(null);
  const [tttJoinCode, setTttJoinCode] = useState("");
  const [tttNote, setTttNote] = useState<string | null>(null);
  const [tttBusy, setTttBusy] = useState(false);
  const tttStarterRef = useRef<Mark>("X");

  function openTtt() { setTttMode(null); setTtt(null); setTttRoom(null); setTttNote(null); setTttSel(null); setView("ttt"); }
  function startTttLocal(mode: "local" | "cpu") {
    setTttMode(mode); setTttRoom(null); setTttSel(null); setTttNote(null);
    tttStarterRef.current = "X";
    setTtt(tttNewGame("X", tttLevel));
  }
  async function startTttOnline() {
    if (guestLocked("ttt-online")) return;
    setTttBusy(true);
    try {
      const room = await tttCreateAction(tttLevel);
      setTttRoom(room); setTtt(room.state); setTttMode("online"); setTttNote(null);
    } catch { setTttNote(lang === "ja" ? "部屋を作れませんでした" : "Could not make a room"); }
    setTttBusy(false);
  }
  async function joinTttOnline(code: string) {
    if (guestLocked("ttt-online")) return;
    setTttBusy(true);
    const res = await tttJoinAction(code);
    setTttBusy(false);
    if ("error" in res) { setTttNote(res.error); return; }
    setTttRoom(res); setTtt(res.state); setTttMode("online"); setTttNote(null); setTttSel(null); setView("ttt");
  }
  async function challengeFriendTtt(friendId: string) {
    setTttBusy(true);
    const res = await tttChallengeFriendAction(friendId, tttLevel);
    setTttBusy(false);
    if ("error" in res) { setFriendNote(res.error); return; }
    setTttRoom(res); setTtt(res.state); setTttMode("online"); setTttNote(null); setTttSel(null);
    setFriendsOpen(false); setView("ttt");
    spawnToast(lang === "ja" ? "挑戦状を送りました！" : "Challenge sent!", null);
  }
  const tttMe: Mark = tttMode === "online" ? (tttRoom?.you ?? "X") : tttMode === "cpu" ? "X" : (ttt?.turn ?? "X");
  const tttMyTurn = !!ttt && !ttt.winner && (tttMode === "local" || ttt.turn === tttMe) && (tttMode !== "online" || !!tttRoom?.guestName);

  function tttTap(i: number) {
    if (!ttt || !tttMyTurn || ttt.cells[i].owner || tttBusy) return;
    if (ttt.level === 1) { void tttCommit(i, 0); return; }
    setTttSel(i); sound.click();
  }
  async function tttCommit(i: number, chosen: number) {
    if (!ttt) return;
    setTttSel(null);
    if (tttMode === "online" && tttRoom) {
      setTttBusy(true);
      const res = await tttMoveAction(tttRoom.code, i, chosen);
      setTttBusy(false);
      if ("error" in res) { setTttNote(res.error); return; }
      const was = ttt; setTttRoom(res); setTtt(res.state);
      if (res.state.cells[i].owner) { sound.correct(); haptic(14); } else if (was.level > 1) sound.wrong();
      return;
    }
    const next = tttPlay(ttt, i, chosen);
    if (next.cells[i].owner) { sound.correct(); haptic(14); } else sound.wrong();
    setTtt(next);
    if (next.winner) tttSettle(next);
  }
  function tttSettle(st: TTTState) {
    const k = st.winner === "draw" ? "draw" : (st.winner as Mark);
    setTttScore((sc) => ({ ...sc, [k]: sc[k] + 1 }));
    if (st.winner !== "draw" && (tttMode === "local" || st.winner === "X")) { confetti.burstCenter(120, 0.5); sound.levelUp(); }
  }
  /* The side on turn ran out of time. Locally we pass the turn here; online
     the server settles it on the next poll, so the clock is display-only. */
  function tttTimeUp() {
    if (!ttt || ttt.winner || tttMode === "online") return;
    setTttSel(null); sound.wrong(); haptic(20);
    setTtt(tttPass(ttt));
  }
  function tttRematch() {
    if (tttMode === "online" && tttRoom) {
      tttRematchAction(tttRoom.code).then((res) => { if (!("error" in res)) { setTttRoom(res); setTtt(res.state); } });
      return;
    }
    tttStarterRef.current = tttStarterRef.current === "X" ? "O" : "X";
    setTtt(tttNewGame(tttStarterRef.current, tttLevel)); setTttSel(null);
  }
  /* The CPU plays O, a beat after you, and always answers its own sums. */
  useEffect(() => {
    if (view !== "ttt" || tttMode !== "cpu" || !ttt || ttt.winner || ttt.turn !== "O") return;
    const id = setTimeout(() => {
      const i = tttCpu(ttt.cells, "O", ttt.level === 1);
      if (i < 0) return;
      const next = tttPlay(ttt, i, ttt.cells[i].answer);
      setTtt(next); sound.click();
      if (next.winner) tttSettle(next);
    }, 650);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ttt, tttMode, view]);
  /* Online: poll the room while it is on screen. Tic-tac-toe does not need
     a socket; a move every few seconds is the whole traffic. */
  useEffect(() => {
    if (view !== "ttt" || tttMode !== "online" || !tttRoom) return;
    const code = tttRoom.code;
    const id = setInterval(async () => {
      try {
        const r = await tttRoomAction(code);
        if (r) { setTttRoom(r); setTtt(r.state); }
      } catch {}
    }, 1500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, tttMode, tttRoom?.code]);
  async function shareTttRoom() {
    if (!tttRoom) return;
    const url = `${window.location.origin}/?ttt=${tttRoom.code}`;
    try { if (navigator.share) { await navigator.share({ title: "Sutra Sprint", text: lang === "ja" ? "○×で対決しよう！" : "Tic-tac-toe me!", url }); return; } } catch { return; }
    try { await navigator.clipboard.writeText(url); spawnToast(lang === "ja" ? "リンクをコピーしました" : "Link copied", null); } catch {}
  }

  /* ---------- quick games (one view, many generators) ---------- */
  const [quickRound, setQuickRound] = useState<QuickRound | null>(null);
  const [quickPick, setQuickPick] = useState<number | null>(null);
  const [quickStreak, setQuickStreak] = useState(0);
  const [quickBest, setQuickBest] = useState(0);
  const [quickOver, setQuickOver] = useState<{ streak: number; best: boolean } | null>(null);
  const quickBestKey = (id: string) => `sutraSprint.quick.${id}`;

  function startQuick(id: string) {
    const g = quickGame(id);
    if (!g) return;
    try { setQuickBest(Number(localStorage.getItem(quickBestKey(id)) || 0)); } catch {}
    setQuickId(id); setQuickStreak(0); setQuickPick(null); setQuickOver(null);
    setQuickRound(g.next(0, lang));
    setView("quick");
  }

  function onQuickPick(i: number) {
    const g = quickGame(quickId);
    if (!g || !quickRound || quickPick !== null || quickOver) return;
    setQuickPick(i);
    if (i === quickRound.answer) {
      const streak = quickStreak + 1;
      setQuickStreak(streak); sound.correct(); haptic(14);
      /* Long enough to read the trick under the answer — that is the lesson. */
      setTimeout(() => { setQuickPick(null); setQuickRound(g.next(streak, lang)); }, 1100);
    } else {
      sound.wrong(); haptic(34);
      const best = quickStreak > quickBest;
      if (best) {
        setQuickBest(quickStreak);
        try { localStorage.setItem(quickBestKey(quickId), String(quickStreak)); } catch {}
      }
      setTimeout(() => setQuickOver({ streak: quickStreak, best }), 1500);
      if (!guest && quickStreak > 0) fireQuest("correct_answer", quickStreak);
    }
  }

  /* ---------- Matchstick Sprint ----------
     The dojo's puzzles, three in a row against a clock. Rides on the arena
     view: sprintRef says "we are sprinting", checkSolved consults it. */
  const sprintRef = useRef<{ order: number[]; at: number; started: number } | null>(null);
  const [sprintOver, setSprintOver] = useState<{ secs: number; best: boolean } | null>(null);
  const [sprintBest, setSprintBest] = useState(0);
  const [sprintAt, setSprintAt] = useState(0);

  function startSprint() {
    try { setSprintBest(Number(localStorage.getItem("sutraSprint.sprintBest") || 0)); } catch {}
    const order = shuffle(PUZZLES.map((_, i) => i)).slice(0, SPRINT_LEN);
    sprintRef.current = { order, at: 0, started: Date.now() };
    setSprintAt(0); setSprintOver(null);
    loadPuzzle(order[0]);
    setView("arena");
  }

  function sprintAdvance() {
    const sp = sprintRef.current;
    if (!sp) return;
    sp.at += 1;
    if (sp.at >= sp.order.length) {
      const secs = Math.round((Date.now() - sp.started) / 1000);
      const best = sprintBest === 0 || secs < sprintBest;
      if (best) {
        setSprintBest(secs);
        try { localStorage.setItem("sutraSprint.sprintBest", String(secs)); } catch {}
      }
      sprintRef.current = null;
      setSprintOver({ secs, best });
      confetti.burstCenter(140, 0.5); sound.levelUp();
      return;
    }
    setSprintAt(sp.at);
    loadPuzzle(sp.order[sp.at]);
  }

  function endBlitz(finalScore: number) {
    const lvl = blitzLevelRef.current;
    fireQuest("blitz_score", finalScore);
    if (finalScore >= 10 && friends.length > 0) sayLine("blitzGood");
    blitzBoostRef.current = false;
    setBlitzBoost(false);
    /* A run started from a duel settles it — once, server-side. */
    if (activeDuelId) {
      const duel = duels.find((d) => d.id === activeDuelId);
      const id = activeDuelId;
      setActiveDuelId(null);
      answerChallengeAction(id, finalScore)
        .then((res) => {
          if (res.ok) {
            setDuelResult({ won: !!res.won, opponent: duel?.opponentName ?? "" });
            sayLine(res.won ? "duelWon" : "duelLost");
            if (res.won) confetti.burstCenter(140, 0.5);
          }
          refreshFriends();
        })
        .catch(() => {});
    }
    setBlitzOver(true);
    /* A rematch was queued before this run: send the score straight back to
       whoever was being answered, rather than making them find the name again. */
    const rm = rematchRef.current;
    if (rm) {
      rematchRef.current = null;
      challengeAction(rm.id, finalScore, lvl)
        .then((r) => {
          if (r.ok) {
            spawnToast(
              lang === "ja" ? `${rm.name} さんに送りました！` : `Sent to ${rm.name}!`,
              null
            );
            refreshFriends();
          }
        })
        .catch(() => {});
    }
    if (finalScore > (blitzBests[lvl] ?? 0)) {
      setBlitzBests((b) => ({ ...b, [lvl]: finalScore }));
      setBlitzJustBeatBest(true);
      try {
        localStorage.setItem(`sutraSprint.blitzBest.${lvl}`, String(finalScore));
      } catch {}
    }
    sound.stageClear();
    haptic([30, 50, 30, 50, 80]);
  }

  function blitzResolve(ok: boolean) {
    if (blitzAnsweredRef.current) return;
    blitzAnsweredRef.current = true;
    if (blitzTimeoutRef.current) {
      clearTimeout(blitzTimeoutRef.current);
      blitzTimeoutRef.current = null;
    }
    setBlitzFeedback(ok ? "ok" : "bad");
    if (ok) {
      const nextScore = blitzScore + 1;
      setBlitzScore(nextScore);
      confetti.burstFromEl(blitzCardRef.current, 14);
      sound.correct();
      haptic(15);
      setTimeout(() => {
        setBlitzFeedback(null);
        newBlitzQuestion(nextScore);
      }, 450);
    } else {
      sound.wrong();
      haptic([25, 45, 25]);
      const nextHearts = blitzHearts - 1;
      setBlitzHearts(Math.max(0, nextHearts));
      setTimeout(() => {
        setBlitzFeedback(null);
        if (nextHearts <= 0) endBlitz(blitzScore);
        else newBlitzQuestion(blitzScore);
      }, 450);
    }
  }

  function onBlitzSelect(v: number) {
    if (!blitzProblem || blitzAnsweredRef.current) return;
    sound.click();
    blitzResolve(v === blitzProblem.answer);
  }

  useEffect(() => {
    if (view !== "blitz" || !blitzProblem || blitzOver) return;
    blitzTimeoutRef.current = setTimeout(() => blitzResolve(false), blitzTimerMs);
    return () => {
      if (blitzTimeoutRef.current) clearTimeout(blitzTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blitzProblem, view]);

  /* ================= RENDER ================= */
  /* An invite link lands on /?race=<id>. Enter it once, then strip the query
     so a reload does not try to re-enter a race already taken. */
  const raceHandledRef = useRef(false);
  useEffect(() => {
    if (raceHandledRef.current) return;
    let raceId: string | null = null;
    try {
      raceId = new URLSearchParams(window.location.search).get("race");
    } catch {}
    let tttCode: string | null = null;
    try { tttCode = new URLSearchParams(window.location.search).get("ttt"); } catch {}
    if (tttCode) {
      raceHandledRef.current = true;
      window.history.replaceState({}, "", window.location.pathname);
      if (guest) { setLockOpen("ttt-online"); return; }
      void joinTttOnline(tttCode);
      return;
    }
    if (!raceId) return;
    raceHandledRef.current = true;
    window.history.replaceState({}, "", window.location.pathname);
    (async () => {
      const rows = (await competitionsAction()).rows;
      setComps(rows);
      const c = rows.find((r) => r.id === raceId);
      if (!c) return;
      if (c.myScore !== null || c.status !== "live") {
        setFriendsOpen(true);
        return;
      }
      beginCompetition(c);
    })();
  }, []);

  /* The other half of guest play: someone who just signed up arrives here with
     their guest run still in localStorage. Hand it to the server once, merge
     the result into what is on screen, and clear the key so it cannot be
     re-imported into a second account later. */
  const adoptedRef = useRef(false);
  useEffect(() => {
    if (guest || adoptedRef.current) return;
    adoptedRef.current = true;
    let raw: string | null = null;
    try {
      raw = localStorage.getItem("sutraSprint.guestProgress");
    } catch {}
    if (!raw) return;
    (async () => {
      try {
        const saved = JSON.parse(raw) as ProgressState;
        if (!saved?.topics || !Object.keys(saved.topics).length) return;
        const res = await importGuestProgressAction(saved);
        if (!res.ok) return;
        setProgress((prev) => {
          const topics = { ...prev.topics };
          for (const [id, row] of Object.entries(saved.topics)) {
            const cur = topics[id] ?? { cleared: 0, stageStars: {} };
            const stars = { ...cur.stageStars };
            for (const [k, v] of Object.entries(row.stageStars ?? {})) {
              stars[k] = Math.max(stars[k] || 0, Number(v) || 0);
            }
            topics[id] = { cleared: Math.max(cur.cleared, row.cleared || 0), stageStars: stars };
          }
          return { ...prev, topics };
        });
        spawnToast(
          lang === "ja" ? "おためしの記録を引き継ぎました！" : "Your guest progress was saved!",
          null
        );
      } catch {}
      try {
        localStorage.removeItem("sutraSprint.guestProgress");
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guest]);

  /* A guest's progress lives in the browser until they make an account.
     Written on every change rather than on unload: a phone tab can be killed
     without ever firing one. */
  const GUEST_KEY = "sutraSprint.guestProgress";
  useEffect(() => {
    if (!guest) return;
    try {
      localStorage.setItem(GUEST_KEY, JSON.stringify(progress));
    } catch {}
  }, [guest, progress]);

  /* ---------- notifications ----------
     Opt-in and reversible, and the row only appears when the server actually
     has VAPID keys and the browser supports push — a toggle that cannot work
     is worse than no toggle. The permission prompt is only ever raised by the
     tap, never on load. */
  const [pushKey, setPushKey] = useState<string | null>(null);
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    if (guest) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    (async () => {
      try {
        const st = await pushStatusAction();
        if (!st.configured || !st.publicKey) return;
        setPushKey(st.publicKey);
        const reg = await navigator.serviceWorker.ready;
        setPushOn(!!(await reg.pushManager.getSubscription()));
      } catch {}
    })();
  }, [guest]);

  async function togglePush() {
    if (!pushKey || pushBusy) return;
    setPushBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        await removePushSubscriptionAction(existing.endpoint);
        await existing.unsubscribe();
        setPushOn(false);
      } else {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") {
          spawnToast(lang === "ja" ? "通知はブロックされています" : "Notifications are blocked", null);
          return;
        }
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(pushKey),
        });
        const res = await savePushSubscriptionAction(sub.toJSON());
        if (res.ok) {
          setPushOn(true);
          spawnToast(lang === "ja" ? "通知をオンにしました" : "Notifications on", null);
        } else {
          await sub.unsubscribe();
        }
      }
    } catch {
      spawnToast(lang === "ja" ? "通知を設定できませんでした" : "Could not set up notifications", null);
    } finally {
      setPushBusy(false);
    }
  }

  /* ---------- add to home screen ----------
     Chrome and Edge fire beforeinstallprompt and suppress their own banner if
     you call preventDefault; keeping the event lets the game offer the install
     from the profile sheet, where it reads as a choice rather than a nag.
     Safari never fires it, so the button simply never appears there. */
  const installEvtRef = useRef<Event | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  useEffect(() => {
    function onPrompt(e: Event) {
      e.preventDefault();
      installEvtRef.current = e;
      setCanInstall(true);
    }
    function onInstalled() {
      installEvtRef.current = null;
      setCanInstall(false);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function onInstall() {
    const evt = installEvtRef.current as (Event & { prompt?: () => Promise<void> }) | null;
    if (!evt?.prompt) return;
    await evt.prompt();
    installEvtRef.current = null;
    setCanInstall(false);
  }

  /* ---------- keyboard play ----------
     On a laptop the whole game was mouse-only: you could type an answer but
     not pick a tile, and Blitz is a speed mode where reaching for the mouse
     is the slow part. Number keys pick the nth option, Enter checks or moves
     on, Escape goes back. */
  const keyableModes = ["choice", "target", "balloon", "numberline", "arcade", "catch"];
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      /* Never steal a keystroke aimed at a field. */
      const el = document.activeElement;
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement ||
        (el instanceof HTMLElement && el.isContentEditable);

      if (e.key === "Escape" && !typing) {
        if (view !== "home") {
          e.preventDefault();
          handleBack();
        }
        return;
      }

      if (view === "practice" && curProblem) {
        if (e.key === "Enter" && checkEnabled && !typing) {
          e.preventDefault();
          checkPractice();
          return;
        }
        if (typing) return;
        const n = Number(e.key);
        if (!Number.isInteger(n) || n < 1) return;
        if (curMode === "truefalse") {
          if (n <= 2) {
            e.preventDefault();
            submitSelection(n === 1);
          }
          return;
        }
        if (!keyableModes.includes(curMode)) return;
        /* The number line is drawn in ascending order, so key 1 has to mean
           the leftmost dot, not the first element of the unsorted array. */
        const opts = curMode === "numberline" ? [...tileOptions].sort((a, b) => a - b) : tileOptions;
        const pick = opts[n - 1];
        if (pick === undefined || eliminated.includes(pick)) return;
        e.preventDefault();
        submitSelection(pick);
        return;
      }

      if (view === "blitz" && blitzProblem && !typing) {
        const n = Number(e.key);
        if (Number.isInteger(n) && n >= 1 && n <= blitzOptions.length) {
          e.preventDefault();
          onBlitzSelect(blitzOptions[n - 1]);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, curMode, curProblem, tileOptions, eliminated, checkEnabled, blitzProblem, blitzOptions]);

  return (
    <div id="app" data-skin={skin.skinId}>
      <div className="sparkle-field">
        {sparkles.map((s, i) => (
          <span
            key={i}
            style={{ left: `${s.left}%`, top: `${s.top}%`, animationDelay: `${s.delay}s`, fontSize: `${s.size}px` }}
          >
            {sparkleGlyphs[i % sparkleGlyphs.length]}
          </span>
        ))}
      </div>

      <div className="sakura-field">
        {sakura.map((s, i) => (
          <span
            key={i}
            style={{
              left: `${s.left}%`,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.duration}s`,
              fontSize: `${s.size}px`,
              "--sway": `${s.sway}px`,
            } as React.CSSProperties}
          >
            🍁
          </span>
        ))}
      </div>

      <header>
        {view === "home" && (
          <button className="back-btn avatar-btn" aria-label={t.menu.accountLabel} onClick={() => setMenuOpen((o) => !o)}>
            {(user.name?.[0] || user.email?.[0] || "?").toUpperCase()}
          </button>
        )}
        <button
          className="header-home"
          onClick={goHome}
          aria-label={ja ? "ホームへ" : "Go to home"}
        >
          <img src="/brand/vedank-mark.png" alt="" className="header-mark" />
        </button>
        <div className="header-title"><h1>{headerTitle}</h1></div>
        <div className="stats-row">
          <button className="stat stat-flame" onClick={() => openShare("streak")} aria-label={`${t.share.statBestStreak} ${bestStreakEver} — ${t.share.shareBtn}`}>
            <span aria-hidden="true">🔥</span> {bestStreakEver}
          </button>
          <button className={`stat stat-gem${gemPop ? " pop" : ""}`} onClick={() => openShare("gems")} aria-label={`${t.share.statGems} ${gems} — ${t.share.shareBtn}`}>
            <span aria-hidden="true">💎</span> {gems}
          </button>
          <button className="stat stat-heart" onClick={() => openShare("hearts")} aria-label={`${t.share.statHearts} ${hearts} — ${t.share.shareBtn}`}>
            <span aria-hidden="true">❤️</span> {hearts}
          </button>
        </div>
      </header>

      {menuOpen && (
        <>
          <div className="menu-overlay" onClick={() => setMenuOpen(false)} />
          <div className="account-menu">
            <div className="account-menu-head">
              <div className="avatar-btn avatar-lg">{(user.name?.[0] || user.email?.[0] || "?").toUpperCase()}</div>
              <div>
                <div className="account-name">{user.name || t.menu.player}</div>
                <div className="account-email">{user.email}</div>
              </div>
            </div>
            {canInstall && (
              <button className="menu-row menu-row-install" onClick={onInstall}>
                <span>📲 {lang === "ja" ? "ホーム画面に追加" : "Add to home screen"}</span>
                <span className="menu-row-val">{lang === "ja" ? "インストール" : "Install"}</span>
              </button>
            )}
            {pushKey && (
              <button className="menu-row" onClick={togglePush} disabled={pushBusy}>
                <span>🔔 {lang === "ja" ? "通知" : "Notifications"}</span>
                <span className="menu-row-val">
                  {pushBusy ? "…" : pushOn ? (lang === "ja" ? "オン" : "On") : (lang === "ja" ? "オフ" : "Off")}
                </span>
              </button>
            )}
            <button className="menu-row" onClick={sound.toggle}>
              <span>{sound.on ? "🔊" : "🔇"} {t.menu.sound}</span>
              <span className="menu-row-val">{sound.on ? t.menu.on : t.menu.off}</span>
            </button>
            <button className="menu-row" onClick={theme.cycle}>
              <span>{theme.theme === "dark" ? "🌙" : theme.theme === "light" ? "☀️" : "🖥️"} {t.menu.theme}</span>
              <span className="menu-row-val">{theme.theme === "system" ? t.menu.auto : theme.theme === "light" ? t.menu.light : t.menu.dark}</span>
            </button>
            <button className="menu-row" onClick={langHook.toggle}>
              <span>🌐 {t.menu.language}</span>
              <span className="menu-row-val">{lang === "ja" ? "日本語" : "English"}</span>
            </button>
            {classesEnabled && lang === "ja" && <button className="menu-row" onClick={() => { setMenuOpen(false); setClassesFrom("menu"); }}>
              <span>👩‍🏫 Ray先生と学ぶ（授業）</span>
              <span className="menu-row-val">›</span>
            </button>}
            <button className="menu-row" onClick={() => { setMenuOpen(false); setClassOpen(true); setClassNote(null); refreshClasses(); }}>
              <span>🏫 {ja ? "クラス" : "Class"}</span>
              <span className="menu-row-val">
                {enrolled.length ? enrolled[0].name : ja ? "未参加" : "Not joined"}
              </span>
            </button>
            <button className="menu-row" onClick={() => { setMenuOpen(false); openFriends(); }}>
              <span>👥 {lang === "ja" ? "フレンド" : "Friends"}</span>
              <span className="menu-row-val">
                {friends.length}{pendingDuels > 0 ? ` · ⚔️ ${pendingDuels}` : ""}
              </span>
            </button>
            <button className="menu-row" onClick={() => { setMenuOpen(false); setShopOpen(true); refreshShop(); }}>
              <span>🛍️ {lang === "ja" ? "ショップ" : "Shop"}</span>
              <span className="menu-row-val mono">💎 {gemBalance ?? "…"}</span>
            </button>
            {buddyPos.pos && (
              <button className="menu-row" onClick={buddyPos.reset}>
                <span>📍 {ja ? "バディの位置をもどす" : "Reset buddy position"}</span>
                <span className="menu-row-val">›</span>
              </button>
            )}
            <button className="menu-row" onClick={buddy.toggleHidden}>
              <span>🧚 {ja ? "バディ" : "Buddy"}</span>
              <span className="menu-row-val">{buddy.hidden ? t.menu.off : t.menu.on}</span>
            </button>
            <button className="menu-row" onClick={() => setSkinsOpen((o) => !o)}>
              <span>🎨 {ja ? "衣装とテーマ" : "Outfit & theme"}</span>
              <span className="menu-row-val">{skinName(activeSkin, ja)}</span>
            </button>
            {skinsOpen && (
              <div className="skins-panel">
                {SKINS.map((s) => {
                  const ja = lang === "ja";
                  const unlocked = s.unlocked({ level: li.level, bossClears, solvedCount });
                  return (
                    <button
                      key={s.id}
                      className={`skin-row${skin.skinId === s.id ? " active" : ""}${unlocked ? "" : " locked"}`}
                      disabled={!unlocked}
                      onClick={() => unlocked && skin.selectSkin(s.id)}
                    >
                      <span className="skin-row-preview" style={{ background: s.swatch }}>
                        <Buddy skinId={s.id} mood="happy" animated={false} />
                      </span>
                      <span className="skin-row-body">
                        <span className="skin-row-name">
                          {skinName(s, ja)}
                          {!unlocked && <span className="skin-row-lock" aria-hidden="true"> 🔒</span>}
                        </span>
                        <span className="skin-row-note">
                          {unlocked ? skinBlurb(s, ja) : skinUnlockLabel(s, ja)}
                        </span>
                      </span>
                      {skin.skinId === s.id && <span className="skin-row-check" aria-hidden="true">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
            {isAdmin && (
              <>
                <div className="menu-divider" />
                <a className="menu-row menu-row-link" href="/admin">
                  <span>🛡️ Admin · Signups</span>
                  <span className="menu-row-val">→</span>
                </a>
              </>
            )}
            <div className="menu-divider" />
            <button className="menu-row menu-row-danger" onClick={() => signOut({ redirectTo: "/login" })}>
              <span>⏻ {t.menu.signOut}</span>
            </button>
          </div>
        </>
      )}

      {compBoard && (
        <>
          <div className="menu-overlay" onClick={() => setCompBoard(null)} />
          <div className="comp-board">
            <div className="comp-board-head">
              <span>🏅 {compBoard.name}</span>
              <button className="share-close" onClick={() => setCompBoard(null)} aria-label={t.share.close}>✕</button>
            </div>
            {compBoard.rows.length === 0 ? (
              <div className="friend-empty">{ja ? "まだ結果がありません。" : "No results yet."}</div>
            ) : (
              <ol className="comp-board-list">
                {compBoard.rows.map((r) => (
                  <li
                    key={r.userId}
                    className={`comp-board-row rank-${r.rank <= 3 ? r.rank : "n"}${r.name === (user.name ?? "") ? " me" : ""}`}
                  >
                    <span className="comp-rank mono">{r.rank}</span>
                    <span className="comp-who">{r.name}</span>
                    <span className="comp-detail mono">
                      {r.correct} · {(r.elapsedMs / 1000).toFixed(0)}s
                    </span>
                    <span className="comp-score mono">{r.score}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </>
      )}

      {blitzPicker && (
        <>
          <div className="menu-overlay" onClick={() => setBlitzPicker(false)} />
          <div className="sheet-panel">
            <div className="sheet-panel-title">
              <span>⚡ {ja ? "ブリッツのレベル" : "Choose your Blitz"}</span>
              <button className="share-close" onClick={() => setBlitzPicker(false)} aria-label={t.share.close}>✕</button>
            </div>
            <div className="lvl-list">
              {BLITZ_LEVELS.map((L) => (
                <button key={L.id} className="lvl-row" onClick={() => startBlitz(L.id)}>
                  <span className="lvl-icon">{L.icon}</span>
                  <span className="lvl-body">
                    <span className="lvl-name">
                      {ja ? L.nameJa : L.name}
                      <span className="lvl-clock mono">{(L.startMs / 1000).toFixed(0)}s</span>
                    </span>
                    <span className="lvl-blurb">{ja ? L.blurbJa : L.blurb}</span>
                  </span>
                  <span className="lvl-best">
                    {blitzBests[L.id] ? (
                      <>
                        <span className="lvl-best-num mono">{blitzBests[L.id]}</span>
                        <span className="lvl-best-lab">{t.blitz.best}</span>
                      </>
                    ) : (
                      <span className="lvl-best-new">{ja ? "はじめて" : "new"}</span>
                    )}
                  </span>
                </button>
              ))}
            </div>
            <div className="lvl-foot">
              {ja
                ? "暗算でとける問題だけが出ます。"
                : "Only questions you can do in your head."}
            </div>
          </div>
        </>
      )}

      {classOpen && (
        <>
          <div className="menu-overlay" onClick={() => setClassOpen(false)} />
          <div className="sheet-panel">
            <div className="sheet-panel-title">
              <span>🏫 {ja ? "クラス" : "Class"}</span>
              <span className="sheet-panel-count">{enrolled.length}</span>
            </div>

            <div className="friend-add">
              <input
                className="friend-add-input mono"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value)}
                placeholder={ja ? "クラスコード" : "Class code"}
                aria-label={ja ? "クラスコードを入力" : "Enter a class code"}
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={5}
              />
              <button className="friend-add-btn" onClick={onJoinClass} disabled={!classCode.trim()}>
                {ja ? "参加" : "Join"}
              </button>
            </div>
            {classNote && <div className="friend-note">{classNote}</div>}

            <div className="friend-list">
              {enrolled.map((e) => (
                <div key={e.id} className="friend-row">
                  <span className="friend-avatar">🏫</span>
                  <div className="friend-body">
                    <div className="friend-name">{e.name}</div>
                    <div className="friend-sub">{e.teacherName}</div>
                  </div>
                  <button
                    className="friend-remove"
                    aria-label={ja ? "退出" : "Leave"}
                    onClick={async () => {
                      await leaveClassAction(e.id);
                      refreshClasses();
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              {enrolled.length === 0 && (
                <div className="friend-empty">
                  {ja
                    ? "先生からもらったコードを入れてください。"
                    : "Enter the code your teacher gave you."}
                </div>
              )}
            </div>

            {classComps.length > 0 && (
              <div className="duel-history">
                <div className="duel-history-label">{ja ? "コンペティション" : "Competitions"}</div>
                {classComps.slice(0, 6).map((c) => (
                  <div key={c.id} className="duel-row">
                    <span className="duel-vs">{c.name}</span>
                    {c.myScore !== null ? (
                      <button className="duel-accept" onClick={() => openCompBoard(c.id)}>
                        🏅 {ja ? `${c.myRank} 位` : `#${c.myRank}`} · {c.myScore}
                      </button>
                    ) : c.status === "live" ? (
                      <button className="duel-accept" onClick={() => beginCompetition(c)}>
                        ▶ {ja ? "参加する" : "Enter"}
                      </button>
                    ) : (
                      <span className="duel-waiting">{ja ? "終了" : "ended"}</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <a className="quest-review-cta cls-teach-link" href="/classroom">
              🧑‍🏫 {ja ? "先生用：クラスを作る" : teachingCount > 0 ? `Teaching ${teachingCount} class${teachingCount === 1 ? "" : "es"}` : "I'm a teacher — make a class"}
            </a>
          </div>
        </>
      )}

      {lockOpen && (
        <>
          <div className="menu-overlay" onClick={() => setLockOpen(null)} />
          <div className="hint-sheet lock-sheet" role="dialog" aria-modal="true">
            <div className="lock-sheet-icon">🔒</div>
            <h3>{lang === "ja" ? "ここから先はアカウントが必要です" : "Sign up to unlock this"}</h3>
            <p>
              {lang === "ja"
                ? "おためしでは最初の2トピックと一部のゲームが遊べます。無料のアカウントを作ると、すべてのトピック・ゲーム・デイリーチャレンジ・マッチ棒道場が開き、今までの記録もそのまま引き継がれます。"
                : "Guests can play the first two topics and a few games. A free account opens every topic, every game, the Daily Challenge and the Matchstick Dojo — and keeps the progress you've made so far."}
            </p>
            <a className="btn btn-primary auth-submit" href="/signup?from=%2F">
              {lang === "ja" ? "無料でアカウントを作る" : "Create a free account"}
            </a>
            <a className="btn btn-ghost auth-submit lock-sheet-signin" href="/login?from=%2F">
              {lang === "ja" ? "アカウントがある人はサインイン" : "Already have an account? Sign in"}
            </a>
            <button className="btn btn-ghost lock-sheet-later" onClick={() => setLockOpen(null)}>
              {lang === "ja" ? "あとで" : "Not now"}
            </button>
          </div>
        </>
      )}

      {classesFrom && lang === "ja" && (
        <>
          <div className="menu-overlay" onClick={() => setClassesFrom(null)} />
          <div className="hint-sheet interest-sheet" role="dialog" aria-modal="true">
            <button className="interest-close" aria-label="閉じる" onClick={() => setClassesFrom(null)}>✕</button>
            <ClassesHero lang="ja" />
            <p className="interest-lede">
              詳しく知りたい方は、下のフォームを送るか、Ray先生に直接ご連絡ください。
            </p>
            <InterestForm lang="ja" source={classesFrom} onDone={() => setClassesFrom(null)} onClose={() => setClassesFrom(null)} />
          </div>
        </>
      )}

      {friendsOpen && (
        <>
          <div className="menu-overlay" onClick={() => setFriendsOpen(false)} />
          <div className="sheet-panel">
            <div className="sheet-panel-title">
              <span>👥 {lang === "ja" ? "フレンド" : "Friends"}</span>
              <span className="sheet-panel-count">{friends.length}</span>
            </div>

            <div className="friend-code-box">
              <div className="friend-code-label">
                {lang === "ja" ? "あなたのコード" : "Your code"}
              </div>
              <button className="friend-code mono" onClick={copyFriendCode}>
                {friendCode ?? "…"}
                <span className="friend-code-copy">{codeCopied ? "✅" : "📋"}</span>
              </button>
              <div className="friend-code-hint">
                {lang === "ja"
                  ? "このコードを友だちに教えると追加してもらえます。"
                  : "Share this code with a friend so they can add you."}
              </div>
            </div>

            <div className="friend-add">
              <input
                className="friend-add-input mono"
                value={addCode}
                onChange={(e) => setAddCode(e.target.value)}
                placeholder="VEDA-XXXXXX"
                aria-label={lang === "ja" ? "フレンドコードを入力" : "Enter a friend code"}
                autoCapitalize="characters"
                spellCheck={false}
              />
              <button className="friend-add-btn" onClick={onAddFriend} disabled={!addCode.trim()}>
                {lang === "ja" ? "追加" : "Add"}
              </button>
            </div>
            {friendNote && <div className="friend-note">{friendNote}</div>}

            {blitzOver && friends.length > 0 && (
              <div className="duel-send">
                <div className="duel-send-label">
                  {lang === "ja"
                    ? `${blitzScore}点で対戦を申し込む`
                    : `Challenge someone to beat ${blitzScore}`}
                </div>
                {friends.map((f) => (
                  <button key={f.id} className="duel-send-row" onClick={() => onChallenge(f.id)}>
                    <span className="duel-send-name">{f.name}</span>
                    <span className="duel-send-go">⚔️ {lang === "ja" ? "送る" : "Send"}</span>
                  </button>
                ))}
              </div>
            )}

            {/* ---- friends race: the class competition, hosted by a player ---- */}
            <div className="race-box">
              <div className="race-head">
                <span className="race-title">
                  🏁 {lang === "ja" ? "フレンド対決レース" : "Friends race"}
                </span>
                {!myLiveRace && friends.length > 0 && (
                  <button className="race-host-btn" onClick={() => setRaceFormOpen((o) => !o)}>
                    {raceFormOpen
                      ? lang === "ja" ? "やめる" : "Cancel"
                      : lang === "ja" ? "＋ 開催する" : "+ Host one"}
                  </button>
                )}
              </div>
              <div className="race-hint">
                {lang === "ja"
                  ? "全員が同じ問題に挑戦。正解数が優先、同点なら速さで決まります。"
                  : "Everyone sits the same paper. Correct answers come first; speed only splits a tie."}
              </div>

              {raceFormOpen && (
                <div className="race-form">
                  <input
                    className="friend-add-input"
                    value={raceName}
                    onChange={(e) => setRaceName(e.target.value)}
                    placeholder={lang === "ja" ? "レース名" : "Name the race"}
                    maxLength={60}
                  />
                  <div className="race-row">
                    <label className="race-field">
                      <span>{lang === "ja" ? "レベル" : "Level"}</span>
                      <select value={raceLevel} onChange={(e) => setRaceLevel(e.target.value)}>
                        {COMP_LEVELS.map((l) => (
                          <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                      </select>
                    </label>
                    <label className="race-field">
                      <span>{lang === "ja" ? "時間" : "Minutes"}</span>
                      <select value={raceMinutes} onChange={(e) => setRaceMinutes(Number(e.target.value))}>
                        {[1, 2, 3, 5, 10].map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <button className="btn btn-primary race-go" onClick={onHostRace}>
                    {lang === "ja" ? "レースを開始" : "Start the race"}
                  </button>
                </div>
              )}
              {raceNote && <div className="friend-note">{raceNote}</div>}

              {friendComps.length === 0 && !raceFormOpen && (
                <div className="friend-empty race-empty">
                  {friends.length === 0
                    ? lang === "ja"
                      ? "フレンドを追加するとレースを開けます。"
                      : "Add a friend and you can host a race."
                    : lang === "ja"
                      ? "まだレースがありません。開催してみよう！"
                      : "No races yet — host one."}
                </div>
              )}

              {friendComps.slice(0, 6).map((c) => (
                <div key={c.id} className="race-row-item">
                  <div className="race-row-body">
                    <div className="race-row-name">{c.name}</div>
                    <div className="race-row-sub mono">
                      {c.hostedByMe ? (lang === "ja" ? "あなたが開催" : "you host") : c.hostName}
                      {" · "}{c.levelName}
                      {" · "}{c.finished}/{c.entrants} {lang === "ja" ? "完走" : "done"}
                    </div>
                  </div>
                  {c.myScore !== null ? (
                    <button className="duel-accept" onClick={() => openCompBoard(c.id)}>
                      🏅 {lang === "ja" ? `${c.myRank} 位` : `#${c.myRank}`}
                    </button>
                  ) : c.status === "live" ? (
                    <button className="duel-accept" onClick={() => beginCompetition(c)}>
                      ▶ {lang === "ja" ? "参加" : "Enter"}
                    </button>
                  ) : (
                    <button className="duel-accept ghost" onClick={() => openCompBoard(c.id)}>
                      {lang === "ja" ? "結果" : "Results"}
                    </button>
                  )}
                  {c.status === "live" && (
                    <button
                      className="race-share"
                      aria-label={lang === "ja" ? "招待リンクを共有" : "Share invite link"}
                      onClick={() => onShareRace(c.id)}
                    >
                      {copiedRace === c.id ? "✅" : "🔗"}
                    </button>
                  )}
                  {c.hostedByMe && c.status === "live" && (
                    <button
                      className="friend-remove"
                      aria-label={lang === "ja" ? "終了" : "End"}
                      onClick={() => onEndRace(c.id)}
                    >
                      ■
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* ---- standings: the friends list as a table you can place in ---- */}
            {friends.length > 0 && (
              <div className="standings">
                <div className="duel-history-label">
                  {lang === "ja" ? "フレンドランキング" : "Friends standings"}
                </div>
                {[
                  { id: "__me", name: user.name || (lang === "ja" ? "あなた" : "You"), level: li.level, dailyStreak, me: true },
                  ...friends.map((f) => ({ id: f.id, name: f.name, level: f.level, dailyStreak: f.dailyStreak, me: false })),
                ]
                  .sort((a, b) => b.level - a.level || b.dailyStreak - a.dailyStreak || a.name.localeCompare(b.name))
                  .map((r, i) => (
                    <div key={r.id} className={`standings-row${r.me ? " me" : ""}`}>
                      <span className={`standings-rank rank-${i < 3 ? i + 1 : "n"}`}>{i + 1}</span>
                      <span className="standings-name">{r.name}</span>
                      <span className="standings-stat mono">
                        {t.share.statLevel} {r.level} · 🔥 {r.dailyStreak}
                      </span>
                    </div>
                  ))}
              </div>
            )}

            <div className="friend-list">
              {friends.map((f) => (
                <div key={f.id} className="friend-row">
                  <span className="friend-avatar">{f.name[0]?.toUpperCase() ?? "?"}</span>
                  <div className="friend-body">
                    <div className="friend-name">{f.name}</div>
                    <div className="friend-sub mono">
                      {t.share.statLevel} {f.level} · 🔥 {f.dailyStreak} · ⚔️ {f.wins}–{f.losses}
                    </div>
                  </div>
                  <button
                    className="friend-ttt"
                    title={lang === "ja" ? "○×で対戦" : "Tic-tac-toe"}
                    onClick={() => challengeFriendTtt(f.id)}
                    disabled={tttBusy}
                  >
                    ○✕
                  </button>
                  <button
                    className="friend-remove"
                    aria-label={lang === "ja" ? "削除" : "Remove"}
                    onClick={async () => {
                      await removeFriendAction(f.id);
                      refreshFriends();
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              {friends.length === 0 && (
                <div className="friend-empty">
                  {lang === "ja" ? "まだフレンドがいません。" : "No friends yet — swap codes!"}
                </div>
              )}
            </div>

            {duels.length > 0 && (
              <div className="duel-history">
                <div className="duel-history-label">{lang === "ja" ? "対戦記録" : "Duels"}</div>
                {duels.slice(0, 6).map((d) => (
                  <div key={d.id} className="duel-row">
                    <span className="duel-vs">{d.opponentName}</span>
                    {d.status === "open" ? (
                      d.incoming ? (
                        <button className="duel-accept" onClick={() => acceptDuel(d)}>
                          ⚔️ {lang === "ja" ? `${d.fromScore}点に挑む` : `Beat ${d.fromScore}`}
                        </button>
                      ) : (
                        <span className="duel-waiting mono">
                          {lang === "ja" ? "待機中" : "Waiting"} · {d.fromScore}
                        </span>
                      )
                    ) : (
                      <span className={`duel-result${d.won ? " won" : d.won === false ? " lost" : ""}`}>
                        <span className="mono">
                          {d.incoming ? d.toScore : d.fromScore}–{d.incoming ? d.fromScore : d.toScore}
                        </span>{" "}
                        {d.won === null ? (lang === "ja" ? "引き分け" : "Tie") : d.won ? (lang === "ja" ? "勝ち" : "Won") : (lang === "ja" ? "負け" : "Lost")}
                      </span>
                    )}
                    {d.status === "done" && (
                      <button
                        className="duel-rematch"
                        title={lang === "ja" ? "リベンジ" : "Rematch"}
                        onClick={() => onRematch(d.opponentId, d.opponentName, d.level)}
                      >
                        ⟳ {lang === "ja" ? "リベンジ" : "Rematch"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {duelResult && (
        <>
          <div className="menu-overlay" onClick={() => setDuelResult(null)} />
          <div className="duel-result-card">
            <div className="duel-result-icon">{duelResult.won ? "🏆" : "🤝"}</div>
            <h3>
              {duelResult.won
                ? lang === "ja" ? "勝ちました！" : "You won!"
                : lang === "ja" ? "おしい！" : "So close!"}
            </h3>
            <p>
              {lang === "ja"
                ? `${duelResult.opponent} との対戦`
                : `Duel with ${duelResult.opponent}`}
            </p>
            <button className="btn btn-primary" onClick={() => setDuelResult(null)}>
              {t.practice.continueBtn}
            </button>
          </div>
        </>
      )}

      {hintOpen && currentTopic && (
        <>
          <div className="menu-overlay" onClick={() => setHintOpen(false)} />
          <div className="hint-sheet" role="dialog" aria-modal="true">
            <div className="hint-sheet-head">
              <span>💡 {currentTopic.icon} {lang === "ja" ? currentTopic.titleJa : currentTopic.title}</span>
              <button className="share-close" onClick={() => setHintOpen(false)} aria-label={t.share.close}>✕</button>
            </div>
            <div className="hint-sutra">{currentTopic.sutraSa}</div>
            <ol className="hint-steps">
              {(lang === "ja" ? currentTopic.stepsJa : currentTopic.steps).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
            <button className="btn btn-primary hint-close-btn" onClick={() => setHintOpen(false)}>
              {t.practice.continueBtn}
            </button>
          </div>
        </>
      )}

      {questsOpen && (
        <>
          <div className="menu-overlay" onClick={() => setQuestsOpen(false)} />
          <div className="sheet-panel">
            <div className="sheet-panel-title">
              <span>📜 {lang === "ja" ? "今日のクエスト" : "Today's Quests"}</span>
              <span className="sheet-panel-count">
                {quests.filter((q) => q.claimed).length}/{quests.length}
              </span>
            </div>
            <div className="quest-list">
              {quests.map((q) => (
                <div key={q.id} className={`quest-row${q.claimed ? " claimed" : q.done ? " ready" : ""}`}>
                  <span className="quest-icon">{q.claimed ? "✅" : q.icon}</span>
                  <div className="quest-body">
                    <div className="quest-title">{lang === "ja" ? q.titleJa : q.title}</div>
                    <div className="quest-track">
                      <div
                        className="quest-fill"
                        style={{ width: `${Math.min(100, (q.count / q.target) * 100)}%` }}
                      />
                    </div>
                    <div className="quest-sub mono">
                      {Math.min(q.count, q.target)} / {q.target}
                    </div>
                  </div>
                  {q.claimed ? (
                    <span className="quest-done">{lang === "ja" ? "受取済" : "Claimed"}</span>
                  ) : q.done ? (
                    <button className="quest-claim" onClick={() => onClaimQuest(q.id)}>
                      +{q.reward} 💎
                    </button>
                  ) : (
                    <span className="quest-reward mono">+{q.reward} 💎</span>
                  )}
                </div>
              ))}
              {quests.length === 0 && (
                <div className="quest-empty">{lang === "ja" ? "読み込み中…" : "Loading…"}</div>
              )}
            </div>
            {reviewCount > 0 && (
              <button className="quest-review-cta" onClick={startReview}>
                🩹 {lang === "ja" ? `まちがい ${reviewCount} 問をなおす` : `Fix ${reviewCount} missed question${reviewCount === 1 ? "" : "s"}`}
              </button>
            )}
          </div>
        </>
      )}

      {shopOpen && (
        <>
          <div className="menu-overlay" onClick={() => setShopOpen(false)} />
          <div className="sheet-panel">
            <div className="sheet-panel-title">
              <span>🛍️ {lang === "ja" ? "ショップ" : "Shop"}</span>
              <span className="sheet-panel-count mono">
                💎 {gemBalance ?? "…"}
              </span>
            </div>
            {shopNote && <div className="shop-note">{shopNote}</div>}
            <div className="shop-list">
              {SHOP_ITEMS.map((item) => {
                const held =
                  item.id === "hint" ? inventory?.hintTokens
                  : item.id === "fifty" ? inventory?.fiftyTokens
                  : item.id === "timeBoost" ? inventory?.timeBoosts
                  : inventory?.streakFreezes;
                const full = (held ?? 0) >= item.max;
                const poor = (gemBalance ?? 0) < item.cost;
                return (
                  <div key={item.id} className="shop-row">
                    <span className="shop-icon">{item.icon}</span>
                    <div className="shop-body">
                      <div className="shop-title">
                        {lang === "ja" ? item.titleJa : item.title}
                        {(held ?? 0) > 0 && <span className="shop-held mono">×{held}</span>}
                      </div>
                      <div className="shop-blurb">{lang === "ja" ? item.blurbJa : item.blurb}</div>
                    </div>
                    <button
                      className="shop-buy"
                      disabled={full || poor || shopBusy === item.id}
                      onClick={() => onBuy(item.id)}
                    >
                      {full ? (lang === "ja" ? "最大" : "Max") : `💎 ${item.cost}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {achievementsOpen && (
        <>
          <div className="menu-overlay" onClick={() => setAchievementsOpen(false)} />
          <div className="sheet-panel">
            <div className="sheet-panel-title">
              <span>🏅 {lang === "ja" ? "実績" : "Achievements"}</span>
              <span className="sheet-panel-count">{unlockedAchievements}/{ACHIEVEMENTS.length}</span>
            </div>
            <div className="achievements-panel">
              {ACHIEVEMENTS.map((a) => {
                const unlocked = a.isUnlocked(achievementCtx);
                return (
                  <div key={a.id} className={`badge-card${unlocked ? " unlocked" : " locked"}`}>
                    <span className="badge-icon">{unlocked ? a.icon : "🔒"}</span>
                    <div className="badge-text">
                      <div className="badge-title">{lang === "ja" ? a.titleJa : a.title}</div>
                      <div className="badge-desc">{lang === "ja" ? a.descJa : a.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {leagueOpen && (
        <>
          <div className="menu-overlay" onClick={() => setLeagueOpen(false)} />
          <div className="sheet-panel">
            <div className="sheet-panel-title">
              <span>
                {league?.league.icon} {lang === "ja" ? league?.league.nameJa : league?.league.name}{" "}
                {lang === "ja" ? "リーグ" : "League"}
              </span>
              {league && league.myRank > 0 && <span className="sheet-panel-count">#{league.myRank}</span>}
            </div>
            <div className="league-note">
              {lang === "ja"
                ? "デイリーチャレンジのポイントで毎週きそいます。上位は昇格、下位は降格。"
                : "Weekly table, scored from Daily Challenge points. Top players promote, bottom relegate."}
            </div>
            <div className="leaderboard-panel">
              {leagueLoading && <div className="leaderboard-loading">{lang === "ja" ? "読み込み中…" : "Loading…"}</div>}
              {!leagueLoading && league?.rows.length === 0 && (
                <div className="leaderboard-loading">
                  {lang === "ja" ? "今週はまだ誰もいません。最初の一人になろう！" : "Nobody here yet this week — be the first!"}
                </div>
              )}
              {!leagueLoading &&
                league?.rows.map((r) => (
                  <div key={r.userId} className={`leaderboard-row${r.isMe ? " me" : ""}`}>
                    <span className={`leaderboard-rank${r.rank <= 3 ? ` top${r.rank}` : ""}`}>
                      {r.rank <= 3 ? ["🥇", "🥈", "🥉"][r.rank - 1] : r.rank}
                    </span>
                    <span className="leaderboard-name">{r.name}</span>
                    <span className="leaderboard-gems">⚡ {r.points}</span>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}

      {leaderboardOpen && (
        <>
          <div className="menu-overlay" onClick={() => setLeaderboardOpen(false)} />
          <div className="sheet-panel">
            <div className="sheet-panel-title">
              <span>🏆 {lang === "ja" ? "ランキング" : "Leaderboard"}</span>
              {leaderboard?.me && <span className="sheet-panel-count">#{leaderboard.me.position}</span>}
            </div>
            <div className="leaderboard-panel">
              {leaderboardLoading && <div className="leaderboard-loading">{lang === "ja" ? "読み込み中…" : "Loading…"}</div>}
              {!leaderboardLoading &&
                leaderboard?.top.map((e, i) => (
                  <div key={e.userId} className={`leaderboard-row${e.userId === leaderboard.me?.userId ? " me" : ""}`}>
                    <span className={`leaderboard-rank${i < 3 ? ` top${i + 1}` : ""}`}>{i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</span>
                    <span className="leaderboard-name">{e.name}</span>
                    <span className="leaderboard-level">{lang === "ja" ? "Lv" : "Lv"}.{e.level}</span>
                    <span className="leaderboard-gems">💎 {e.gems}</span>
                  </div>
                ))}
              {!leaderboardLoading && leaderboard?.me && leaderboard.me.position > leaderboard.top.length && (
                <div className="leaderboard-row me leaderboard-row-me-sep">
                  <span className="leaderboard-rank">{leaderboard.me.position}</span>
                  <span className="leaderboard-name">{leaderboard.me.name}</span>
                  <span className="leaderboard-level">Lv.{leaderboard.me.level}</span>
                  <span className="leaderboard-gems">💎 {leaderboard.me.gems}</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {toasts.map((t) => (
        <span key={t.id} className="reward-toast" style={{ left: t.x, top: t.y }}>
          {t.text}
        </span>
      ))}

      <main>
        {/* Says what a guest is and what they stand to lose, without a modal in
            front of the thing they came to try. */}
        {guest && view === "home" && (
          <div className="guest-banner">
            <span className="guest-banner-dot" aria-hidden="true">●</span>
            <div className="guest-banner-body">
              <strong>{lang === "ja" ? "おためしプレイ中" : "Playing as a guest"}</strong>
              <span>
                {lang === "ja"
                  ? "このブラウザにだけ記録されます。アカウントを作ると、どの端末でも続きから遊べます。"
                  : "Saved in this browser only. Make an account to keep it on any device."}
              </span>
            </div>
            <a className="guest-banner-cta" href="/signup?from=%2F">
              {lang === "ja" ? "保存" : "Save"}
            </a>
          </div>
        )}
        {view === "home" && (
          <HomeView
            guest={guest}
            guestTopicLimit={guest ? GUEST_TOPICS : Infinity}
            progress={progress}
            li={li}
            solvedCount={solvedCount}
            dailyStreak={dailyStreak}
            onOpenTopic={openTopic}
            onOpenArena={() => { if (guestLocked("arena")) return; loadPuzzle(puzIdx); setView("arena"); }}
            onOpenBlitz={openBlitzPicker}
            onOpenTricks={() => { if (guestLocked("tricks")) return; setTrickId(null); setView("tricks"); }}
            onOpenDaily={() => { if (guestLocked("daily")) return; startDaily(); }}
            dailyPlayed={!!dailyStatus?.played}
            onContinue={continueStage}
            onShare={openShare}
            reviewCount={reviewCount}
            reviewStats={reviewStats}
            onOpenQuests={() => { setQuestsOpen(true); refreshQuests(); }}
            onOpenShop={() => { setShopOpen(true); refreshShop(); }}
            onStartReview={startReview}
            gemBalance={gemBalance}
            openDuels={openDuels}
            liveComps={liveComps}
            onEnterComp={beginCompetition}
            assignment={assignment}
            assignedTopic={assignedTopic}
            onOpenFriends={openFriends}
            onAcceptDuel={acceptDuel}
            onOpenClasses={classesEnabled && lang === "ja" ? () => setClassesFrom("home") : undefined}
            lang={lang}
            t={t}
          />
        )}

        {view === "topic" && currentTopic && (
          <TopicView topic={currentTopic} lang={lang} t={t}
            canEdit={isAdmin && !guest} override={ovr[currentTopic.id]} onSave={saveOverride}
            onOpenClasses={classesEnabled && lang === "ja" ? () => setClassesFrom(`lesson:${currentTopic.id}`) : undefined} />
        )}

        {view === "stagemap" && currentTopic && (
          <StageMapView topic={currentTopic} progress={progress} onPlay={startStage} lang={lang} t={t} />
        )}

        {view === "practice" && currentTopic && curProblem && (
          <PracticeView
            topic={currentTopic}
            lang={lang}
            t={t}
            stageN={curStage.n}
            qIndex={curStage.qIndex}
            correct={curStage.correct}
            problem={curProblem}
            mode={curMode}
            tileOptions={tileOptions}
            curSelection={curSelection}
            tfShown={tfShown}
            checkEnabled={checkEnabled}
            marks={stageMarks}
            shakeQuestion={shakeQuestion}
            wrongFlash={wrongFlash}
            shakeTile={shakeTile}
            streakPop={streakPop}
            feedbackOk={feedback ? feedback.ok : null}
            eliminated={eliminated}
            timerKey={timerKey}
            timerMs={timerMs}
            timerPaused={!!feedback || hintOpen}
            runs={runs}
            runReady={runReady}
            swingAnim={swingAnim}
            onAddRun={addRun}
            isBoss={isBoss}
            comboStreak={comboStreak}
            skinId={skin.skinId}
            typeInputRef={typeInputRef}
            practiceCardRef={practiceCardRef}
            onSelect={submitSelection}
            onInputChange={(v) => setCheckEnabled(v.trim() !== "")}
            onCheck={checkPractice}
          />
        )}

        {view === "arena" && (sprintRef.current || sprintOver) && (
          <div className="sprint-bar">
            {sprintOver ? (
              <div className="match-done sprint-done">
                <div className="match-done-title">{sprintOver.best ? (lang === "ja" ? "最速記録！" : "Fastest yet!") : (lang === "ja" ? "スプリント完走！" : "Sprint complete!")}</div>
                <div className="match-done-line mono"><RollUp to={sprintOver.secs} />{lang === "ja" ? " 秒" : "s"} · {SPRINT_LEN} {lang === "ja" ? "問" : "puzzles"}</div>
                <button className="btn btn-primary match-again" onClick={startSprint}>{lang === "ja" ? "もう一回" : "Again"}</button>
              </div>
            ) : (
              <>
                <span className="sprint-tag">⏱ {lang === "ja" ? "スプリント" : "SPRINT"}</span>
                <span className="sprint-progress mono">{sprintAt + 1} / {SPRINT_LEN}</span>
                {sprintBest > 0 && <span className="sprint-best mono">{lang === "ja" ? "最速" : "best"} {sprintBest}s</span>}
              </>
            )}
          </div>
        )}
        {view === "arena" && (
          <ArenaView
            t={t}
            puzIdx={puzIdx}
            glyphs={glyphs}
            tray={tray}
            selection={selection}
            hintPair={hintPair}
            moveCount={moveCount}
            elapsed={puzzleElapsed}
            bestMoves={progress.arena.bestMoves[PUZZLES[puzIdx].id]}
            solvedMap={progress.arena.solved}
            status={puzzleStatus}
            svgRef={puzzleSvgRef}
            onSlotClick={onSlotClick}
            onHint={onHint}
            onReset={() => loadPuzzle(puzIdx)}
            onNext={() => loadPuzzle(puzIdx + 1)}
          />
        )}

        {view === "ttt" && (
          <section className="view active">
            {!tttMode && (
              <div className="ttt-setup">
                <div className="ttt-levels">
                  {([1, 2, 3] as TTTLevel[]).map((lv) => (
                    <button key={lv} className={`ttt-level${tttLevel === lv ? " on" : ""}`} onClick={() => setTttLevel(lv)}>
                      <span className="ttt-level-n">Lv.{lv}</span>
                      <span className="ttt-level-t">{lv === 1 ? (lang === "ja" ? "ふつうの○×" : "Classic") : lv === 2 ? (lang === "ja" ? "計算して取る" : "Solve to claim") : (lang === "ja" ? "インド式で取る" : "Vedic tricks")}</span>
                      <span className="ttt-level-s">⏱ {tttTurnSeconds(lv)}s</span>
                    </button>
                  ))}
                </div>
                <p className="match-hint">
                  {tttLevel === 1
                    ? (lang === "ja" ? "マスをタップして3つ並べよう。" : "Tap a square. Three in a row wins.")
                    : (lang === "ja" ? `マスの計算に正解すると取れる。まちがえたら相手の番。1手 ${tttTurnSeconds(tttLevel)} 秒。` : `Answer the square's sum to claim it. Miss, and the turn passes. ${tttTurnSeconds(tttLevel)}s a move.`)}
                </p>
                <div className="ttt-modes">
                  <button className="ttt-mode" onClick={() => startTttLocal("local")}><span className="ttt-mode-i">👥</span><span>{lang === "ja" ? "ふたりで（交代）" : "Two players, one phone"}</span></button>
                  <button className="ttt-mode" onClick={() => startTttLocal("cpu")}><span className="ttt-mode-i">🤖</span><span>{lang === "ja" ? "コンピューターと" : "Play the computer"}</span></button>
                  <button className={`ttt-mode${guest ? " locked" : ""}`} onClick={startTttOnline} disabled={tttBusy}><span className="ttt-mode-i">🌐</span><span>{lang === "ja" ? "オンラインで友だちと" : "Online with a friend"}</span>{guest && <span className="game-card-lock">🔒</span>}</button>
                </div>
                <div className="ttt-join">
                  <input className="friend-add-input mono" value={tttJoinCode} onChange={(e) => setTttJoinCode(normaliseRoomCode(e.target.value))} placeholder={lang === "ja" ? "部屋コード" : "Room code"} maxLength={4} />
                  <button className="friend-add-btn" onClick={() => joinTttOnline(tttJoinCode)} disabled={tttJoinCode.length !== 4 || tttBusy}>{lang === "ja" ? "参加" : "Join"}</button>
                </div>
                {tttNote && <div className="friend-note">{tttNote}</div>}
              </div>
            )}

            {tttMode && ttt && (
              <>
                <div className="ttt-top">
                  <div className={`ttt-player x${ttt.turn === "X" && !ttt.winner ? " turn" : ""}`}>
                    {ttt.turn === "X" && !ttt.winner && (tttMode !== "online" || !!tttRoom?.guestName) && (
                      <TurnClock key={`x${ttt.turnAt}`} since={ttt.turnAt} seconds={tttTurnSeconds(ttt.level)} onExpire={tttTimeUp} />
                    )}
                    <span className="ttt-glyph">✕</span>
                    <span>{tttMode === "online" ? tttRoom?.hostName : tttMode === "cpu" ? (lang === "ja" ? "あなた" : "You") : (lang === "ja" ? "プレイヤー X" : "Player X")}</span>
                    <span className="mono ttt-score">{tttScore.X}</span>
                  </div>
                  <div className="ttt-vs">Lv.{ttt.level}</div>
                  <div className={`ttt-player o${ttt.turn === "O" && !ttt.winner ? " turn" : ""}`}>
                    {ttt.turn === "O" && !ttt.winner && (tttMode !== "online" || !!tttRoom?.guestName) && (
                      <TurnClock key={`o${ttt.turnAt}`} since={ttt.turnAt} seconds={tttTurnSeconds(ttt.level)} onExpire={tttTimeUp} />
                    )}
                    <span className="ttt-glyph">○</span>
                    <span>{tttMode === "online" ? (tttRoom?.guestName ?? (lang === "ja" ? "待っています…" : "waiting…")) : tttMode === "cpu" ? "CPU" : (lang === "ja" ? "プレイヤー O" : "Player O")}</span>
                    <span className="mono ttt-score">{tttScore.O}</span>
                  </div>
                </div>

                {tttMode === "online" && tttRoom && !tttRoom.guestName && (
                  <div className="ttt-room">
                    <div className="ttt-room-label">{lang === "ja" ? "部屋コード" : "Room code"}</div>
                    <div className="ttt-room-code mono">{tttRoom.code}</div>
                    <button className="btn btn-primary" onClick={shareTttRoom}>🔗 {lang === "ja" ? "リンクを送る" : "Send the link"}</button>
                    <div className="ttt-room-hint">{lang === "ja" ? "友だちが参加すると始まります。" : "Starts when your friend joins."}</div>
                  </div>
                )}

                <div className={`ttt-board${tttMyTurn ? "" : " wait"}`}>
                  {ttt.cells.map((c, i) => {
                    const win = ttt.line?.includes(i);
                    return (
                      <button key={i} className={`ttt-cell${c.owner ? " " + c.owner.toLowerCase() : ""}${win ? " win" : ""}${tttSel === i ? " sel" : ""}`} onClick={() => tttTap(i)} disabled={!!c.owner || !tttMyTurn}>
                        {c.owner ? <span className="ttt-mark">{c.owner === "X" ? "✕" : "○"}</span> : <span className="ttt-sum mono">{c.prompt}</span>}
                      </button>
                    );
                  })}
                </div>

                <div className="ttt-status">
                  {ttt.winner === "draw" ? (lang === "ja" ? "ひきわけ！" : "Draw!")
                    : ttt.winner ? (tttMode === "local" ? (lang === "ja" ? `${ttt.winner} の勝ち！` : `${ttt.winner} wins!`) : ttt.winner === tttMe ? (lang === "ja" ? "勝ち！🎉" : "You win! 🎉") : (lang === "ja" ? "まけた…" : "You lost"))
                    : tttMode === "online" && !tttRoom?.guestName ? "" : tttMyTurn ? (lang === "ja" ? "あなたの番" : "Your turn") : (lang === "ja" ? "相手の番…" : "Their turn…")}
                </div>
                {tttNote && <div className="friend-note">{tttNote}</div>}

                <div className="ttt-actions">
                  {ttt.winner && <button className="btn btn-primary" onClick={tttRematch}>{lang === "ja" ? "もう一回" : "Rematch"}</button>}
                  <button className="btn btn-ghost" onClick={openTtt}>{lang === "ja" ? "モードをえらぶ" : "Change mode"}</button>
                </div>

                {tttSel !== null && ttt.cells[tttSel] && !ttt.cells[tttSel].owner && (
                  <>
                    <div className="menu-overlay" onClick={() => setTttSel(null)} />
                    <div className="hint-sheet ttt-sheet" role="dialog" aria-modal="true">
                      <div className="quick-prompt mono">{ttt.cells[tttSel].prompt} = ?</div>
                      <div className="quick-options n3">
                        {ttt.cells[tttSel].options.map((o) => (
                          <button key={o} className="quick-opt" onClick={() => tttCommit(tttSel, o)}><span className="mono">{o.toLocaleString("en-IN")}</span></button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </section>
        )}

        {view === "quick" && quickRound && (() => {
          const g = quickGame(quickId)!;
          return (
            <section className="view active">
              <div className="match-head">
                <div className="match-stat"><span className="match-stat-k">{lang === "ja" ? "連続正解" : "Streak"}</span><span className="match-stat-v mono">{quickStreak}</span></div>
                <div className="match-stat"><span className="match-stat-k">{lang === "ja" ? "自己ベスト" : "Best"}</span><span className="match-stat-v mono">{quickBest}</span></div>
              </div>
              <p className="match-hint">{lang === "ja" ? g.hintJa : g.hintEn}</p>
              {!quickOver && (
                <>
                  <div className="quick-prompt mono">{quickRound.prompt}</div>
                  <div className={`quick-options n${quickRound.options.length}`}>
                    {quickRound.options.map((o, i) => {
                      const picked = quickPick === i;
                      const isAns = i === quickRound.answer;
                      const cls = quickPick === null ? "" : picked ? (isAns ? " right" : " wrong") : isAns ? " reveal" : " dim";
                      return (
                        <button key={i} className={`quick-opt${cls}`} onClick={() => onQuickPick(i)} disabled={quickPick !== null}>
                          <span className="mono">{o}</span>
                        </button>
                      );
                    })}
                  </div>
                  {/* The trick, shown once you have answered — this is the part
                      that makes it a Vedic maths game and not a quiz. */}
                  <div className={`quick-note${quickPick !== null ? " show" : ""}`} aria-live="polite">
                    {quickPick !== null ? (lang === "ja" ? quickRound.noteJa : quickRound.noteEn) : "\u00a0"}
                  </div>
                </>
              )}
              {quickOver && (
                <div className="match-done">
                  <div className="match-done-title">{quickOver.best && quickOver.streak > 0 ? (lang === "ja" ? "自己ベスト更新！" : "New best!") : (lang === "ja" ? "おしまい！" : "Run over")}</div>
                  <div className="match-done-line mono">{lang === "ja" ? "連続正解" : "streak"} <RollUp to={quickOver.streak} /></div>
                  <button className="btn btn-primary match-again" onClick={() => startQuick(quickId)}>{lang === "ja" ? "もう一回" : "Play again"}</button>
                </div>
              )}
            </section>
          );
        })()}

        {view === "odd" && oddRound && (
          <section className="view active">
            <div className="match-head">
              <div className="match-stat"><span className="match-stat-k">{lang === "ja" ? "連続正解" : "Streak"}</span><span className="match-stat-v mono">{oddStreak}</span></div>
              <div className="match-stat"><span className="match-stat-k">{lang === "ja" ? "自己ベスト" : "Best"}</span><span className="match-stat-v mono">{oddBest}</span></div>
            </div>
            <p className="match-hint">
              {lang === "ja" ? "3つは数字の合計が同じ。ちがう1つをタップ！" : "Three share a digit sum. Tap the one that doesn't."}
            </p>
            {!oddOver && (
              <div className="odd-grid">
                {oddRound.tiles.map((t) => {
                  const picked = oddPick === t.id;
                  const isOdd = t.id === oddRound.oddId;
                  return (
                    <button
                      key={t.id}
                      className={`odd-tile${picked ? (isOdd ? " right" : " wrong") : ""}${oddPick && isOdd ? " reveal" : ""}`}
                      onClick={() => onOddPick(t.id)}
                      disabled={!!oddPick}
                    >
                      <span className="odd-n mono">{fmt(t.n)}</span>
                      {oddPick && <span className="odd-ds mono">→ {digitSum(t.n)}</span>}
                    </button>
                  );
                })}
              </div>
            )}
            {oddOver && (
              <div className="match-done">
                <div className="match-done-title">{oddOver.best && oddOver.streak > 0 ? (lang === "ja" ? "自己ベスト更新！" : "New best!") : (lang === "ja" ? "おしまい！" : "Run over")}</div>
                <div className="match-done-line mono">{lang === "ja" ? "連続正解" : "streak"} <RollUp to={oddOver.streak} /></div>
                <button className="btn btn-primary match-again" onClick={startOdd}>{lang === "ja" ? "もう一回" : "Play again"}</button>
              </div>
            )}
          </section>
        )}

        {view === "sortg" && sortRound && (
          <section className="view active">
            <div className="match-head">
              <div className="match-stat"><span className="match-stat-k">{lang === "ja" ? "連続正解" : "Streak"}</span><span className="match-stat-v mono">{sortStreak}</span></div>
              <div className="match-stat"><span className="match-stat-k">{lang === "ja" ? "自己ベスト" : "Best"}</span><span className="match-stat-v mono">{sortBest}</span></div>
            </div>
            <p className="match-hint">{lang === "ja" ? "答えが小さい順にタップ！" : "Tap them smallest answer first."}</p>
            {!sortOver && (
              <div className="sort-list">
                {sortRound.cards.map((c) => {
                  const at = sortPicked.indexOf(c.id);
                  return (
                    <button
                      key={c.id}
                      className={`sort-card${at >= 0 ? " taken" : ""}${sortBad === c.id ? " wrong" : ""}`}
                      onClick={() => onSortPick(c.id)}
                      disabled={at >= 0}
                    >
                      <span className="sort-order mono">{at >= 0 ? at + 1 : "·"}</span>
                      <span className="sort-q mono">{c.prompt}</span>
                      {(at >= 0 || sortBad) && <span className="sort-v mono">{fmt(c.value)}</span>}
                    </button>
                  );
                })}
              </div>
            )}
            {sortOver && (
              <div className="match-done">
                <div className="match-done-title">{sortOver.best && sortOver.streak > 0 ? (lang === "ja" ? "自己ベスト更新！" : "New best!") : (lang === "ja" ? "おしまい！" : "Run over")}</div>
                <div className="match-done-line mono">{lang === "ja" ? "クリア回数" : "rounds"} <RollUp to={sortOver.streak} /></div>
                <button className="btn btn-primary match-again" onClick={startSort}>{lang === "ja" ? "もう一回" : "Play again"}</button>
              </div>
            )}
          </section>
        )}

        {view === "memory" && (
          <section className="view active">
            <div className="match-head">
              <div className="match-stat"><span className="match-stat-k">{lang === "ja" ? "めくった回数" : "Turns"}</span><span className="match-stat-v mono">{memTurns}</span></div>
              <div className="match-stat"><span className="match-stat-k">{lang === "ja" ? "最少回数" : "Fewest"}</span><span className="match-stat-v mono">{memBest || "—"}</span></div>
            </div>
            <p className="match-hint">{lang === "ja" ? "式と答えのペアを覚えて当てよう！" : "Remember where the pairs are."}</p>
            <div className="match-grid">
              {memTiles.map((t) => {
                const done = memDone.includes(t.id);
                const up = memUp.includes(t.id);
                return (
                  <button
                    key={t.id}
                    className={`match-tile mem-tile${up || done ? " up" : ""}${t.kind === "ans" && (up || done) ? " ans" : ""}${done ? " cleared" : ""}`}
                    onClick={() => onMemTap(t)}
                    disabled={done}
                    aria-label={up || done ? t.text : lang === "ja" ? "ふせてあるカード" : "face-down card"}
                  >
                    <span className="mono">{up || done ? t.text : "?"}</span>
                  </button>
                );
              })}
            </div>
            {memOver && (
              <div className="match-done">
                <div className="match-done-title">{memOver.best ? (lang === "ja" ? "最少記録！" : "Fewest yet!") : (lang === "ja" ? "クリア！" : "Cleared!")}</div>
                <div className="match-done-line mono"><RollUp to={memOver.turns} /> {lang === "ja" ? "回でクリア" : "turns"}</div>
                <button className="btn btn-primary match-again" onClick={() => startMemory()}>{lang === "ja" ? "もう一回" : "Play again"}</button>
              </div>
            )}
          </section>
        )}

        {view === "games" && (
          <section className="view active">
            <p className="games-lede">
              {lang === "ja"
                ? "計算を使ったミニゲーム。アカウントがなくても、オフラインでも遊べます。"
                : "Quick games built on the same maths. No account needed, and they work offline."}
            </p>
            {/* One board a day, the same for everyone — the bit worth telling
                a friend about. */}
            {/* Kept at the top: the one game that is as good with a friend as alone. */}
            <button className="ttt-card" onClick={openTtt}>
              <span className="ttt-card-board" aria-hidden="true">
                <i>✕</i><i></i><i>○</i><i></i><i>✕</i><i></i><i>○</i><i></i><i>✕</i>
              </span>
              <span className="ttt-card-body">
                <span className="ttt-card-name">{lang === "ja" ? "計算○×ゲーム" : "Math Tic-Tac-Toe"}</span>
                <span className="ttt-card-sub">{lang === "ja" ? "ひとりでも、友だちとも。Lv.1 はふつうの○×。" : "Solo, vs CPU, or a friend online. Lv.1 is the classic."}</span>
              </span>
              <span className="game-card-go">›</span>
            </button>

            <button className="daily-game" onClick={startDailyGame}>
              <span className="daily-game-tag">{lang === "ja" ? "今日のゲーム" : "GAME OF THE DAY"}</span>
              <span className="daily-game-name">
                {dailyGameId(todayKey()) === "memory"
                  ? (lang === "ja" ? "🧠 神経衰弱" : "🧠 Memory Pairs")
                  : (lang === "ja" ? "🃏 ナンバーマッチ" : "🃏 Number Match")}
              </span>
              <span className="daily-game-sub">
                {dailyGameDone !== null
                  ? lang === "ja"
                    ? `今日の記録 ${dailyGameDone}・もう一度あそぶ`
                    : `Today: ${dailyGameDone} — play it again`
                  : lang === "ja"
                    ? "みんな同じ問題。毎日0時に変わります。"
                    : "Everyone gets this same board today."}
              </span>
            </button>

            <div className="games-grid">
              {GAMES.map((g) => (
                <button key={g.id} className={`game-card${gameLocked(g.id) ? " locked" : ""}`} onClick={g.start} style={{ ["--g" as string]: g.tint }}>
                  <span className="game-card-icon">{g.icon}</span>
                  <span className="game-card-body">
                    <span className="game-card-name">{lang === "ja" ? g.nameJa : g.name}</span>
                    <span className="game-card-blurb">{lang === "ja" ? g.blurbJa : g.blurb}</span>
                  </span>
                  {gameLocked(g.id) && <span className="game-card-lock" aria-label="locked">🔒</span>}
                  {g.best > 0 && !gameLocked(g.id) && (
                    <span className="game-card-best mono">
                      {lang === "ja" ? "ベスト" : "best"} {g.best}
                    </span>
                  )}
                  <span className="game-card-go">›</span>
                </button>
              ))}
            </div>
            <div className="games-more">
              {lang === "ja" ? "新しいゲームを準備中！" : "More games on the way."}
            </div>
          </section>
        )}

        {view === "pop" && (
          <section className="view active">
            <div className="match-head">
              <div className="match-stat">
                <span className="match-stat-k">{lang === "ja" ? "スコア" : "Score"}</span>
                <span className="match-stat-v mono">{popScore}</span>
              </div>
              <div className="match-stat">
                <span className="match-stat-k">{lang === "ja" ? "コンボ" : "Combo"}</span>
                <span className="match-stat-v mono">{popCombo > 1 ? `×${popCombo}` : "–"}</span>
              </div>
              <div className="match-stat">
                <span className="match-stat-k">{lang === "ja" ? "ライフ" : "Lives"}</span>
                <span className="match-stat-v">{"❤️".repeat(popLives)}{"🖤".repeat(3 - popLives)}</span>
              </div>
            </div>

            {!popOver && (
              <>
                <div className="pop-prompt mono">{popRound ? `${popRound.prompt} = ?` : "…"}</div>
                <div className={`pop-grid ${popPhase}`}>
                  {Array.from({ length: 9 }, (_, i) => {
                    const v = popRound?.holes[i] ?? null;
                    const up = v !== null && popPhase !== "hidden";
                    const isAns = popRound && v === popRound.answer;
                    const cls = `pop-balloon${up ? " up" : ""}${popPhase === "hit" && popHit === i ? " hit" : ""}${popPhase === "miss" && popHit === i ? " wrong" : ""}${popPhase === "miss" && popHit === null && isAns ? " reveal" : ""}`;
                    return (
                      <button key={i} className="pop-hole" onClick={() => popWhack(i)} aria-label={v === null ? "" : String(v)}>
                        <span className={cls}><span className="pop-face" aria-hidden="true">🎈</span><span className="pop-num mono">{v === null ? "" : fmt(v)}</span></span>
                      </button>
                    );
                  })}
                </div>
                <p className="match-hint">{lang === "ja" ? "答えの風船をポップ！はやく！" : "Pop the balloon with the answer. Quick!"}</p>
              </>
            )}

            {popOver && (
              <div className="match-done">
                <div className="match-done-title">
                  {popOver.best && popOver.score > 0 ? (lang === "ja" ? "自己ベスト更新！" : "New best!") : (lang === "ja" ? "風船がにげた！" : "The balloons got away!")}
                </div>
                <div className="match-done-line mono">
                  <RollUp to={popOver.score} /> {lang === "ja" ? "点" : "pts"} · {lang === "ja" ? "ベスト" : "best"} {popBest}
                </div>
                <button className="btn btn-primary match-again" onClick={startPop}>{lang === "ja" ? "もう一回" : "Play again"}</button>
              </div>
            )}
          </section>
        )}

        {view === "bigger" && bigPair && (
          <section className="view active">
            <div className="match-head">
              <div className="match-stat">
                <span className="match-stat-k">{lang === "ja" ? "連続正解" : "Streak"}</span>
                <span className="match-stat-v mono">{bigStreak}</span>
              </div>
              <div className="match-stat">
                <span className="match-stat-k">{lang === "ja" ? "自己ベスト" : "Best"}</span>
                <span className="match-stat-v mono">{bigBest}</span>
              </div>
            </div>
            <p className="match-hint">
              {lang === "ja" ? "大きいほうをタップ！" : "Tap the bigger one."}
            </p>

            {!bigOver && (
              <div className="big-pair">
                {(["left", "right"] as const).map((side) => {
                  const p = bigPair[side];
                  const other = side === "left" ? bigPair.right : bigPair.left;
                  const chosen = bigPick === side;
                  const won = chosen && p.answer > other.answer;
                  return (
                    <button
                      key={side}
                      className={`big-card${chosen ? (won ? " right" : " wrong") : ""}`}
                      onClick={() => onBiggerPick(side)}
                      disabled={!!bigPick}
                    >
                      <span className="big-card-q mono">{p.prompt}</span>
                      {bigPick && <span className="big-card-a mono">{fmt(p.answer)}</span>}
                    </button>
                  );
                })}
                <span className="big-vs">VS</span>
              </div>
            )}

            {bigOver && (
              <div className="match-done">
                <div className="match-done-title">
                  {bigOver.best && bigOver.streak > 0
                    ? (lang === "ja" ? "自己ベスト更新！" : "New best!")
                    : (lang === "ja" ? "おしまい！" : "Run over")}
                </div>
                <div className="match-done-line mono">
                  {lang === "ja" ? "連続正解" : "streak"} <RollUp to={bigOver.streak} /> ·{" "}
                  {biggerScore(bigOver.streak)} {lang === "ja" ? "点" : "pts"}
                </div>
                <button className="btn btn-primary match-again" onClick={startBigger}>
                  {lang === "ja" ? "もう一回" : "Play again"}
                </button>
              </div>
            )}
          </section>
        )}

        {view === "match" && (
          <section className="view active">
            <div className="match-head">
              <div className="match-stat">
                <span className="match-stat-k">{lang === "ja" ? "ミス" : "Misses"}</span>
                <span className="match-stat-v mono">{matchMistakes}</span>
              </div>
              <div className="match-stat">
                <span className="match-stat-k">{lang === "ja" ? "自己ベスト" : "Best"}</span>
                <span className="match-stat-v mono">{matchBest}</span>
              </div>
            </div>
            <p className="match-hint">
              {lang === "ja" ? "式と答えをペアにしよう！" : "Pair each sum with its answer."}
            </p>

            <div className="match-grid">
              {matchTiles.map((t) => {
                const cleared = matchDone.includes(t.id);
                const picked = matchPicked.some((p) => p.id === t.id);
                const wrong = matchWrong.includes(t.id);
                return (
                  <button
                    key={t.id}
                    className={`match-tile${t.kind === "ans" ? " ans" : ""}${cleared ? " cleared" : ""}${picked ? " picked" : ""}${wrong ? " wrong" : ""}`}
                    onClick={() => onMatchTap(t)}
                    disabled={cleared}
                    aria-label={t.text}
                  >
                    <span className="mono">{t.text}</span>
                  </button>
                );
              })}
            </div>

            {matchResult && (
              <div className="match-done">
                <div className="match-done-title">
                  {matchResult.best
                    ? (lang === "ja" ? "自己ベスト更新！" : "New best!")
                    : (lang === "ja" ? "クリア！" : "Cleared!")}
                </div>
                <div className="match-done-line mono">
                  {matchResult.secs}s · {lang === "ja" ? "ミス" : "misses"} {matchMistakes} ·{" "}
                  <RollUp to={matchResult.score} /> {lang === "ja" ? "点" : "pts"}
                </div>
                <button className="btn btn-primary match-again" onClick={() => startMatch()}>
                  {lang === "ja" ? "もう一回" : "Play again"}
                </button>
              </div>
            )}
          </section>
        )}
        {view === "comp" && (
          <section className="view active">
            {compResult ? (
              <div className="practice-card comp-done">
                <div className="comp-done-medal">
                  {compResult.rank === 1 ? "🥇" : compResult.rank === 2 ? "🥈" : compResult.rank === 3 ? "🥉" : "🏅"}
                </div>
                <h3 className="comp-done-title">{compName}</h3>
                <div className="comp-done-rank">
                  {ja ? `${compResult.rank} 位` : rankLabel(compResult.rank)}
                </div>
                <div className="comp-done-stats">
                  <span>
                    <b className="mono">{compResult.correct}/{compResult.total}</b>
                    {ja ? "正解" : "correct"}
                  </span>
                  <span>
                    <b className="mono">{compResult.score}</b>
                    {ja ? "スコア" : "points"}
                  </span>
                </div>
                <div className="result-actions">
                  <button className="btn btn-primary" onClick={() => compId && openCompBoard(compId)}>
                    🏅 {ja ? "順位表" : "Leaderboard"}
                  </button>
                  <button className="btn btn-ghost" onClick={goHome}>{t.blitz.backHome}</button>
                </div>
              </div>
            ) : (
              <>
                <div className="comp-hud">
                  <span className="comp-hud-name">{compName}</span>
                  <span className={`comp-hud-clock mono${compLeft < 30000 ? " low" : ""}`}>
                    ⏱ {Math.floor(compLeft / 60000)}:{String(Math.floor((compLeft % 60000) / 1000)).padStart(2, "0")}
                  </span>
                </div>
                <div className="timer-bar-wrap comp-progress">
                  <div
                    className="review-progress-fill"
                    style={{ width: `${(compIdx / Math.max(1, compQs.length)) * 100}%` }}
                  />
                </div>
                <div className="practice-card">
                  <div className="mode-eyebrow">
                    {ja ? `第 ${compIdx + 1} 問 / ${compQs.length}` : `Question ${compIdx + 1} of ${compQs.length}`}
                  </div>
                  <div className="question mono">{compQs[compIdx]?.problem.prompt} = ?</div>
                  <div className="tile-grid">
                    {(compQs[compIdx]?.options ?? []).map((o) => (
                      <button key={o} className="choice-tile" onClick={() => onCompPick(o)}>
                        {fmt(o)}
                      </button>
                    ))}
                  </div>
                  <button
                    className="comp-skip"
                    onClick={() => {
                      if (compIdx + 1 >= compQs.length) finishCompetition(compAnswers);
                      else setCompIdx(compIdx + 1);
                    }}
                  >
                    {ja ? "スキップ →" : "Skip →"}
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        {view === "review" && (
          <section className="view active">
            <div className="review-meta">
              <span>{lang === "ja" ? "なおした数" : "Fixed"} <b className="mono">{reviewFixed}</b></span>
              <span className="mono">{reviewIdx + 1} / {reviewQueue.length}</span>
            </div>
            <div className="timer-bar-wrap review-progress">
              <div
                className="review-progress-fill"
                style={{ width: `${((reviewIdx) / Math.max(1, reviewQueue.length)) * 100}%` }}
              />
            </div>
            <div
              ref={practiceCardRef}
              className={`practice-card${reviewFeedback === "ok" ? " correct-glow" : reviewFeedback === "bad" ? " wrong-glow" : ""}`}
            >
              <div className="mode-eyebrow">🩹 {lang === "ja" ? "もう一度チャレンジ" : "Second chance"}</div>
              <div className="question mono">{reviewQueue[reviewIdx]?.prompt} = ?</div>
              <div className="tile-grid">
                {reviewOptions.map((o) => (
                  <button
                    key={o}
                    className={`choice-tile${
                      reviewFeedback && o === reviewQueue[reviewIdx]?.answer ? " daily-right" : ""
                    }`}
                    onClick={() => onReviewAnswer(o)}
                  >
                    {fmt(o)}
                  </button>
                ))}
              </div>
              {reviewFeedback === "bad" && (
                <div className="review-answer">
                  {reviewQueue[reviewIdx]?.prompt} = {fmt(reviewQueue[reviewIdx]?.answer ?? 0)}
                </div>
              )}
            </div>
          </section>
        )}

        {view === "daily" && (
          <DailyView
            qs={dailyQs}
            idx={dailyIdx}
            pick={dailyPick}
            done={dailyDone}
            status={dailyStatus}
            lang={lang}
            onPick={onDailyPick}
            onHome={goHome}
          />
        )}

        {view === "tricks" && (
          <TricksView
            trickId={trickId}
            step={trickStep}
            num={trickNum}
            lang={lang}
            onOpen={(id) => {
              const tk = TRICK_BY_ID[id];
              setTrickId(id);
              setTrickStep(0);
              setTrickNum(tk.sample());
              haptic(12);
              fireQuest("trick_viewed");
            }}
            onStep={(d) => {
              setTrickStep((s) => Math.max(0, s + d));
              haptic(8);
            }}
            onReroll={() => {
              if (trickId) setTrickNum(TRICK_BY_ID[trickId].sample());
              haptic(12);
            }}
            onBackToList={() => setTrickId(null)}
          />
        )}

        {view === "blitz" && blitzProblem && (
          <BlitzView
            problem={blitzProblem}
            options={blitzOptions}
            score={blitzScore}
            best={blitzBests[blitzLevelId] ?? 0}
            levelName={ja ? blitzLevel(blitzLevelId).nameJa : blitzLevel(blitzLevelId).name}
            levelIcon={blitzLevel(blitzLevelId).icon}
            hearts={blitzHearts}
            timerKey={blitzTimerKey}
            timerMs={blitzTimerMs}
            feedback={blitzFeedback}
            cardRef={blitzCardRef}
            onSelect={onBlitzSelect}
            lang={lang}
            t={t}
          />
        )}
      </main>

      {stageIntro !== null && (
        <div className="stage-intro-flash">
          <div className="stage-intro-text">
            {stageIntro === STAGE_COUNT
              ? lang === "ja"
                ? "ボス戦！"
                : "BOSS BATTLE!"
              : lang === "ja"
              ? `ステージ ${stageIntro}`
              : `STAGE ${stageIntro}`}
          </div>
          <div className="stage-intro-go">{lang === "ja" ? "スタート！" : "GO!"}</div>
        </div>
      )}

      <footer ref={footerRef} className="footerbar active" style={{ display: "flex" }}>
        {view === "home" && guest ? (
          <>
            <button className="bottomnav-item active" onClick={goHome}>
              <span className="bottomnav-icon">🏠</span>
              <span>{lang === "ja" ? "ホーム" : "Home"}</span>
            </button>
            <button className="bottomnav-item" onClick={openGames}>
              <span className="bottomnav-icon">🎮</span>
              <span>{lang === "ja" ? "ゲーム" : "Games"}</span>
            </button>
            <a className="btn btn-primary guest-save-btn" href="/signup?from=%2F">
              {lang === "ja" ? "保存" : "Save"}
            </a>
          </>
        ) : view === "home" ? (
          <>
            <button className="bottomnav-item active" onClick={goHome}>
              <span className="bottomnav-icon">🏠</span>
              <span>{lang === "ja" ? "ホーム" : "Home"}</span>
            </button>
            <button className="bottomnav-item" onClick={() => { setQuestsOpen((o) => !o); refreshQuests(); refreshReview(); }}>
              <span className="bottomnav-icon">
                📜
                {(claimableQuests > 0 || reviewCount > 0) && <span className="nav-dot" aria-hidden="true" />}
              </span>
              <span>{lang === "ja" ? "クエスト" : "Quests"}</span>
            </button>
            <button className="bottomnav-item" onClick={toggleLeague}>
              <span className="bottomnav-icon">🏆</span>
              <span>{lang === "ja" ? "リーグ" : "League"}</span>
            </button>
            <button className="bottomnav-item" onClick={toggleLeaderboard}>
              <span className="bottomnav-icon">🌍</span>
              <span>{lang === "ja" ? "ランク" : "Rank"}</span>
            </button>
            <button className="bottomnav-item" onClick={() => setAchievementsOpen((o) => !o)}>
              <span className="bottomnav-icon">🏅</span>
              <span>{lang === "ja" ? "実績" : "Badges"}</span>
            </button>
            {/* Profile moved out: the header avatar already opens the same
                account menu, and this slot is better spent on something to
                play than on a second door to settings. */}
            <button className="bottomnav-item" onClick={openGames}>
              <span className="bottomnav-icon">🎮</span>
              <span>{lang === "ja" ? "ゲーム" : "Games"}</span>
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-ghost back-footer-btn" aria-label="Back" onClick={handleBack}>
              ← {lang === "ja" ? "戻る" : "Back"}
            </button>
            {view === "topic" && (
              <button className="btn btn-primary" onClick={() => openStageMap(currentTopicId!)}>
                {t.stageMap.seeStageMap}
              </button>
            )}
            {view === "practice" && (
              <>
                {/* Mid-question, the lesson is an overlay you can close and
                    carry on from — not a navigation that throws the question
                    away. The steps sheet pauses the clock while it is up. */}
                <button className="btn btn-ghost" onClick={() => setHintOpen(true)}>
                  {t.practice.lesson}
                </button>
                {(curMode === "choice" || curMode === "target" || curMode === "balloon" || curMode === "numberline" || curMode === "catch") &&
                  curSelection === null &&
                  (fiftyLeft > 0 ? (
                    <button className="btn btn-ghost fifty-btn" onClick={useFiftyFifty}>
                      🎯 50/50
                    </button>
                  ) : (inventory?.fiftyTokens ?? 0) > 0 && eliminated.length === 0 ? (
                    <button className="btn btn-ghost fifty-btn" onClick={useFiftyToken}>
                      🧹 50/50 <span className="token-count mono">×{inventory?.fiftyTokens}</span>
                    </button>
                  ) : null)}
                {(inventory?.hintTokens ?? 0) > 0 && curSelection === null && (
                  <button className="btn btn-ghost hint-btn" onClick={useHintToken}>
                    💡 {t.practice.lesson} <span className="token-count mono">×{inventory?.hintTokens}</span>
                  </button>
                )}
                {curMode === "type" && (
                  <button className="btn btn-primary" disabled={!checkEnabled} onClick={checkPractice}>
                    {t.practice.check}
                  </button>
                )}
              </>
            )}
            {view === "arena" && (
              <>
                <button className="btn btn-ghost" onClick={() => loadPuzzle(puzIdx - 1)}>{lang === "ja" ? "◀ 前へ" : "◀ Prev"}</button>
                {!boardLocked && <button className="btn btn-ghost" onClick={onHint}>{t.arena.hint}</button>}
                <button className="btn btn-ghost" onClick={() => loadPuzzle(puzIdx)}>{t.arena.reset}</button>
                <button className="btn btn-primary" onClick={() => loadPuzzle(puzIdx + 1)}>{t.arena.next}</button>
              </>
            )}
          </>
        )}
      </footer>

      {feedback?.show && (
        <div className={`feedback-banner show ${feedback.ok ? "good" : "bad"}`} style={{ bottom: footerH }}>
          <div className="feedback-sfx-stamp">{feedback.ok ? "ピンポン♪" : "ブブー"}</div>
          <div className="feedback-inner">
            <div className="feedback-icon">{feedback.ok ? "✓" : "✕"}</div>
            <div className="feedback-text">
              <div className="t1">{feedback.ok ? t.practice.correct : t.practice.incorrect}</div>
              <div className="t2">{feedback.t2}</div>
            </div>
            <button className="btn" style={{ flex: "0 0 auto" }} onClick={onFeedbackContinue}>
              {t.practice.continueBtn}
            </button>
          </div>
        </div>
      )}

      {stageResult && (
        <div className="show" id="stageResult" style={{ display: "flex", position: "fixed", inset: 0, zIndex: 55, alignItems: "center", justifyContent: "center", background: "rgba(15,15,30,.6)", backdropFilter: "blur(3px)" }}>
          <div className={`result-card${stageResult.isBoss && stageResult.passed ? " boss-clear" : ""}`}>
            {stageResult.isBoss && (
              <div className="boss-badge">{stageResult.passed ? t.result.bossDefeated : t.result.bossStage}</div>
            )}
            <div className={`hanko ${stageResult.passed ? "" : "fail"}`}>
              <span className="jp">{stageResult.passed ? "合格" : "再挑戦"}</span>
              <span className="en">{stageResult.passed ? t.result.clear : t.result.retry}</span>
            </div>
            <div className="result-stars">
              {[0, 1, 2].map((i) => (
                <span key={i} className={i < stageResult.stars ? "on pop" : ""}>
                  ★
                </span>
              ))}
            </div>
            {/* A clean sweep deserves to be called one — three stars alone
                does not distinguish 5/5 from a scrape. */}
            {stageResult.correct === QUESTIONS_PER_STAGE && (
              <div className="result-perfect">
                <span>{lang === "ja" ? "全問正解！" : "PERFECT"}</span>
              </div>
            )}
            <div className="result-sub">{t.result.correctOf(stageResult.correct, QUESTIONS_PER_STAGE)}</div>
            <div className="result-gems"><RollUp to={stageResult.gemsGained} prefix="+" /> 💎</div>

            {/* Stars say how you did; this says what to fix. Missed questions
                lead, because those are the ones worth a second look. */}
            {stageLog.length > 0 && (
              <div className="run-recap">
                <div className="run-recap-head">
                  {lang === "ja" ? "このステージのふりかえり" : "How it went"}
                  {stageLog.some((e) => !e.ok) && (
                    <span className="run-recap-cta">{lang === "ja" ? "✗をタップして解き方を見る" : "tap a ✗ for the method"}</span>
                  )}
                </div>
                {[...stageLog]
                  .map((e, i) => ({ ...e, i }))
                  .sort((a, b) => Number(a.ok) - Number(b.ok) || a.i - b.i)
                  .map((e) => (
                    <div
                      key={e.i}
                      className={`run-row${e.ok ? " ok" : " tap"}`}
                      role={e.ok ? undefined : "button"}
                      tabIndex={e.ok ? undefined : 0}
                      onClick={e.ok ? undefined : () => setHintOpen(true)}
                      onKeyDown={e.ok ? undefined : (ev) => { if (ev.key === "Enter" || ev.key === " ") setHintOpen(true); }}
                      title={e.ok ? undefined : lang === "ja" ? "解き方を見る" : "Show me how"}
                    >
                      <span className="run-mark">{e.ok ? "✓" : "✗"}</span>
                      <span className="run-q mono">{e.prompt}</span>
                      <span className="run-a mono">
                        {e.ok ? (
                          fmt(e.answer)
                        ) : (
                          <>
                            <s>{e.given}</s> <strong>{fmt(e.answer)}</strong>
                          </>
                        )}
                      </span>
                    </div>
                  ))}
              </div>
            )}
            <div className="result-actions">
              {stageResult.passed ? (
                stageResult.n < STAGE_COUNT ? (
                  <button className="btn btn-primary" onClick={() => afterStageResult("next")}>{t.result.nextStage}</button>
                ) : currentTopic && TOPICS.findIndex((tp) => tp.id === currentTopic.id) < TOPICS.length - 1 ? (
                  <button className="btn btn-primary" onClick={() => afterStageResult("nextTopic")}>
                    {lang === "ja" ? "次のトピックへ →" : "Next topic →"}
                  </button>
                ) : (
                  <button className="btn btn-primary" onClick={() => afterStageResult("map")}>{t.result.backToMap}</button>
                )
              ) : (
                <button className="btn btn-primary" onClick={() => afterStageResult("retry")}>{t.result.retryStage}</button>
              )}
              <button className="btn btn-ghost" onClick={() => afterStageResult("map")}>{t.result.map}</button>
            </div>
          </div>
        </div>
      )}

      {celebrate && (
        <div className="show" id="celebrate">
          <div className="celebrate-card">
            <div className="mascot-big"><Mascot mood={celebrate.mood} /></div>
            <h3>{celebrate.title}</h3>
            <p>{celebrate.body}</p>
            <button className="btn btn-primary" style={{ flex: "none", padding: "14px 28px" }} onClick={() => setCelebrate(null)}>
              {t.celebrate.continueBtn}
            </button>
          </div>
        </div>
      )}

      {chestReward !== null && (
        <div className="show" id="dailyChest">
          <div className="chest-card">
            {!chestOpened ? (
              /* The card says "tap to open", so the whole card is the target.
                 Only the 64px emoji used to be clickable, which reads as the
                 dialog being stuck — especially with a mouse. */
              <button
                className="chest-open-btn"
                onClick={() => {
                  setChestOpened(true);
                  confetti.burstCenter(90, 0.5);
                  sound.levelUp();
                  haptic([20, 60, 20]);
                }}
                aria-label={lang === "ja" ? "デイリーチェストを開ける" : "Open the daily chest"}
              >
                <span className="chest-box">🎁</span>
                <h3>{lang === "ja" ? "デイリーチェスト！" : "Daily Chest!"}</h3>
                <p>{lang === "ja" ? "タップして開けよう" : "Tap to open"}</p>
              </button>
            ) : (
              <>
                <div className="chest-box opened">🎉</div>
                <h3>+{chestReward} 💎</h3>
                <p>{lang === "ja" ? "毎日プレイしてもっと獲得しよう！" : "Come back tomorrow for another chest!"}</p>
                <button className="btn btn-primary" style={{ flex: "none", padding: "14px 28px" }} onClick={() => setChestReward(null)}>
                  {lang === "ja" ? "やった！" : "Nice!"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {blitzOver && (
        <div className="show" id="blitzOver">
          <div className="celebrate-card">
            <h3>⚡ {t.blitz.over}</h3>
            <p>
              {t.blitz.scoreLabel}: {blitzScore}
              {blitzJustBeatBest ? ` ${t.blitz.newBest}` : ""}
            </p>
            <div className="blitz-over-actions">
              <button className="score-share-btn" onClick={() => openShare("blitz")}>
                📤 {t.share.shareBtn}
              </button>
              <button className="score-duel-btn" onClick={openFriends}>
                ⚔️ {lang === "ja" ? "対戦を申し込む" : "Challenge a friend"}
              </button>
            </div>
            <div className="result-actions">
              <button className="btn btn-primary" onClick={() => startBlitz()}>{t.blitz.playAgain}</button>
              <button className="btn btn-ghost" onClick={() => { setBlitzOver(false); goHome(); }}>{t.blitz.backHome}</button>
            </div>
          </div>
        </div>
      )}

      {/* The companion. Fixed above the nav so it never covers an answer tile,
          and tappable to hush it — a helper you can't silence is a nuisance. */}
      {!buddy.hidden && (
        <div
          className={`buddy-dock${buddy.say ? " talking" : ""}${buddyPos.pos ? " free" : ""}${buddyPos.dragging ? " dragging" : ""}`}
          style={buddyPos.pos ? { left: buddyPos.pos.x, top: buddyPos.pos.y } : undefined}
        >
          {buddy.say && (
            <button
              className={`buddy-bubble${quoteBy ? " quoting" : ""}`}
              onClick={() => { buddy.quiet(); setQuoteBy(null); }}
            >
              {buddy.say.text}
              {quoteBy && <span className="buddy-cite">— {quoteBy}</span>}
            </button>
          )}
          <button
            className="buddy-tap"
            {...buddyPos.handlers}
            aria-label={ja ? "バディ（タップで名言、ドラッグで移動）" : "Buddy — tap for a quote, drag to move"}
            title={ja ? "タップ：名言 / ドラッグ：移動" : "Tap for a quote · drag to move"}
          >
            <Buddy skinId={skin.skinId} mood={buddy.mood} />
            {!buddyTapped && !buddy.say && (
              <span className="buddy-hint" aria-hidden="true">💬</span>
            )}
          </button>
        </div>
      )}

      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        focus={shareFocus}
        onFocus={setShareFocus}
        lang={lang}
        t={t}
        stats={{
          level: li.level,
          rank,
          gems,
          dailyStreak,
          bestStreakEver,
          hearts,
          blitzBest: Math.max(0, ...Object.values(blitzBests)),
          bossClears,
          solvedCount,
          totalPuzzles: PUZZLES.length,
        }}
      />

      <canvas ref={confetti.canvasRef} id="confettiCanvas" style={{ position: "fixed", inset: 0, zIndex: 60, pointerEvents: "none" }} />
    </div>
  );
}

// Mirrors the book's example card: "tens x → y / units a → b" lines on the left,
// right-angle elbow arrows off the two digits, answer in a green box.

/* The admin's edit panel for one lesson. Only the prose is editable — the
   rule steps, the mascot's tip, the blurb — and only for the signed-in admin,
   which the server re-checks on save. Empty fields fall back to the code. */

/* Mounted fresh for every question — the parent passes key={timerKey} — so
   the clock starts from `timerMs` by construction rather than by an effect
   that resets state. */

/* A draining bar plus the seconds left, for one side's turn. Owns its own
   ticking so the board does not re-render ten times a second; remounted by
   key whenever the turn (turnAt) changes. onExpire fires once. */
function TurnClock({ since, seconds, onExpire }: { since: number; seconds: number; onExpire: () => void }) {
  const total = seconds * 1000;
  const [left, setLeft] = useState(() => Math.max(0, total - (Date.now() - since)));
  const fired = useRef(false);
  const expire = useRef(onExpire);
  useEffect(() => { expire.current = onExpire; }, [onExpire]);
  useEffect(() => {
    const id = setInterval(() => {
      const l = Math.max(0, total - (Date.now() - since));
      setLeft(l);
      if (l <= 0 && !fired.current) { fired.current = true; clearInterval(id); expire.current(); }
    }, 100);
    return () => clearInterval(id);
  }, [since, total]);
  const secs = Math.ceil(left / 1000);
  return (
    <>
      <span className={`ttt-clock-bar${left < 3000 ? " low" : ""}`} style={{ width: `${(left / total) * 100}%` }} aria-hidden="true" />
      <span className={`ttt-clock mono${left < 3000 ? " low" : ""}`} aria-label={`${secs} seconds`}>{secs}</span>
    </>
  );
}
