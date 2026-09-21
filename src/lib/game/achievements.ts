import type { ProgressState } from "./state";
import { STAGE_COUNT } from "./topics";

export type AchievementCtx = {
  progress: ProgressState;
  level: number;
  gems: number;
  dailyStreak: number;
  bestStreakEver: number;
  solvedCount: number;
  totalPuzzles: number;
  bossClears: number;
};

export type Achievement = {
  id: string;
  icon: string;
  title: string;
  titleJa: string;
  desc: string;
  descJa: string;
  isUnlocked: (ctx: AchievementCtx) => boolean;
};

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_star",
    icon: "⭐",
    title: "First Star",
    titleJa: "はじめの星",
    desc: "Earn your first star",
    descJa: "初めての星を獲得する",
    isUnlocked: (c) =>
      Object.values(c.progress.topics).some((p) => Object.values(p.stageStars).some((s) => s > 0)),
  },
  {
    id: "perfect_stage",
    icon: "🌟",
    title: "Flawless",
    titleJa: "パーフェクト",
    desc: "Get 3 stars on a stage",
    descJa: "ステージで星3つを獲得",
    isUnlocked: (c) =>
      Object.values(c.progress.topics).some((p) => Object.values(p.stageStars).some((s) => s >= 3)),
  },
  {
    id: "sutra_master",
    icon: "🕉",
    title: "Sutra Master",
    titleJa: "スートラマスター",
    desc: "Fully clear a sutra topic",
    descJa: "スートラを完全制覇する",
    isUnlocked: (c) => Object.values(c.progress.topics).some((p) => p.cleared >= STAGE_COUNT),
  },
  {
    id: "boss_slayer",
    icon: "👑",
    title: "Boss Slayer",
    titleJa: "ボス討伐",
    desc: "Defeat a boss stage",
    descJa: "ボスステージを撃破する",
    isUnlocked: (c) => c.bossClears >= 1,
  },
  {
    id: "dojo_novice",
    icon: "🥋",
    title: "Dojo Novice",
    titleJa: "道場の新人",
    desc: "Solve a matchstick puzzle",
    descJa: "マッチ棒パズルを解く",
    isUnlocked: (c) => c.solvedCount >= 1,
  },
  {
    id: "dojo_master",
    icon: "🏆",
    title: "Dojo Master",
    titleJa: "道場マスター",
    desc: "Solve every matchstick puzzle",
    descJa: "全てのマッチ棒パズルを解く",
    isUnlocked: (c) => c.totalPuzzles > 0 && c.solvedCount >= c.totalPuzzles,
  },
  {
    id: "combo_king",
    icon: "⚡",
    title: "Combo King",
    titleJa: "コンボキング",
    desc: "Hit a 5-answer streak",
    descJa: "5問連続正解する",
    isUnlocked: (c) => c.bestStreakEver >= 5,
  },
  {
    id: "week_streak",
    icon: "📅",
    title: "Week Warrior",
    titleJa: "週間戦士",
    desc: "7-day login streak",
    descJa: "7日連続ログイン",
    isUnlocked: (c) => c.dailyStreak >= 7,
  },
  {
    id: "gem_collector",
    icon: "💎",
    title: "Gem Collector",
    titleJa: "宝石コレクター",
    desc: "Collect 500 gems",
    descJa: "宝石を500個集める",
    isUnlocked: (c) => c.gems >= 500,
  },
  {
    id: "level_5",
    icon: "🚀",
    title: "Rising Star",
    titleJa: "ライジングスター",
    desc: "Reach level 5",
    descJa: "レベル5に到達する",
    isUnlocked: (c) => c.level >= 5,
  },
];
