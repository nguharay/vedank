"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BuddyMood } from "./Buddy";

export type BuddySay = { text: string; mood: BuddyMood; /* ms; 0 keeps it up */ hold?: number };

const HIDE_KEY = "sutraSprint.buddyHidden";

/* The buddy speaks when something just happened, and otherwise keeps quiet.
   Deliberately not a constant stream: a companion that talks over every question
   stops being read. One line, a few seconds, then back to floating. */
export function useBuddy() {
  const [say, setSay] = useState<BuddySay | null>(null);
  const [mood, setMood] = useState<BuddyMood>("happy");
  const [hidden, setHidden] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      setHidden(localStorage.getItem(HIDE_KEY) === "1");
    } catch {}
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const speak = useCallback((next: BuddySay) => {
    if (timer.current) clearTimeout(timer.current);
    setSay(next);
    setMood(next.mood);
    const hold = next.hold ?? 4200;
    if (hold > 0) {
      timer.current = setTimeout(() => {
        setSay(null);
        setMood("happy");
      }, hold);
    }
  }, []);

  const quiet = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setSay(null);
    setMood("happy");
  }, []);

  function toggleHidden() {
    const next = !hidden;
    setHidden(next);
    try {
      localStorage.setItem(HIDE_KEY, next ? "1" : "0");
    } catch {}
    if (next) quiet();
  }

  return { say, mood, speak, quiet, hidden, toggleHidden };
}

/* ---------- the lines ----------
   Kept here rather than inline so both languages stay side by side and nothing
   ships half-translated. */
type Line = { en: string; ja: string; mood: BuddyMood };

export const BUDDY_LINES: Record<string, Line> = {
  welcome: { en: "Ready for today's quests?", ja: "今日のクエスト、やってみる？", mood: "excited" },
  welcomeBack: { en: "You came back — your streak is safe!", ja: "おかえり！連続記録は無事だよ。", mood: "excited" },
  questsReady: { en: "A quest is finished — go claim it!", ja: "クエスト達成！受け取ってね。", mood: "excited" },
  reviewWaiting: { en: "Some old mistakes are waiting. Fix them?", ja: "まちがえた問題が待ってるよ。なおす？", mood: "happy" },
  duelWaiting: { en: "Someone challenged you! Go beat them.", ja: "対戦の申し込みが来てるよ！", mood: "excited" },

  combo3: { en: "Three in a row! Keep going.", ja: "3連続！いいね。", mood: "excited" },
  combo6: { en: "Six straight — you're on fire!", ja: "6連続！すごい！", mood: "excited" },
  speedy: { en: "That was fast!", ja: "はやい！", mood: "excited" },
  wrongOnce: { en: "Close. Read the last digit again.", ja: "おしい。下の桁をもう一度見てみて。", mood: "sad" },
  wrongTwice: { en: "Try the lesson — the sutra makes this quick.", ja: "レッスンを見てみよう。スートラを使えば速いよ。", mood: "sad" },
  hintNudge: { en: "Stuck? A hint token opens the steps.", ja: "こまったら、ヒントで手順が見られるよ。", mood: "happy" },

  stagePass: { en: "Stage clear! Nicely done.", ja: "ステージクリア！よくできました。", mood: "excited" },
  stagePerfect: { en: "Not one mistake. Perfect!", ja: "ノーミス！パーフェクト！", mood: "excited" },
  bossDown: { en: "Boss beaten! New skin might be waiting.", ja: "ボス撃破！新しいスキンがあるかも。", mood: "excited" },
  levelUp: { en: "Level up! Check the shop.", ja: "レベルアップ！ショップを見てみて。", mood: "excited" },

  blitzStart: { en: "Fast hands! Don't overthink it.", ja: "スピード勝負！考えすぎないで。", mood: "excited" },
  blitzGood: { en: "Great run. Challenge a friend with it!", ja: "いい記録！フレンドに挑戦してみよう。", mood: "excited" },
  duelWon: { en: "You won the duel!", ja: "対戦に勝ったよ！", mood: "excited" },
  duelLost: { en: "So close. Rematch them!", ja: "おしい！もう一度挑もう。", mood: "sad" },

  reviewFixed: { en: "Fixed! That one's learned.", ja: "なおせた！これで覚えたね。", mood: "excited" },
  reviewDone: { en: "Review cleared. That's the hard work done.", ja: "復習おわり！いちばん大事なところだよ。", mood: "excited" },

  puzzleSolved: { en: "Matchstick solved! Clever.", ja: "マッチ棒パズル成功！かしこい。", mood: "excited" },
  shopFirst: { en: "Gems are for spending — try a hint.", ja: "ジェムは使うためのもの。ヒントを試してみて。", mood: "happy" },
  skinNew: { en: "New outfit unlocked. Want to try it on?", ja: "新しい衣装がとどいたよ。着てみる？", mood: "excited" },
};

export function line(key: keyof typeof BUDDY_LINES, ja: boolean): BuddySay {
  const l = BUDDY_LINES[key];
  return { text: ja ? l.ja : l.en, mood: l.mood };
}
