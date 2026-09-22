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
  gradCss,
  makeDistractors,
  RANKS_JA,
  type Difficulty,
  type Problem,
  type Topic,
  type Lang,
} from "@/lib/game/topics";
import {
  PUZZLES,
  SEG_LINE,
  SEG_TIP,
  OP_GEO,
  OP_TIP,
  TRAY_SIZE,
  slotsFor,
  cloneGlyphs,
  currentEquationText,
  evalEquation,
  type Glyph,
} from "@/lib/game/matchstick";
import {
  topicProgressOf,
  starsForStage,
  stageUnlocked,
  stageBlocker,
  topicUnlocked,
  totalGems,
  levelInfo,
  type ProgressState,
} from "@/lib/game/state";
import { finishStageAction, solvePuzzleAction, leaderboardAction, dailyStatusAction, submitDailyAction, leagueAction } from "@/lib/actions/game-actions";
import {
  questsAction, reportQuestAction, claimQuestAction, shopStateAction, buyItemAction,
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
} from "@/lib/actions/game-actions";
import type { CompetitionSummary, CompQuestion, CompRow } from "@/lib/game/competition";
import type { QuestState, InventoryState, ReviewStats } from "@/lib/game/engagement";
import type { LeaderboardEntry } from "@/lib/game/progress";
import { ACHIEVEMENTS } from "@/lib/game/achievements";
import { Mascot, Mandala } from "./Mascot";
import { BOOK_DIAGRAMS, BOOK_DIAGRAM_EQ } from "./BookDiagrams";
import { TRICKS, TRICK_BY_ID } from "@/lib/game/tricks";
import { dailyQuestions, todayKey, DAILY_QUESTIONS, type DailyQuestion } from "@/lib/game/daily";
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
import { useLang, UI, type UIDict } from "./i18n";

type View = "home" | "topic" | "stagemap" | "practice" | "arena" | "blitz" | "tricks" | "daily" | "review" | "comp";
type Mode = "type" | "choice" | "target" | "truefalse" | "arcade" | "catch" | "balloon" | "numberline";
type Loc = { loc: "board" | "tray"; gi: number | null; slot: string | null; idx: number | null };

function ri(a: number, b: number) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function weightedPick<T extends string>(pairs: [T, number][]): T {
  const total = pairs.reduce((s, p) => s + p[1], 0);
  let r = Math.random() * total;
  for (const [v, w] of pairs) {
    if (r < w) return v;
    r -= w;
  }
  return pairs[0][0];
}
function fmt(n: number) {
  return n.toLocaleString("en-IN");
}
function sameLoc(a: Loc | null, b: Loc | null) {
  return !!a && !!b && a.loc === b.loc && a.gi === b.gi && a.slot === b.slot && a.idx === b.idx;
}
function msUntilUTCMidnight() {
  const now = new Date();
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0);
  return next - now.getTime();
}
function haptic(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {}
  }
}

const PATH_POS = ["c", "l", "r", "c", "l", "r", "c", "l", "r", "c", "l", "r", "c"];
const STAGE_POS = ["c", "l", "r", "l", "c"];

/* Blitz pacing now comes from the chosen level (see BLITZ_LEVELS in topics.ts)
   rather than one fixed ramp. */
const BLITZ_DEFAULT_LEVEL = 2;

/* 1st / 2nd / 3rd / 4th — spelled out because "#4" reads as a quantity. */
function rankLabel(n: number): string {
  if (n <= 0) return "—";
  const s = ["th", "st", "nd", "rd"][n % 100 > 10 && n % 100 < 14 ? 0 : Math.min(n % 10, 4) % 4] ?? "th";
  return `${n}${s}`;
}
/* one bought Time Boost is worth this much extra clock, for one run */
const BLITZ_BOOST_MS = 4000;

/* "tomorrow" / "in 3 days" — a date stamp would mean nothing to a child, and
   the exact hour is noise when reviews land at the start of a day. */
function fmtDue(iso: string, ja: boolean): string {
  const day = 864e5;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const days = Math.max(0, Math.round((new Date(iso).getTime() - start.getTime()) / day));
  if (days <= 0) return ja ? "きょう" : "today";
  if (days === 1) return ja ? "あした" : "tomorrow";
  return ja ? `${days}日後` : `in ${days} days`;
}

export function GameApp({
  initialProgress,
  dailyStreak,
  initialLang,
  initialBonusGems,
  dailyChestReward,
  user,
  isAdmin = false,
}: {
  initialProgress: ProgressState;
  dailyStreak: number;
  initialLang?: "en" | "ja";
  initialBonusGems?: number;
  dailyChestReward?: number | null;
  user: { name: string | null; email: string | null };
  /* Server-resolved; the /admin page re-checks it, so this only decides
     whether the menu row is drawn. */
  isAdmin?: boolean;
}) {
  const [progress, setProgress] = useState<ProgressState>(initialProgress);
  const [view, setView] = useState<View>("home");
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
  const currentTopic: Topic | null = currentTopicId ? TOPIC_BY_ID[currentTopicId] : null;

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
  const [sparkles, setSparkles] = useState<{ left: number; top: number; delay: number; size: number }[]>([]);
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

  useEffect(() => {
    const glyphs = ["✦", "✧", "⋆", "✺", "✴"];
    setSparkles(
      Array.from({ length: 14 }, (_, i) => ({
        left: ri(0, 98),
        top: ri(0, 96),
        delay: Math.random() * 6,
        size: 10 + Math.random() * 14,
      })).map((s, i) => ({ ...s, glyphIdx: i % glyphs.length } as unknown as typeof s))
    );
  }, []);
  const sparkleGlyphs = ["✦", "✧", "⋆", "✺", "✴"];

  const [sakura, setSakura] = useState<{ left: number; delay: number; duration: number; size: number; sway: number }[]>([]);
  useEffect(() => {
    setSakura(
      Array.from({ length: 10 }, () => ({
        left: ri(0, 96),
        delay: Math.random() * 8,
        duration: 9 + Math.random() * 6,
        size: 34 + Math.random() * 18,
        sway: ri(-40, 40),
      }))
    );
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
  }, []);

  /* Fire-and-forget: a quest that fails to record must never break gameplay. */
  function fireQuest(event: QuestEvent, amount = 1) {
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
    setCurrentTopicId(id);
    setView("topic");
  }
  function openStageMap(id: string) {
    setCurrentTopicId(id);
    setView("stagemap");
  }

  const headerTitle = t.headerTitles[view];

  function handleBack() {
    if (view === "practice") { openStageMap(currentTopicId!); }
    else if (view === "stagemap") { openTopic(currentTopicId!); }
    else { goHome(); }
  }

  // Restore whatever screen the player was on before a refresh, instead of
  // always dropping them back at the home screen.
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
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setCurProblem(problem);
    setCurMode(mode);
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
    if (mode === "choice") setTileOptions(shuffle([problem.answer, ...makeDistractors(problem.answer, 3)]));
    else if (mode === "target" || mode === "arcade" || mode === "catch" || mode === "balloon")
      setTileOptions(shuffle([problem.answer, ...makeDistractors(problem.answer, 5)]));
    else if (mode === "numberline") setTileOptions(shuffle([problem.answer, ...makeDistractors(problem.answer, 4)]));
    else if (mode === "truefalse") {
      const isTrue = Math.random() < 0.5;
      setTfIsTrue(isTrue);
      setTfShown(isTrue ? problem.answer : makeDistractors(problem.answer, 1)[0]);
    }
  }

  function startStage(n: number) {
    if (!currentTopic) return;
    if (!stageUnlocked(progress, currentTopic.id, n)) return;
    setCurStage({ n, qIndex: 0, correct: 0 });
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
    setHearts(5);
    setRuns(0);
    setComboStreak(0);
    setFiftyLeft(1);
    newStageQuestion(topic, n);
    setView("practice");
    setStageIntro(n);
    setTimeout(() => setStageIntro(null), 900);
  }

  useEffect(() => {
    if (view !== "practice" || !curProblem) return;
    timeoutRef.current = setTimeout(() => handleTimeout(), timerMs);
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curProblem, view]);

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

  function resolveAnswer(ok: boolean, timedOut: boolean) {
    if (!curProblem) return;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    const elapsed = Date.now() - questionStartRef.current;
    const speedy = ok && !timedOut && elapsed <= timerMs * 0.45;

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
        recordMistakeAction(currentTopic.id, curProblem.prompt, curProblem.answer)
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
    setTimeout(() => resolveAnswer(ok, false), 220);
  }

  function checkPractice() {
    if (!curProblem || answeredRef.current) return;
    let ok: boolean;
    if (curMode === "type") {
      const val = (typeInputRef.current?.value || "").trim().replace(/,/g, "");
      if (val === "") return;
      ok = Number(val) === curProblem.answer;
      typeInputRef.current?.blur();
    } else if (curMode === "truefalse") {
      if (curSelection === null) return;
      ok = curSelection === tfIsTrue;
    } else {
      if (curSelection === null) return;
      ok = curSelection === curProblem.answer;
    }
    answeredRef.current = true;
    resolveAnswer(ok, false);
  }

  function handleTimeout() {
    if (!curProblem || answeredRef.current) return;
    answeredRef.current = true;
    if (curMode === "type") typeInputRef.current?.blur();
    resolveAnswer(false, true);
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
    const result = await finishStageAction(currentTopic.id, n, correct);
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

  function afterStageResult(action: "next" | "retry" | "map") {
    const n = stageResult?.n ?? 1;
    setStageResult(null);
    if (action === "next" && currentTopic) startStage(n + 1);
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
      const res = await solvePuzzleAction(p.id, moveCount + 1);
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

            {comps.length > 0 && (
              <div className="duel-history">
                <div className="duel-history-label">{ja ? "コンペティション" : "Competitions"}</div>
                {comps.slice(0, 6).map((c) => (
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
        {view === "home" && (
          <HomeView
            progress={progress}
            li={li}
            solvedCount={solvedCount}
            dailyStreak={dailyStreak}
            onOpenTopic={openTopic}
            onOpenArena={() => { loadPuzzle(puzIdx); setView("arena"); }}
            onOpenBlitz={openBlitzPicker}
            onOpenTricks={() => { setTrickId(null); setView("tricks"); }}
            onOpenDaily={startDaily}
            dailyPlayed={!!dailyStatus?.played}
            onContinue={continueStage}
            onShare={openShare}
            quests={quests}
            claimable={claimableQuests}
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
            lang={lang}
            t={t}
          />
        )}

        {view === "topic" && currentTopic && <TopicView topic={currentTopic} lang={lang} t={t} />}

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
            shakeQuestion={shakeQuestion}
            wrongFlash={wrongFlash}
            shakeTile={shakeTile}
            streakPop={streakPop}
            feedbackOk={feedback ? feedback.ok : null}
            eliminated={eliminated}
            timerKey={timerKey}
            timerMs={timerMs}
            timerPaused={!!feedback}
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
        {view === "home" ? (
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
            <button className="bottomnav-item" onClick={() => setMenuOpen((o) => !o)}>
              <span className="bottomnav-icon bottomnav-avatar">{(user.name?.[0] || user.email?.[0] || "?").toUpperCase()}</span>
              <span>{lang === "ja" ? "設定" : "Profile"}</span>
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
                <button className="btn btn-ghost" onClick={() => openTopic(currentTopicId!)}>
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
            <div className="result-sub">{t.result.correctOf(stageResult.correct, QUESTIONS_PER_STAGE)}</div>
            <div className="result-gems">+{stageResult.gemsGained} 💎</div>
            <div className="result-actions">
              {stageResult.passed ? (
                stageResult.n < STAGE_COUNT ? (
                  <button className="btn btn-primary" onClick={() => afterStageResult("next")}>{t.result.nextStage}</button>
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

/* ================= sub-views ================= */

function HomeView({
  progress,
  li,
  solvedCount,
  dailyStreak,
  onOpenTopic,
  onOpenArena,
  onOpenBlitz,
  onOpenTricks,
  onOpenDaily,
  dailyPlayed,
  onContinue,
  onShare,
  quests,
  claimable,
  reviewCount,
  reviewStats,
  onOpenQuests,
  onOpenShop,
  onStartReview,
  gemBalance,
  openDuels,
  liveComps,
  onEnterComp,
  assignment,
  assignedTopic,
  onOpenFriends,
  onAcceptDuel,
  lang,
  t,
}: {
  progress: ProgressState;
  li: ReturnType<typeof levelInfo>;
  solvedCount: number;
  dailyStreak: number;
  onOpenTopic: (id: string) => void;
  onOpenArena: () => void;
  onOpenBlitz: () => void;
  onOpenTricks: () => void;
  onOpenDaily: () => void;
  dailyPlayed: boolean;
  onContinue: (topicId: string, stageN: number) => void;
  onShare: (f: ShareFocus) => void;
  quests: QuestState[];
  claimable: number;
  reviewCount: number;
  reviewStats: ReviewStats | null;
  onOpenQuests: () => void;
  onOpenShop: () => void;
  onStartReview: () => void;
  gemBalance: number | null;
  openDuels: ChallengeRow[];
  liveComps: CompetitionSummary[];
  onEnterComp: (c: CompetitionSummary) => void;
  assignment: { name: string; teacherName: string; assignedNote: string | null } | undefined;
  assignedTopic: Topic | undefined;
  onOpenFriends: () => void;
  onAcceptDuel: (d: ChallengeRow) => void;
  lang: Lang;
  t: UIDict;
}) {
  const firstIncompleteIdx = (() => {
    const idx = TOPICS.findIndex((tp) => topicProgressOf(progress, tp.id).cleared < STAGE_COUNT);
    return idx === -1 ? TOPICS.length - 1 : idx;
  })();
  const continueTopic = TOPICS[firstIncompleteIdx];
  const continueStageN = Math.min(topicProgressOf(progress, continueTopic.id).cleared + 1, STAGE_COUNT);
  const rank = lang === "ja" ? RANKS_JA[li.rank] || li.rank : li.rank;

  const [resetIn, setResetIn] = useState(() => msUntilUTCMidnight());
  useEffect(() => {
    const id = setInterval(() => setResetIn(msUntilUTCMidnight()), 60000);
    return () => clearInterval(id);
  }, []);
  const resetHours = Math.floor(resetIn / 3600000);
  const resetMins = Math.floor((resetIn % 3600000) / 60000);

  const pathWrapRef = useRef<HTMLDivElement | null>(null);
  const [mapGeo, setMapGeo] = useState<{ w: number; h: number; d: string }>({ w: 0, h: 0, d: "" });

  useEffect(() => {
    const wrap = pathWrapRef.current;
    if (!wrap) return;
    function computePath() {
      if (!wrap) return;
      const wrapRect = wrap.getBoundingClientRect();
      const nodeEls = Array.from(wrap.querySelectorAll<HTMLElement>(".node, .boss-node"));
      const pts = nodeEls.map((n) => {
        const r = n.getBoundingClientRect();
        return { x: r.left + r.width / 2 - wrapRect.left, y: r.top + r.height / 2 - wrapRect.top };
      });
      if (pts.length < 2) {
        setMapGeo({ w: wrapRect.width, h: wrapRect.height, d: "" });
        return;
      }
      let d = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 1; i < pts.length; i++) {
        const p0 = pts[i - 1], p1 = pts[i];
        const midY = (p0.y + p1.y) / 2;
        d += ` C ${p0.x} ${midY}, ${p1.x} ${midY}, ${p1.x} ${p1.y}`;
      }
      setMapGeo({ w: wrapRect.width, h: wrapRect.height, d });
    }
    computePath();
    const ro = new ResizeObserver(computePath);
    ro.observe(wrap);
    window.addEventListener("resize", computePath);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", computePath);
    };
  }, [progress, lang]);

  return (
    <section className="view active home-view">
      <div className="unit-banner">
        <svg className="mandala" viewBox="0 0 100 100"><Mandala stroke="#fff" /></svg>
        <div className="mascot"><Mascot mood="happy" /></div>
        <div className="eyebrow">{t.home.eyebrow}</div>
        <h1>{t.home.title}</h1>
        <div className="home-byline">
          <img src="/brand/vedank-mark.png" alt="" />
          <span>{t.home.brand}</span>
        </div>
        <button className="levelrow levelrow-share" onClick={() => onShare("level")} aria-label={`${t.share.statLevel} ${li.level} — ${t.share.shareBtn}`}>
          <span>{t.home.level} {li.level} · {rank}</span>
          <span className="levelrow-right">{li.into} / 150 <span className="levelrow-share-ico" aria-hidden="true">📤</span></span>
        </button>
        <div className="bar-track"><div className="bar-fill" style={{ width: `${li.pct}%` }} /></div>
      </div>

      <div className="continue-card" style={{ background: gradCss(continueTopic.grad) }} onClick={() => onContinue(continueTopic.id, continueStageN)}>
        <div className="continue-card-label">{lang === "ja" ? "続きから" : "Continue"}</div>
        <div className="continue-card-title">
          {(lang === "ja" ? continueTopic.titleJa : continueTopic.title)} — {lang === "ja" ? `ステージ ${continueStageN}` : `Stage ${continueStageN}`}
        </div>
        <span className="continue-card-arrow">▶</span>
      </div>

      {dailyStreak > 0 && (
        <div className="streak-calendar">
          <span className="streak-calendar-label">🔥 {dailyStreak}{t.home.streakSuffix}</span>
          <div className="streak-days">
            {Array.from({ length: 7 }, (_, i) => i).map((daysAgo) => (
              <span key={daysAgo} className={`streak-day${daysAgo < dailyStreak ? " lit" : ""}`}>
                🔥
              </span>
            ))}
          </div>
          {resetHours < 6 && (
            <div className="streak-urgent">
              ⏳ {lang === "ja" ? `あと${resetHours}時間${resetMins}分でリセット！` : `Resets in ${resetHours}h ${resetMins}m — play today!`}
            </div>
          )}
        </div>
      )}

      {liveComps.length > 0 && (
        <div className="duel-card comp-card">
          <div className="duel-card-head">
            🏅 {lang === "ja" ? "コンペティション開催中" : "Competition open"}
          </div>
          {liveComps.slice(0, 2).map((c) => (
            <button key={c.id} className="duel-card-row" onClick={() => onEnterComp(c)}>
              <span className="duel-card-avatar">🏅</span>
              <span className="duel-card-info">
                <span className="duel-card-name">{c.name}</span>
                <span className="duel-card-sub">
                  {c.levelName} · {c.questionCount} {lang === "ja" ? "問" : "Qs"} ·{" "}
                  {Math.round(c.durationSec / 60)} {lang === "ja" ? "分" : "min"}
                </span>
              </span>
              <span className="duel-card-go">{lang === "ja" ? "参加" : "Enter"} ›</span>
            </button>
          ))}
        </div>
      )}

      {assignment && assignedTopic && (
        <button className="assign-card" onClick={() => onOpenTopic(assignedTopic.id)}>
          <span className="assign-card-icon">{assignedTopic.icon}</span>
          <span className="assign-card-info">
            <span className="assign-card-label">
              🏫 {lang === "ja" ? `${assignment.teacherName} 先生から` : `From ${assignment.teacherName}`}
            </span>
            <span className="assign-card-title">
              {lang === "ja" ? assignedTopic.titleJa : assignedTopic.title}
            </span>
            {assignment.assignedNote && (
              <span className="assign-card-note">{assignment.assignedNote}</span>
            )}
          </span>
          <span className="assign-card-go">›</span>
        </button>
      )}

      {openDuels.length > 0 && (
        <div className="duel-card">
          <div className="duel-card-head">
            ⚔️ {lang === "ja" ? "対戦の申し込み" : "Duels waiting"}
          </div>
          {openDuels.slice(0, 3).map((d) => (
            <button key={d.id} className="duel-card-row" onClick={() => onAcceptDuel(d)}>
              <span className="duel-card-avatar">{d.opponentName[0]?.toUpperCase() ?? "?"}</span>
              <span className="duel-card-info">
                <span className="duel-card-name">{d.opponentName}</span>
                <span className="duel-card-sub">
                  {lang === "ja" ? `ブリッツ ${d.fromScore}点に挑戦` : `Scored ${d.fromScore} in Blitz`}
                </span>
              </span>
              <span className="duel-card-go">{lang === "ja" ? "挑む" : "Beat it"} ›</span>
            </button>
          ))}
        </div>
      )}

      {/* Today's quests, on the home screen rather than buried in a menu — this
          is the card that gives a reason to open the app tomorrow. */}
      <div className="quest-card">
        <button className="quest-card-head" onClick={onOpenQuests}>
          <span className="quest-card-title">📜 {lang === "ja" ? "今日のクエスト" : "Today's Quests"}</span>
          <span className="quest-card-right">
            {claimable > 0 && <span className="quest-card-badge">{claimable}</span>}
            <span className="quest-card-arrow">›</span>
          </span>
        </button>
        <div className="quest-card-rows">
          {quests.map((q) => (
            <div key={q.id} className={`quest-mini${q.claimed ? " claimed" : ""}`}>
              <span className="quest-mini-icon">{q.claimed ? "✅" : q.icon}</span>
              <span className="quest-mini-title">{lang === "ja" ? q.titleJa : q.title}</span>
              <span className="quest-mini-count mono">
                {Math.min(q.count, q.target)}/{q.target}
              </span>
            </div>
          ))}
          {quests.length === 0 && (
            <div className="quest-mini quest-mini-empty">{lang === "ja" ? "読み込み中…" : "Loading…"}</div>
          )}
        </div>
        <div className="quest-card-foot">
          <button className="quest-card-shop" onClick={onOpenShop}>
            🛍️ {lang === "ja" ? "ショップ" : "Shop"}
            <span className="mono"> · 💎 {gemBalance ?? "…"}</span>
          </button>
          <button className="quest-card-shop quest-card-friends" onClick={onOpenFriends}>
            👥 {lang === "ja" ? "フレンド" : "Friends"}
          </button>
        </div>
      </div>

      {reviewCount > 0 ? (
        <button className="review-cta" onClick={onStartReview}>
          <div className="review-cta-icon">🩹</div>
          <div className="review-cta-info">
            <div className="review-cta-title">
              {lang === "ja" ? "まちがいなおし" : "Fix Your Misses"}
            </div>
            <div className="review-cta-sub">
              {lang === "ja"
                ? `${reviewCount} 問が復習どき`
                : `${reviewCount} question${reviewCount === 1 ? "" : "s"} due now`}
              {reviewStats && reviewStats.learning > reviewCount
                ? lang === "ja"
                  ? ` · ${reviewStats.learning - reviewCount} 問おやすみ中`
                  : ` · ${reviewStats.learning - reviewCount} resting`
                : ""}
            </div>
          </div>
          <span className="review-cta-count mono">{reviewCount}</span>
        </button>
      ) : reviewStats && reviewStats.learning > 0 ? (
        /* Nothing due: say when it comes back rather than hiding the card, so
           the schedule is visible instead of feeling arbitrary. */
        <div className="review-rest">
          <span className="review-rest-icon">🌱</span>
          <span className="review-rest-text">
            {lang === "ja"
              ? `${reviewStats.learning} 問を覚えているところ。${
                  reviewStats.nextDueAt ? `次の復習は ${fmtDue(reviewStats.nextDueAt, true)}` : ""
                }`
              : `${reviewStats.learning} question${reviewStats.learning === 1 ? "" : "s"} settling in.${
                  reviewStats.nextDueAt ? ` Next review ${fmtDue(reviewStats.nextDueAt, false)}.` : ""
                }`}
          </span>
          {reviewStats.retired > 0 && (
            <span className="review-rest-badge mono">
              {reviewStats.retired} {lang === "ja" ? "習得" : "learned"}
            </span>
          )}
        </div>
      ) : null}

      <div className="blitz-cta" onClick={onOpenBlitz}>
        <div className="blitz-cta-icon">⚡</div>
        <div className="blitz-cta-info">
          <div className="blitz-cta-title">{t.home.blitzTitle}</div>
          <div className="blitz-cta-sub">{t.home.blitzSub}</div>
        </div>
        <span className="blitz-cta-arrow">›</span>
      </div>

      <div className={`blitz-cta daily-cta${dailyPlayed ? " played" : ""}`} onClick={onOpenDaily}>
        <div className="blitz-cta-icon">{dailyPlayed ? "✅" : "🗓️"}</div>
        <div className="blitz-cta-info">
          <div className="blitz-cta-title">{lang === "ja" ? "デイリーチャレンジ" : "Daily Challenge"}</div>
          <div className="blitz-cta-sub">
            {dailyPlayed
              ? lang === "ja"
                ? "今日はクリア済み。また明日！"
                : "Done for today — come back tomorrow!"
              : lang === "ja"
              ? "世界中が同じ8問に挑戦中"
              : "The same 8 questions for everyone, today only"}
          </div>
        </div>
        <span className="blitz-cta-arrow">›</span>
      </div>

      <div className="blitz-cta trick-cta" onClick={onOpenTricks}>
        <div className="blitz-cta-icon">🔮</div>
        <div className="blitz-cta-info">
          <div className="blitz-cta-title">{lang === "ja" ? "マジックモード" : "Magic Tricks"}</div>
          <div className="blitz-cta-sub">
            {lang === "ja" ? "友だちをおどろかせる4つのネタ" : "Four tricks to amaze your friends"}
          </div>
        </div>
        <span className="blitz-cta-arrow">›</span>
      </div>

      <div className="path-wrap" ref={pathWrapRef}>
        {mapGeo.d && (
          <svg className="path-svg" width={mapGeo.w} height={mapGeo.h} style={{ position: "absolute", top: 0, left: 0, zIndex: 0, pointerEvents: "none" }}>
            <path className="path-svg-glow" d={mapGeo.d} fill="none" />
            <path className="path-svg-line" d={mapGeo.d} fill="none" />
          </svg>
        )}
        {TOPICS.map((tp, i) => {
          const p = topicProgressOf(progress, tp.id);
          const locked = !topicUnlocked(progress, tp.id);
          const isCurrent = i === firstIncompleteIdx;
          const boss =
            i === 6 ? (
              <div className="boss-row" key="boss">
                <div className="node-wrap">
                  <div className="boss-node" onClick={onOpenArena}>
                    🔥
                    <span className="boss-chip">{solvedCount}/{PUZZLES.length}</span>
                  </div>
                  <span className="node-platform" />
                  <div className="node-label">{t.home.dojo}</div>
                </div>
              </div>
            ) : null;
          return (
            <div key={tp.id}>
              {boss}
              <div className={`path-row pos-${PATH_POS[i % PATH_POS.length]}`}>
                <div className="node-wrap">
                  {isCurrent && <div className="node-bubble">{t.home.play}</div>}
                  <span className="node-level">{i + 1}</span>
                  <div
                    className={`node${isCurrent ? " current" : ""}${locked ? " node-locked" : ""}`}
                    style={locked ? undefined : { background: gradCss(tp.grad) }}
                    onClick={() => onOpenTopic(tp.id)}
                  >
                    {locked ? "🔒" : tp.icon}
                    <span className="stage-pips">
                      {Array.from({ length: STAGE_COUNT }, (_, k) => (
                        <i key={k} className={k < p.cleared ? "on" : ""} />
                      ))}
                    </span>
                  </div>
                  <span className="node-platform" />
                  <div className="node-label">{lang === "ja" ? tp.titleJa : tp.title}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function DailyView({
  qs,
  idx,
  pick,
  done,
  status,
  lang,
  onPick,
  onHome,
}: {
  qs: DailyQuestion[];
  idx: number;
  pick: number | null;
  done: { points: number; correct: number } | null;
  status: DailyStatus | null;
  lang: Lang;
  onPick: (v: number) => void;
  onHome: () => void;
}) {
  if (done || status?.played) {
    const correct = done?.correct ?? status?.correct ?? 0;
    const points = done?.points ?? status?.points ?? 0;
    return (
      <section className="view active">
        <div className="daily-done">
          <div className="daily-done-icon">{correct >= 6 ? "🎉" : correct >= 4 ? "👏" : "💪"}</div>
          <h1>{lang === "ja" ? "今日の挑戦は完了！" : "Today's challenge is done!"}</h1>
          <div className="daily-done-score mono">{correct} / {DAILY_QUESTIONS}</div>
          <div className="daily-done-points">+{points} {lang === "ja" ? "リーグポイント" : "league points"}</div>
          <p className="daily-done-note">
            {lang === "ja"
              ? "同じ問題を世界中のみんなが解いています。また明日！"
              : "Everyone in the world got these same questions today. Come back tomorrow!"}
          </p>
          <button className="btn btn-primary" onClick={onHome}>
            {lang === "ja" ? "ホームへ" : "Back home"}
          </button>
        </div>
      </section>
    );
  }

  const q = qs[idx];
  if (!q) return null;
  return (
    <section className="view active">
      <div className="daily-top">
        <div className="daily-chip">🗓️ {lang === "ja" ? "デイリー" : "Daily"}</div>
        <div className="daily-count">{idx + 1} / {qs.length}</div>
      </div>
      <div className="daily-progress">
        {qs.map((_, i) => (
          <i key={i} className={i < idx ? "done" : i === idx ? "now" : ""} />
        ))}
      </div>
      <div className="practice-card daily-card">
        <div className="question mono">{q.problem.prompt} = ?</div>
        <div className="tile-grid">
          {q.options.map((o) => {
            const state =
              pick === null
                ? ""
                : o === q.problem.answer
                ? " daily-right"
                : o === pick
                ? " daily-wrong"
                : " eliminated";
            return (
              <button
                key={o}
                className={`choice-tile mono${state}`}
                disabled={pick !== null}
                onClick={() => onPick(o)}
              >
                {fmt(o)}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TricksView({
  trickId,
  step,
  num,
  lang,
  onOpen,
  onStep,
  onReroll,
  onBackToList,
}: {
  trickId: string | null;
  step: number;
  num: number;
  lang: Lang;
  onOpen: (id: string) => void;
  onStep: (d: number) => void;
  onReroll: () => void;
  onBackToList: () => void;
}) {
  if (!trickId) {
    return (
      <section className="view active">
        <div className="topic-head">
          <div className="eyebrow-tag">{lang === "ja" ? "マジック" : "Magic"}</div>
          <h1>{lang === "ja" ? "友だちをおどろかせよう" : "Amaze your friends"}</h1>
          <p className="trick-intro">
            {lang === "ja"
              ? "どれも本物の数学。タネも仕掛けもありません――だから絶対に失敗しません。"
              : "Every one of these is real maths, not sleight of hand — which is why they never fail."}
          </p>
        </div>
        <div className="trick-list">
          {TRICKS.map((tk) => (
            <button key={tk.id} className="trick-card" onClick={() => onOpen(tk.id)}>
              <span className="trick-card-icon" style={{ background: gradCss(tk.grad) }}>{tk.icon}</span>
              <span className="trick-card-body">
                <span className="trick-card-title">{lang === "ja" ? tk.titleJa : tk.title}</span>
                <span className="trick-card-hook">{lang === "ja" ? tk.hookJa : tk.hook}</span>
              </span>
              <span className="trick-card-go">›</span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  const tk = TRICK_BY_ID[trickId];
  const total = tk.steps.length;
  const done = step >= total;
  const cur = done ? null : tk.steps[step];
  const secret = cur && (lang === "ja" ? cur.secretJa?.(num) : cur.secret?.(num));

  return (
    <section className="view active">
      <button className="trick-back" onClick={onBackToList}>
        ‹ {lang === "ja" ? "マジック一覧" : "All tricks"}
      </button>
      <div className="trick-hero" style={{ background: gradCss(tk.grad) }}>
        <div className="trick-hero-icon">{tk.icon}</div>
        <div className="trick-hero-title">{lang === "ja" ? tk.titleJa : tk.title}</div>
      </div>

      <div className="trick-rehearse">
        <span>{lang === "ja" ? "練習用の数" : "Rehearse with"}</span>
        <b className="mono">{num}</b>
        <button onClick={onReroll}>{lang === "ja" ? "べつの数" : "New number"}</button>
      </div>

      {done ? (
        <div className="trick-finale">
          <div className="trick-finale-label">{lang === "ja" ? "答えはいつも" : "The answer is always"}</div>
          <div className="trick-finale-value mono">{lang === "ja" ? tk.revealJa(num) : tk.reveal(num)}</div>
          <div className="trick-why">
            <b>{lang === "ja" ? "なぜ？" : "Why it works"}</b>
            <p>{lang === "ja" ? tk.whyJa : tk.why}</p>
          </div>
          <button className="btn btn-primary" onClick={() => onStep(-total)}>
            {lang === "ja" ? "もう一度" : "Run it again"}
          </button>
        </div>
      ) : (
        <>
          <div className="trick-progress">
            {tk.steps.map((_, i) => (
              <i key={i} className={i <= step ? "on" : ""} />
            ))}
          </div>
          <div className="trick-say">
            <div className="trick-say-label">{lang === "ja" ? "こう言おう" : "Say this out loud"}</div>
            <p>{lang === "ja" ? cur!.sayJa : cur!.say}</p>
          </div>
          {secret && (
            <div className="trick-secret">
              <div className="trick-secret-label">🤫 {lang === "ja" ? "きみだけのメモ" : "Only you see this"}</div>
              <p className="mono">{secret}</p>
            </div>
          )}
          <div className="trick-nav">
            <button className="btn btn-ghost" disabled={step === 0} onClick={() => onStep(-1)}>
              {lang === "ja" ? "◀ もどる" : "◀ Back"}
            </button>
            <button className="btn btn-primary" onClick={() => onStep(1)}>
              {step === total - 1 ? (lang === "ja" ? "ネタばらし" : "Reveal") : lang === "ja" ? "つぎへ ▶" : "Next ▶"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

const DIGIT_FLOW_TOPICS = new Set(["add9", "sub9", "add8sub8"]);

const DIGIT_ARROW_EX: Record<string, { before: string; tensLabel: string; unitsLabel: string; after: string; eq: string }> = {
  add9: { before: "36", tensLabel: "+1", unitsLabel: "−1", after: "45", eq: "36 + 9" },
  sub9: { before: "36", tensLabel: "−1", unitsLabel: "+1", after: "27", eq: "36 − 9" },
  add8sub8: { before: "73", tensLabel: "+1", unitsLabel: "−2", after: "81", eq: "73 + 8" },
};

// Mirrors the book's example card: "tens x → y / units a → b" lines on the left,
// right-angle elbow arrows off the two digits, answer in a green box.
function DigitArrowSVG({ before, after, lang }: { before: string; after: string; lang: Lang }) {
  const beforeTens = before[0];
  const beforeUnits = before[1];
  const afterTens = after[after.length - 2];
  const afterUnits = after[after.length - 1];
  const tensWord = lang === "ja" ? "十の位" : "tens";
  const unitsWord = lang === "ja" ? "一の位" : "units";
  return (
    <svg viewBox="0 0 300 190" className="digitarrow-svg">
      <text x="14" y="56" className="digitarrow-line">{tensWord} {beforeTens} → {afterTens}</text>
      <text x="14" y="82" className="digitarrow-line">{unitsWord} {beforeUnits} → {afterUnits}</text>

      <text x="172" y="36" className="digitarrow-newdigit" textAnchor="middle">{afterTens}</text>
      <path d="M202,72 H172 V48" className="digitarrow-elbow" fill="none" markerEnd="url(#daArrow)" />
      <text x="214" y="80" className="digitarrow-digit" textAnchor="middle">{beforeTens}</text>
      <text x="240" y="80" className="digitarrow-digit" textAnchor="middle">{beforeUnits}</text>
      <path d="M252,80 H276 V110" className="digitarrow-elbow" fill="none" markerEnd="url(#daArrow)" />
      <text x="276" y="136" className="digitarrow-newdigit" textAnchor="middle">{afterUnits}</text>

      <rect x="48" y="112" width="104" height="44" rx="11" className="digitarrow-ansbox" />
      <text x="100" y="144" className="digitarrow-ansnum" textAnchor="middle">{after}</text>
      <defs>
        <marker id="daArrow" markerUnits="userSpaceOnUse" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" className="digitarrow-elbow" />
        </marker>
      </defs>
    </svg>
  );
}

function DigitFlowIllus({
  topic,
  rows,
  blurb,
  lang,
}: {
  topic: Topic;
  rows: [string, string][];
  blurb: string;
  lang: Lang;
}) {
  const [eq] = rows[0];
  const tens = rows[1];
  const units = rows[2];
  const [unitsVal, unitsAnswer] = units[1].split("→").map((s) => s.trim());
  const arrowEx = DIGIT_ARROW_EX[topic.id];
  return (
    <div className="bookmethod-wrap">
      <div className="bookmethod-card" style={{ background: `color-mix(in srgb, ${topic.grad[0]} 14%, var(--surface-2))`, borderColor: topic.grad[0] }}>
        <span className="bookmethod-badge" style={{ background: gradCss(topic.grad) }}>{topic.icon}</span>
        <div>
          <div className="bookmethod-title">{lang === "ja" ? "ルール" : "The Rule"}</div>
          <div className="bookmethod-desc">{blurb}</div>
          {arrowEx && (
            <div className="bookmethod-badges">
              <span className="bookmethod-pill plus">{arrowEx.tensLabel} {lang === "ja" ? "十の位" : "tens"}</span>
              <span className="bookmethod-pill minus">{arrowEx.unitsLabel} {lang === "ja" ? "一の位" : "units"}</span>
            </div>
          )}
        </div>
      </div>
      <div className="bookexample-flow-title">
        {lang === "ja" ? (
          <>まずパターンを見つける <span>→</span> それから左から右へ計算</>
        ) : (
          <>Spot the Pattern First <span>→</span> Then Calculate From Left to Right</>
        )}
      </div>
      <div className="bookexample-card">
        <div className="bookexample-header mono" style={{ background: gradCss(topic.grad) }}>
          {lang === "ja" ? "例：" : "Example: "}{arrowEx ? arrowEx.eq : eq}
        </div>
        {arrowEx ? (
          <DigitArrowSVG before={arrowEx.before} after={arrowEx.after} lang={lang} />
        ) : (
          <div className="bookexample-body">
            <div className="bookexample-col">
              <div className="bookexample-col-label">{lang === "ja" ? "手順1・十の位" : "Step 1 · tens"}</div>
              <div className="bookexample-arrow up">▲</div>
              <div className="bookexample-expr mono">{tens[0]}</div>
              <div className="bookexample-val mono">{tens[1]}</div>
            </div>
            <div className="bookexample-col">
              <div className="bookexample-col-label">{lang === "ja" ? "手順2・一の位" : "Step 2 · units"}</div>
              <div className="bookexample-arrow down">▼</div>
              <div className="bookexample-expr mono">{units[0]}</div>
              <div className="bookexample-val mono">{unitsVal}</div>
            </div>
          </div>
        )}
        {!arrowEx && (
          <div className="bookexample-answer mono" style={{ borderColor: topic.grad[0], color: topic.grad[0] }}>{unitsAnswer}</div>
        )}
      </div>
    </div>
  );
}

function BookMethodCard({
  topic,
  rows,
  blurb,
  lang,
}: {
  topic: Topic;
  rows: [string, string][];
  blurb: string;
  lang: Lang;
}) {
  const [eq] = rows[0];
  const bodyRows = rows.slice(1);
  const Diagram = BOOK_DIAGRAMS[topic.id];
  const diagramEq = BOOK_DIAGRAM_EQ[topic.id];
  return (
    <div className="bookmethod-wrap">
      <div className="bookmethod-card" style={{ background: `color-mix(in srgb, ${topic.grad[0]} 14%, var(--surface-2))`, borderColor: topic.grad[0] }}>
        <span className="bookmethod-badge" style={{ background: gradCss(topic.grad) }}>{topic.icon}</span>
        <div>
          <div className="bookmethod-title">{lang === "ja" ? "やり方" : "The Method"}</div>
          <div className="bookmethod-desc">{blurb}</div>
        </div>
      </div>
      <div className="bookexample-flow-title">
        {lang === "ja" ? (
          <>まずパターンを見つける <span>→</span> それから左から右へ計算</>
        ) : (
          <>Spot the Pattern First <span>→</span> Then Calculate From Left to Right</>
        )}
      </div>
      <div className="bookexample-card">
        <div className="bookexample-header mono" style={{ background: gradCss(topic.grad) }}>
          {lang === "ja" ? "例：" : "Example: "}{Diagram ? diagramEq! : eq}
        </div>
        {Diagram ? (
          <Diagram lang={lang} />
        ) : (
          <div className="bookexample-list">
            {bodyRows.map((r, i) => (
              <div className="bookexample-list-row mono" key={i}>
                <span>{r[0]}</span>
                <b>{r[1]}</b>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TopicView({ topic, lang, t }: { topic: Topic; lang: Lang; t: UIDict }) {
  const ex = topic.example();
  const rows = topic.exSteps(ex, lang);
  const title = lang === "ja" ? topic.titleJa : topic.title;
  const blurb = lang === "ja" ? topic.blurbJa : topic.blurb;
  return (
    <section className="view active">
      <div className="topic-head">
        <div className="icon-badge" style={{ background: gradCss(topic.grad) }}>{topic.icon}</div>
        <h1>{title}</h1>
        <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 8, lineHeight: 1.5, fontWeight: 600 }}>{blurb}</p>
      </div>
      <div className="card">
        <h4>{t.topicView.howItWorks}</h4>
        {DIGIT_FLOW_TOPICS.has(topic.id) ? (
          <DigitFlowIllus topic={topic} rows={rows} blurb={blurb} lang={lang} />
        ) : (
          <BookMethodCard topic={topic} rows={rows} blurb={blurb} lang={lang} />
        )}
      </div>
    </section>
  );
}

function StageMapView({
  topic,
  progress,
  onPlay,
  lang,
  t,
}: {
  topic: Topic;
  progress: ProgressState;
  onPlay: (n: number) => void;
  lang: Lang;
  t: UIDict;
}) {
  const p = topicProgressOf(progress, topic.id);
  return (
    <section className="view active">
      <div className="stagemap-head">
        <h1 style={{ fontSize: 22 }}>{lang === "ja" ? topic.titleJa : topic.title}</h1>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 6, fontWeight: 600 }}>
          {t.stageMap.instructions}
        </p>
      </div>
      <div className="stage-track">
        <div className="stage-line" />
        {Array.from({ length: STAGE_COUNT }, (_, k) => k + 1).map((n) => {
          const unlocked = stageUnlocked(progress, topic.id, n);
          const blocker = unlocked ? null : stageBlocker(progress, topic.id, n);
          const blockerTopic = blocker ? TOPICS.find((tp) => tp.id === blocker.topicId) : null;
          const stars = starsForStage(progress, topic.id, n);
          const isCurrent = unlocked && n === p.cleared + 1;
          return (
            <div className={`stage-row pos-${STAGE_POS[(n - 1) % STAGE_POS.length]}`} key={n}>
              <div className="node-wrap">
                {isCurrent && <div className="node-bubble">{t.stageMap.play}</div>}
                <div
                  className={`stage-node${unlocked ? "" : " locked"}${isCurrent ? " current" : ""}`}
                  style={unlocked ? { background: gradCss(topic.grad) } : {}}
                  onClick={() => unlocked && onPlay(n)}
                >
                  {unlocked ? n : "🔒"}
                  {unlocked && (
                    <span className="stars-mini">
                      {[0, 1, 2].map((k) => (
                        <span key={k} className={k < stars ? "on" : "off"}>★</span>
                      ))}
                    </span>
                  )}
                </div>
                {blockerTopic && (
                  <div className="stage-blocked-note">
                    {lang === "ja"
                      ? `先に「${blockerTopic.titleJa}」のステージ${blocker!.stage}をクリア`
                      : `Clear Stage ${blocker!.stage} of ${blockerTopic.title} first`}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CountdownTimer({ timerKey, timerMs, paused, midMs = 10000, lowMs = 5000 }:
  { timerKey: number; timerMs: number; paused: boolean; midMs?: number; lowMs?: number }) {
  const [left, setLeft] = useState(timerMs);
  const startRef = useRef(Date.now());
  const pausedAtRef = useRef<number | null>(null);

  useEffect(() => {
    startRef.current = Date.now();
    pausedAtRef.current = null;
    setLeft(timerMs);
  }, [timerKey, timerMs]);

  useEffect(() => {
    if (paused) pausedAtRef.current = Date.now();
    else if (pausedAtRef.current !== null) {
      startRef.current += Date.now() - pausedAtRef.current;
      pausedAtRef.current = null;
    }
  }, [paused]);

  useEffect(() => {
    const id = setInterval(() => {
      if (pausedAtRef.current !== null) return;
      setLeft(Math.max(0, timerMs - (Date.now() - startRef.current)));
    }, 100);
    return () => clearInterval(id);
  }, [timerKey, timerMs]);

  const secs = Math.ceil(left / 1000);
  const label = secs >= 60 ? `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}` : `${secs}`;
  return (
    <div className={`timer-count${left <= lowMs ? " low" : left <= midMs ? " mid" : ""}`} aria-live="off">
      <span className="timer-count-icon" aria-hidden="true">⏱</span>
      <span className="timer-count-num mono">{label}</span>
    </div>
  );
}

function PracticeView({
  topic,
  stageN,
  qIndex,
  correct,
  problem,
  mode,
  tileOptions,
  curSelection,
  tfShown,
  checkEnabled,
  shakeQuestion,
  wrongFlash,
  shakeTile,
  streakPop,
  feedbackOk,
  eliminated,
  timerKey,
  timerMs,
  timerPaused,
  runs,
  runReady,
  swingAnim,
  isBoss,
  comboStreak,
  skinId,
  typeInputRef,
  practiceCardRef,
  onSelect,
  onInputChange,
  onCheck,
  onAddRun,
  lang,
  t,
}: {
  topic: Topic;
  stageN: number;
  qIndex: number;
  correct: number;
  problem: Problem;
  mode: Mode;
  tileOptions: number[];
  curSelection: number | boolean | null;
  tfShown: number;
  checkEnabled: boolean;
  shakeQuestion: boolean;
  wrongFlash: boolean;
  shakeTile: boolean;
  streakPop: boolean;
  feedbackOk: boolean | null;
  eliminated: number[];
  timerKey: number;
  timerMs: number;
  timerPaused: boolean;
  runs: number;
  runReady: boolean;
  swingAnim: "hit" | "miss" | null;
  isBoss: boolean;
  comboStreak: number;
  skinId: string;
  typeInputRef: React.RefObject<HTMLInputElement | null>;
  practiceCardRef: React.RefObject<HTMLDivElement | null>;
  onSelect: (v: number | boolean) => void;
  onInputChange: (v: string) => void;
  onCheck: () => void;
  onAddRun: () => void;
  lang: Lang;
  t: UIDict;
}) {
  const comboTier = comboStreak >= 9 ? 3 : comboStreak >= 6 ? 2 : comboStreak >= 3 ? 1 : 0;
  const modeTag = t.practice.modeTags[mode];
  const title = lang === "ja" ? topic.titleJa : topic.title;

  return (
    <section className="view active">
      <div className="progress-top">
        <div className="progress-top-fill" style={{ width: `${Math.round((qIndex / QUESTIONS_PER_STAGE) * 100)}%` }} />
      </div>
      <CountdownTimer timerKey={timerKey} timerMs={timerMs} paused={timerPaused} />
      <div className="topic-head" style={{ marginTop: 2 }}>
        <div className={`eyebrow-tag${isBoss ? " boss-tag" : ""}`}>{isBoss ? t.practice.bossStage : t.practice.stageOf(stageN, STAGE_COUNT)}</div>
        <h1>{title}</h1>
      </div>
      <div
        key={qIndex}
        className={`practice-card${isBoss ? " boss-card" : ""}${feedbackOk === true ? " correct-glow" : feedbackOk === false ? " wrong-glow" : ""}`}
        ref={practiceCardRef}
      >
        <div className="practice-meta">
          <span>{t.practice.question} {qIndex + 1} / {QUESTIONS_PER_STAGE}</span>
          <span className={`streak-flame${streakPop ? " pop" : ""}${correct >= 3 ? " combo3" : ""}`}>🔥 {correct}</span>
          {comboTier > 0 && <span className="combo-badge">×{comboTier + 1}</span>}
        </div>
        <div className="mode-eyebrow">{modeTag}</div>
        {mode !== "truefalse" && (
          <div className={`question mono${shakeQuestion ? " shake" : ""}`}>{problem.prompt} = ?</div>
        )}
        {mode === "truefalse" && <div className={`question mono${shakeQuestion ? " shake" : ""}`} />}

        {mode === "type" && (
          <input
            ref={typeInputRef}
            className={`answer-input${wrongFlash ? " wrong-flash" : ""}`}
            inputMode="numeric"
            placeholder="?"
            autoComplete="off"
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && checkEnabled) onCheck(); }}
          />
        )}
        {mode === "choice" && (
          <div className="tile-grid">
            {tileOptions.map((o) => (
              <button
                key={o}
                className={`choice-tile${curSelection === o ? " picked" : ""}${curSelection === o && shakeTile ? " shake-tile" : ""}${eliminated.includes(o) ? " eliminated" : ""}`}
                disabled={eliminated.includes(o)}
                onClick={() => onSelect(o)}
              >
                {fmt(o)}
              </button>
            ))}
          </div>
        )}
        {mode === "target" && (
          <div className="tile-grid cols-3">
            {tileOptions.map((o) => (
              <button
                key={o}
                className={`target-tile${curSelection === o ? " picked" : ""}${curSelection === o && shakeTile ? " shake-tile" : ""}${eliminated.includes(o) ? " eliminated" : ""}`}
                disabled={eliminated.includes(o)}
                onClick={() => onSelect(o)}
              >
                {fmt(o)}
              </button>
            ))}
          </div>
        )}
        {mode === "balloon" && (
          <div className="balloon-grid">
            {tileOptions.map((o) => (
              <button
                key={o}
                className={`balloon-tile${curSelection === o ? " picked" : ""}${curSelection === o && shakeTile ? " shake-tile" : ""}${eliminated.includes(o) ? " eliminated" : ""}`}
                disabled={eliminated.includes(o)}
                onClick={() => onSelect(o)}
              >
                <span className="balloon-body">{fmt(o)}</span>
                <span className="balloon-string" />
              </button>
            ))}
          </div>
        )}
        {mode === "numberline" && (
          <div className="numberline-wrap">
            <div className="numberline-track" />
            <div className="numberline-dots">
              {[...tileOptions].sort((a, b) => a - b).map((o) => (
                <button
                  key={o}
                  className={`numberline-dot${curSelection === o ? " picked" : ""}${curSelection === o && shakeTile ? " shake-tile" : ""}${eliminated.includes(o) ? " eliminated" : ""}`}
                  disabled={eliminated.includes(o)}
                  onClick={() => onSelect(o)}
                >
                  <span className="numberline-dot-label">{fmt(o)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {mode === "arcade" && (
          <div className={`arcade-board skin-${skinId}${swingAnim ? ` swing-${swingAnim}` : ""}`}>
            <div className="scoreboard">
              <span className="scoreboard-label">{t.practice.runs}</span>
              <span className="scoreboard-runs mono">{runs}</span>
              {runReady ? (
                <button className="scoreboard-addrun" onClick={onAddRun}>{t.practice.scoreIt}</button>
              ) : (
                <span className="scoreboard-bat">⚾</span>
              )}
            </div>
            <div className="ballfield">
              <div className={`batter${swingAnim === "hit" ? " swing-hit" : swingAnim === "miss" ? " swing-miss" : ""}`}>
                <span className="batter-bat">🏏</span>
                <span className="batter-fig">🧍</span>
              </div>
              {swingAnim === "hit" && <div className="hit-ball">⚾</div>}
            </div>
            <div className="diamond-tile-grid">
              {tileOptions.map((o) => (
                <button
                  key={o}
                  className={`ball-tile${curSelection === o ? " picked" : ""}${curSelection === o && shakeTile ? " shake-tile" : ""}`}
                  onClick={() => onSelect(o)}
                >
                  {fmt(o)}
                </button>
              ))}
            </div>
            {swingAnim === "hit" && <div className="homerun-fx">{t.practice.homeRun}</div>}
            {swingAnim === "miss" && <div className="strike-fx">{t.practice.strike}</div>}
          </div>
        )}
        {mode === "catch" && (
          <div className={`catch-field skin-${skinId}`}>
            {tileOptions.map((o, i) => (
              <button
                key={o}
                className={`catch-tile${curSelection === o ? " picked" : ""}${curSelection === o && shakeTile ? " shake-tile" : ""}${eliminated.includes(o) ? " eliminated" : ""}`}
                style={{
                  "--col": i % 3,
                  "--delay": `${(i % 3) * 0.7 + Math.floor(i / 3) * 0.35}s`,
                  "--dur": `${3.4 + (i % 3) * 0.5}s`,
                } as React.CSSProperties}
                disabled={eliminated.includes(o)}
                onClick={() => onSelect(o)}
              >
                {fmt(o)}
              </button>
            ))}
          </div>
        )}
        {mode === "truefalse" && (
          <>
            <div className="tf-equation mono">{problem.prompt} = {fmt(tfShown)}</div>
            <div className="tf-row">
              <button
                className={`tf-btn${curSelection === true ? " picked true" : ""}${curSelection === true && shakeTile ? " shake-tile" : ""}`}
                onClick={() => onSelect(true)}
              >
                <span className="ic">✅</span>{t.practice.true}
              </button>
              <button
                className={`tf-btn${curSelection === false ? " picked false" : ""}${curSelection === false && shakeTile ? " shake-tile" : ""}`}
                onClick={() => onSelect(false)}
              >
                <span className="ic">❌</span>{t.practice.false}
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function ArenaView({
  puzIdx,
  glyphs,
  tray,
  selection,
  hintPair,
  moveCount,
  elapsed,
  bestMoves,
  solvedMap,
  status,
  svgRef,
  onSlotClick,
  onHint,
  onReset,
  onNext,
  t,
}: {
  puzIdx: number;
  glyphs: Glyph[];
  tray: boolean[];
  selection: Loc | null;
  hintPair: { from: Loc; to: Loc } | null;
  moveCount: number;
  elapsed: number;
  bestMoves: number | undefined;
  solvedMap: Record<string, boolean>;
  status: { text: string; color: string };
  svgRef: React.RefObject<SVGSVGElement | null>;
  onSlotClick: (loc: "board" | "tray", gi: number | null, slot: string | null, idx: number | null) => void;
  onHint: () => void;
  onReset: () => void;
  onNext: () => void;
  t: UIDict;
}) {
  const [dragging, setDragging] = useState(false);
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(null);
  const draggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number; loc: "board" | "tray"; gi: number | null; slot: string | null; idx: number | null } | null>(null);
  // onSlotClick reads `selection` state from its enclosing render; the document-level
  // drag listeners below live across multiple re-renders (pickup, then drop), so they
  // must always call the LATEST onSlotClick, not the one closed over at pointerdown time.
  const onSlotClickRef = useRef(onSlotClick);
  onSlotClickRef.current = onSlotClick;

  function parseDragTarget(el: Element | null) {
    const target = el?.closest<HTMLElement>("[data-drag-loc]");
    if (!target) return null;
    return {
      loc: target.dataset.dragLoc as "board" | "tray",
      gi: target.dataset.dragGi ? Number(target.dataset.dragGi) : null,
      slot: target.dataset.dragSlot || null,
      idx: target.dataset.dragIdx ? Number(target.dataset.dragIdx) : null,
    };
  }

  // Document-level listeners (rather than per-stick pointer capture) so a drag
  // survives the finger sliding off the thin stick hit-line — SVG pointer
  // capture is unreliable on mobile WebKit and silently drops the drag mid-move.
  function docPointerMove(e: PointerEvent) {
    const start = dragStartRef.current;
    if (!start) return;
    const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6;
    if (moved && !draggingRef.current) {
      draggingRef.current = true;
      setDragging(true);
      onSlotClickRef.current(start.loc, start.gi, start.slot, start.idx);
    }
    if (moved || draggingRef.current) setGhostPos({ x: e.clientX, y: e.clientY });
  }
  function docPointerUp(e: PointerEvent) {
    const start = dragStartRef.current;
    if (start) {
      if (draggingRef.current) {
        const target = parseDragTarget(document.elementFromPoint(e.clientX, e.clientY));
        if (target) onSlotClickRef.current(target.loc, target.gi, target.slot, target.idx);
      } else {
        onSlotClickRef.current(start.loc, start.gi, start.slot, start.idx);
      }
    }
    dragStartRef.current = null;
    draggingRef.current = false;
    setDragging(false);
    setGhostPos(null);
    document.removeEventListener("pointermove", docPointerMove);
    document.removeEventListener("pointerup", docPointerUp);
    document.removeEventListener("pointercancel", docPointerUp);
  }
  function handlePointerDown(e: React.PointerEvent, loc: "board" | "tray", gi: number | null, slot: string | null, idx: number | null) {
    dragStartRef.current = { x: e.clientX, y: e.clientY, loc, gi, slot, idx };
    document.addEventListener("pointermove", docPointerMove);
    document.addEventListener("pointerup", docPointerUp);
    document.addEventListener("pointercancel", docPointerUp);
  }
  useEffect(() => {
    return () => {
      document.removeEventListener("pointermove", docPointerMove);
      document.removeEventListener("pointerup", docPointerUp);
      document.removeEventListener("pointercancel", docPointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const p = PUZZLES[puzIdx];
  const cellW = 46, gap = 26, opW = 40;
  let total = 0;
  for (const g of glyphs) total += (g.type === "digit" ? cellW : opW) + gap;
  total -= gap;
  const startX = Math.max(10, (440 - total) / 2);
  const y = 24;

  const sticks: React.ReactElement[] = [];
  let x = startX;
  glyphs.forEach((g, gi) => {
    const geo = g.type === "digit" ? SEG_LINE : OP_GEO;
    const tips = g.type === "digit" ? SEG_TIP : OP_TIP;
    Object.keys(geo).forEach((slot) => {
      const c = geo[slot];
      const on = !!g.active[slot];
      const tipEnd = tips[slot];
      const x1 = x + c[0], y1 = y + c[1], x2 = x + c[2], y2 = y + c[3];
      const tipX = tipEnd === "start" ? x1 : x2;
      const tipY = tipEnd === "start" ? y1 : y2;
      const isSel = selection && selection.loc === "board" && selection.gi === gi && selection.slot === slot;
      const isHintSrc = hintPair && hintPair.from.loc === "board" && hintPair.from.gi === gi && hintPair.from.slot === slot;
      const isHintDst = hintPair && hintPair.to.loc === "board" && hintPair.to.gi === gi && hintPair.to.slot === slot;
      const lineCls = `stick ${isSel ? "stick-selected" : on ? "stick-active" : "stick-inactive"}${isHintSrc || isHintDst ? " stick-hint" : ""}`;
      const tipCls = isSel ? "stick-tip sel-tip" : on ? "stick-tip" : "stick-tip-off";
      sticks.push(
        <g
          key={`${gi}-${slot}`}
          data-drag-loc="board"
          data-drag-gi={gi}
          data-drag-slot={slot}
          onPointerDown={(e) => handlePointerDown(e, "board", gi, slot, null)}
        >
          <line className="stick-hit" x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={14} strokeLinecap="round" />
          <line className={lineCls} x1={x1} y1={y1} x2={x2} y2={y2} />
          <circle className={tipCls} cx={tipX} cy={tipY} r={isSel ? 6 : on ? 5.5 : 4} />
        </g>
      );
    });
    x += (g.type === "digit" ? cellW : opW) + gap;
  });

  return (
    <section className="view active">
      <div className="topic-head">
        <div className="icon-badge" style={{ background: "linear-gradient(135deg,#9B30FF,#FFC93C)" }}>🔥</div>
        <div className="sutra-tag" style={{ background: "linear-gradient(135deg,#9B30FF,#FFB020)" }}>{t.headerTitles.arena}</div>
        <h1>{t.arena.title}</h1>
        <p style={{ color: "var(--muted)", fontSize: 13.5, marginTop: 6, lineHeight: 1.5, fontWeight: 600 }}>
          {t.arena.instructions}
        </p>
      </div>
      <div className="puzzle-nav">
        <span>{t.arena.round(puzIdx + 1, PUZZLES.length)}</span>
        <div className="dot-row">
          {PUZZLES.map((pz, i) => (
            <div key={pz.id} className={`dot${i === puzIdx ? " on" : ""}${solvedMap[pz.id] && i !== puzIdx ? " solved" : ""}`} />
          ))}
        </div>
      </div>
      <div className="par-row">
        <span className="par-chip">{t.arena.par(p.par)}</span>
        {!solvedMap[p.id] && (
          <span className={`stopwatch-chip${elapsed <= 15 ? "" : " slow"}`}>
            ⏱ {String(Math.floor(elapsed / 60)).padStart(1, "0")}:{String(elapsed % 60).padStart(2, "0")}
          </span>
        )}
      </div>
      <div className="puzzle-board">
        <svg className="mandala-watermark" viewBox="0 0 100 100"><Mandala stroke="#7A4E2C" /></svg>
        <div className="board-svg-wrap">
          <svg ref={svgRef} viewBox="0 0 440 140" width="440" height="140">{sticks}</svg>
        </div>
      </div>
      <div className="tray-wrap">
        <span className="tray-label">{t.arena.trayLabel}</span>
        <div className="tray-slots">
          {tray.map((on, idx) => {
            const isSel = selection && selection.loc === "tray" && selection.idx === idx;
            return (
              <div
                key={idx}
                className={`tray-slot${on ? " filled" : ""}${isSel ? " sel" : ""}`}
                data-drag-loc="tray"
                data-drag-idx={idx}
                onPointerDown={(e) => handlePointerDown(e, "tray", null, null, idx)}
              >
                {on && <div className="stick-mini" />}
              </div>
            );
          })}
        </div>
      </div>
      <div className="moves-row">
        <span>{t.arena.movesUsed} <b>{moveCount}</b></span>
        <span>{t.arena.best} <b>{bestMoves != null ? bestMoves : "–"}</b></span>
      </div>
      <div className="puzzle-status" style={{ color: status.color }}>{status.text}</div>
      <div className="story-chip">{p.story}</div>
      {dragging && ghostPos && (
        <div className="drag-ghost" style={{ left: ghostPos.x, top: ghostPos.y }} />
      )}
    </section>
  );
}

function BlitzView({
  problem,
  options,
  score,
  best,
  levelName,
  levelIcon,
  hearts,
  timerKey,
  timerMs,
  feedback,
  cardRef,
  onSelect,
  lang,
  t,
}: {
  problem: Problem;
  options: number[];
  score: number;
  best: number;
  levelName: string;
  levelIcon: string;
  hearts: number;
  timerKey: number;
  timerMs: number;
  feedback: "ok" | "bad" | null;
  cardRef: React.RefObject<HTMLDivElement | null>;
  onSelect: (v: number) => void;
  lang: Lang;
  t: UIDict;
}) {
  return (
    <section className="view active">
      <div className="blitz-hud">
        <div className="blitz-header">
          <div className="blitz-stat">
            <span className="blitz-stat-ico" aria-hidden="true">⚡</span>
            {t.blitz.score} <b>{score}</b>
          </div>
          <div
            className="blitz-hearts"
            role="img"
            aria-label={lang === "ja" ? `残りライフ ${hearts}` : `${hearts} lives left`}
          >
            {Array.from({ length: 3 }, (_, i) => (
              <span key={i} className={i < hearts ? "on" : "off"} aria-hidden="true">❤️</span>
            ))}
          </div>
          <div className="blitz-stat">
            <span className="blitz-stat-ico" aria-hidden="true">🏆</span>
            {t.blitz.best} <b>{best}</b>
          </div>
        </div>
        <div className="blitz-level-tag">
          <span aria-hidden="true">{levelIcon}</span> {levelName}
        </div>
        <div className="blitz-timer-row">
          <CountdownTimer
            timerKey={timerKey}
            timerMs={timerMs}
            paused={feedback !== null}
            midMs={timerMs * 0.6}
            lowMs={timerMs * 0.3}
          />
          <div className="timer-bar-wrap">
            <div
              key={timerKey}
              className={`timer-bar-fill${feedback !== null ? " paused" : ""}`}
              style={{ animationDuration: `${timerMs}ms` }}
            />
          </div>
        </div>
      </div>
      <div
        key={problem.prompt}
        className={`practice-card blitz-card${feedback === "ok" ? " correct-glow" : feedback === "bad" ? " wrong-glow" : ""}`}
        ref={cardRef}
      >
        <div className="mode-eyebrow">⚡ {lang === "ja" ? "スピード勝負！" : "Beat the clock!"}</div>
        <div className="question mono">{problem.prompt} = ?</div>
        <div className="tile-grid">
          {options.map((o) => (
            <button key={o} className="choice-tile" onClick={() => onSelect(o)}>
              {fmt(o)}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
