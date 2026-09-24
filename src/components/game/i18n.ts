"use client";
import { useEffect, useState } from "react";

const STORE_KEY = "sutraSprint.lang";
export type LangCode = "en" | "ja";

export function useLang(initialLang: LangCode = "en") {
  const [lang, setLangState] = useState<LangCode>(initialLang);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORE_KEY) as LangCode | null;
      if (saved === "en" || saved === "ja") return setLangState(saved);
      /* Nothing stored yet: follow the browser. A link shared into a Japanese
         chat should open in Japanese without anyone hunting for a toggle. */
      if (navigator.language.toLowerCase().startsWith("ja")) setLangState("ja");
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setLang(next: LangCode) {
    setLangState(next);
    try {
      localStorage.setItem(STORE_KEY, next);
    } catch {}
  }

  function toggle() {
    setLang(lang === "en" ? "ja" : "en");
  }

  return { lang, setLang, toggle };
}

export type UIDict = {
  appName: string;
  headerTitles: { home: string; topic: string; stagemap: string; practice: string; arena: string; blitz: string; tricks: string; daily: string; review: string; comp: string; match: string; games: string; bigger: string; odd: string; sortg: string; memory: string; quick: string };
  menu: {
    accountLabel: string; player: string; sound: string; on: string; off: string;
    theme: string; auto: string; light: string; dark: string; skins: string; language: string; signOut: string;
  };
  home: { eyebrow: string; title: string; brand: string; level: string; dojo: string; streakSuffix: string; play: string; blitzTitle: string; blitzSub: string };
  blitz: {
    score: string; best: string; over: string; scoreLabel: string; newBest: string; playAgain: string; backHome: string;
  };
  topicView: { howItWorks: string };
  stageMap: { instructions: string; play: string; seeStageMap: string };
  practice: {
    question: string; lesson: string; check: string; continueBtn: string; correct: string; incorrect: string; bossStage: string;
    stageOf: (n: number, total: number) => string;
    modeTags: { type: string; choice: string; target: string; arcade: string; catch: string; truefalse: string; balloon: string; numberline: string };
    runs: string; scoreIt: string; homeRun: string; strike: string; true: string; false: string;
  };
  result: {
    clear: string; retry: string; correctOf: (c: number, total: number) => string;
    bossDefeated: string; bossStage: string; nextStage: string; backToMap: string; retryStage: string; map: string;
  };
  celebrate: {
    continueBtn: string; dojoTitle: string; dojoBody: (moves: number, par: number) => string;
    sutraTitle: string; sutraBody: (topicTitle: string) => string;
  };
  arena: {
    title: string; instructions: string; round: (n: number, total: number) => string; par: (n: number) => string;
    trayLabel: string; movesUsed: string; best: string; hint: string; reset: string; next: string;
    alreadySolved: string; hintText: string; tapFirst: string; shapeInProgress: string; solvedPrefix: string;
    solvedSuffix: string; notTrueYet: string;
  };
  share: {
    title: string; subtitle: string; tapHint: string; close: string;
    shareBtn: string; copy: string; copied: string;
    statLevel: string; statGems: string; statStreak: string; statBestStreak: string;
    statHearts: string; statBlitz: string; statBosses: string; statPuzzles: string;
    blurb: (level: number, rank: string) => string;
    blitzBlurb: (score: number) => string;
  };
};

export const UI: Record<LangCode, UIDict> = {
  en: {
    appName: "Sutra Sprint",
    headerTitles: { home: "Sutra Sprint", topic: "Lesson", stagemap: "Stage Map", practice: "Speed Drill", arena: "Matchstick Dojo", blitz: "Number Blitz", tricks: "Magic Tricks", daily: "Daily Challenge", review: "Fix Your Misses", comp: "Competition", match: "Number Match", games: "Games", bigger: "Which is Bigger?", odd: "Odd One Out", sortg: "Smallest First", memory: "Memory Pairs", quick: "Quick Game" },
    menu: {
      accountLabel: "Account menu",
      player: "Player",
      sound: "Sound",
      on: "On",
      off: "Off",
      theme: "Theme",
      auto: "Auto",
      light: "Light",
      dark: "Dark",
      skins: "Skins",
      language: "Language",
      signOut: "Sign out",
    },
    home: {
      eyebrow: "The Sutra Deck",
      title: "Play the Sutras",
      brand: "VedAnk Academy",
      level: "Level",
      dojo: "Matchstick Dojo",
      streakSuffix: "-day streak",
      play: "Play",
      blitzTitle: "Number Blitz",
      blitzSub: "Arcade time-attack",
    },
    blitz: {
      score: "Score",
      best: "Best",
      over: "Blitz Over!",
      scoreLabel: "Score",
      newBest: "🎉 New Best!",
      playAgain: "Play Again",
      backHome: "Back Home",
    },
    topicView: {
      howItWorks: "How it works",
    },
    stageMap: {
      instructions: "Clear a stage (3 of 5 right) to unlock the next. 5 in a row earns all 3 stars.",
      play: "Play",
      seeStageMap: "See the Stage Map →",
    },
    practice: {
      question: "Question",
      lesson: "📖 Lesson",
      check: "Check",
      continueBtn: "Continue",
      correct: "Correct!",
      incorrect: "Not quite!",
      bossStage: "👑 Boss Stage",
      stageOf: (n: number, total: number) => `Stage ${n} of ${total}`,
      modeTags: {
        type: "⌨️ Type it",
        choice: "🧩 Choose the answer",
        target: "🎯 Tap it fast!",
        arcade: "⚾ Homerun Math",
        catch: "🪂 Catch it fast!",
        truefalse: "🔎 True or false?",
        balloon: "🎈 Pop the answer!",
        numberline: "📏 Tap the number line",
      },
      runs: "RUNS",
      scoreIt: "➕ Score it!",
      homeRun: "HOME RUN!",
      strike: "STRIKE!",
      true: "True",
      false: "False",
    },
    result: {
      clear: "Clear",
      retry: "Retry",
      correctOf: (c: number, total: number) => `${c} / ${total} correct`,
      bossDefeated: "👑 BOSS DEFEATED",
      bossStage: "👑 BOSS STAGE",
      nextStage: "Next Stage →",
      backToMap: "Back to Map",
      retryStage: "Retry Stage",
      map: "Map",
    },
    celebrate: {
      continueBtn: "Continue",
      dojoTitle: "Dojo round cleared!",
      dojoBody: (moves: number, par: number) => `You fixed it in ${moves} move${moves === 1 ? "" : "s"} — par is ${par}.`,
      sutraTitle: "Sutra Mastered!",
      sutraBody: (topicTitle: string) => `You've cleared every stage of ${topicTitle}.`,
    },
    arena: {
      title: "Move a stick, fix the sum",
      instructions: "Tap a lit stick to pick it up, then tap an empty spot — on the board or the tray — to place it. Every equation here bends true in exactly one move.",
      round: (n: number, total: number) => `Round ${n} of ${total}`,
      par: (n: number) => `🎯 Par: ${n} move${n === 1 ? "" : "s"}`,
      trayLabel: "Spare tray",
      movesUsed: "Moves used:",
      best: "Best:",
      hint: "💡 Hint",
      reset: "↺ Reset",
      next: "Next →",
      alreadySolved: "You're already on the solution shape — place your move to win!",
      hintText: "💡 Pick up the glowing stick, then place it on the glowing target.",
      tapFirst: "Tap a lit stick first, then tap where it should go.",
      shapeInProgress: "Shape in progress: ",
      solvedPrefix: "🎉 Solved! ",
      solvedSuffix: " is true.",
      notTrueYet: " — not true yet.",
    },
    share: {
      title: "Your Sutra Card",
      subtitle: "Tap any stat to share it",
      tapHint: "Tap a stat above to share your run",
      close: "Close",
      shareBtn: "Share",
      copy: "Copy text",
      copied: "Copied!",
      statLevel: "Level",
      statGems: "Gems",
      statStreak: "Day streak",
      statBestStreak: "Best streak",
      statHearts: "Hearts",
      statBlitz: "Blitz best",
      statBosses: "Bosses beaten",
      statPuzzles: "Puzzles solved",
      blurb: (level, rank) => `I'm level ${level} — ${rank} — at VedAnk Academy's Sutra Sprint! 🪔`,
      blitzBlurb: (score) => `I scored ${score} in Number Blitz on Sutra Sprint! ⚡ Can you beat it?`,
    },
  },
  ja: {
    appName: "スートラ・スプリント",
    headerTitles: { home: "スートラ・スプリント", topic: "レッスン", stagemap: "ステージマップ", practice: "スピードドリル", arena: "マッチ棒道場", blitz: "ナンバーブリッツ", tricks: "マジック", daily: "デイリーチャレンジ", review: "まちがいなおし", comp: "コンペティション", match: "ナンバーマッチ", games: "ゲーム", bigger: "どっちが大きい？", odd: "仲間はずれ", sortg: "小さい順", memory: "神経衰弱", quick: "クイックゲーム" },
    menu: {
      accountLabel: "アカウントメニュー",
      player: "プレイヤー",
      sound: "サウンド",
      on: "オン",
      off: "オフ",
      theme: "テーマ",
      auto: "自動",
      light: "ライト",
      dark: "ダーク",
      skins: "スキン",
      language: "言語",
      signOut: "ログアウト",
    },
    home: {
      eyebrow: "スートラデッキ",
      title: "スートラで遊ぼう",
      brand: "ヴェダンク・アカデミー",
      level: "レベル",
      dojo: "マッチ棒道場",
      streakSuffix: "日連続",
      play: "プレイ",
      blitzTitle: "ナンバーブリッツ",
      blitzSub: "タイムアタック・アーケード",
    },
    blitz: {
      score: "スコア",
      best: "ベスト",
      over: "ゲームオーバー！",
      scoreLabel: "スコア",
      newBest: "🎉 新記録！",
      playAgain: "もう一度",
      backHome: "ホームへ",
    },
    topicView: {
      howItWorks: "解き方",
    },
    stageMap: {
      instructions: "ステージをクリア（5問中3問正解）すると次に進めます。5問連続正解で星3つ獲得。",
      play: "プレイ",
      seeStageMap: "ステージマップを見る →",
    },
    practice: {
      question: "問題",
      lesson: "📖 レッスン",
      check: "確認",
      continueBtn: "続ける",
      correct: "正解！",
      incorrect: "ちがうよ！",
      bossStage: "👑 ボスステージ",
      stageOf: (n: number, total: number) => `ステージ ${n} / ${total}`,
      modeTags: {
        type: "⌨️ 数字を入力",
        choice: "🧩 答えを選ぶ",
        target: "🎯 すばやくタップ！",
        arcade: "⚾ ホームラン算",
        catch: "🪂 すばやくキャッチ！",
        truefalse: "🔎 正か誤か？",
        balloon: "🎈 風船をポップ！",
        numberline: "📏 数直線をタップ",
      },
      runs: "得点",
      scoreIt: "➕ 得点を入れる！",
      homeRun: "ホームラン！",
      strike: "ストライク！",
      true: "正しい",
      false: "誤り",
    },
    result: {
      clear: "合格",
      retry: "再挑戦",
      correctOf: (c: number, total: number) => `${total}問中 ${c}問 正解`,
      bossDefeated: "👑 ボス撃破！",
      bossStage: "👑 ボスステージ",
      nextStage: "次のステージへ →",
      backToMap: "マップへ戻る",
      retryStage: "ステージ再挑戦",
      map: "マップ",
    },
    celebrate: {
      continueBtn: "続ける",
      dojoTitle: "道場ラウンドクリア！",
      dojoBody: (moves: number, par: number) => `${moves}手で解けました――目標は${par}手。`,
      sutraTitle: "スートラ マスター！",
      sutraBody: (topicTitle: string) => `「${topicTitle}」のすべてのステージをクリアしました。`,
    },
    arena: {
      title: "マッチ棒を1本動かして式を直そう",
      instructions: "光っているマッチ棒をタップして持ち上げ、空いている場所（ボードまたはトレイ）にタップして置きます。すべての式はちょうど1手で正しくなります。",
      round: (n: number, total: number) => `ラウンド ${n} / ${total}`,
      par: (n: number) => `🎯 目標：${n}手`,
      trayLabel: "予備トレイ",
      movesUsed: "使った手数：",
      best: "ベスト：",
      hint: "💡 ヒント",
      reset: "↺ リセット",
      next: "次へ →",
      alreadySolved: "もう正解の形になっています――そのまま動かして勝利！",
      hintText: "💡 光っているマッチ棒を持ち上げて、光っている場所に置きましょう。",
      tapFirst: "まず光っているマッチ棒をタップし、次に置きたい場所をタップしてください。",
      shapeInProgress: "形を変えています：",
      solvedPrefix: "🎉 解けました！ ",
      solvedSuffix: " は正しい式です。",
      notTrueYet: " ――まだ正しくありません。",
    },
    share: {
      title: "スートラ・カード",
      subtitle: "タップしてシェア",
      tapHint: "上の記録をタップしてシェアできます",
      close: "閉じる",
      shareBtn: "シェア",
      copy: "テキストをコピー",
      copied: "コピーしました！",
      statLevel: "レベル",
      statGems: "ジェム",
      statStreak: "連続日数",
      statBestStreak: "最高連続",
      statHearts: "ハート",
      statBlitz: "ブリッツ最高",
      statBosses: "ボス撃破",
      statPuzzles: "パズル達成",
      blurb: (level, rank) => `ヴェダンク・アカデミーのスートラ・スプリントでレベル${level}「${rank}」になりました！🪔`,
      blitzBlurb: (score) => `ナンバーブリッツで${score}点を取りました！⚡ 挑戦してみませんか？`,
    },
  },
};
