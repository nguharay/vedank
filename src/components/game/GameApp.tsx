"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import {
  TOPICS,
  TOPIC_BY_ID,
  STAGE_COUNT,
  STAGE_DIFF,
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
  totalGems,
  levelInfo,
  type ProgressState,
} from "@/lib/game/state";
import { finishStageAction, solvePuzzleAction } from "@/lib/actions/game-actions";
import { ILLUS } from "./illustrations";
import { Mascot, Mandala } from "./Mascot";
import { useConfetti } from "./useConfetti";
import { useSound } from "./useSound";
import { useTheme } from "./useTheme";
import { useSkins, SKINS } from "./useSkins";
import { useLang, UI, type UIDict } from "./i18n";

type View = "home" | "topic" | "stagemap" | "practice" | "arena";
type Mode = "type" | "choice" | "target" | "truefalse" | "arcade" | "memory";
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

const PATH_POS = ["c", "l", "r", "c", "l", "r", "c", "l", "r", "c", "l", "r", "c"];
const STAGE_POS = ["c", "l", "r", "l", "c"];

export function GameApp({
  initialProgress,
  dailyStreak,
  user,
}: {
  initialProgress: ProgressState;
  dailyStreak: number;
  user: { name: string | null; email: string | null };
}) {
  const [progress, setProgress] = useState<ProgressState>(initialProgress);
  const [view, setView] = useState<View>("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [skinsOpen, setSkinsOpen] = useState(false);
  const theme = useTheme();
  const skin = useSkins();
  const langHook = useLang();
  const lang: Lang = langHook.lang;
  const t = UI[lang];
  const [currentTopicId, setCurrentTopicId] = useState<string | null>(null);
  const currentTopic: Topic | null = currentTopicId ? TOPIC_BY_ID[currentTopicId] : null;

  const [hearts, setHearts] = useState(5);
  const [bestStreakEver, setBestStreakEver] = useState(0);
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

  const li = useMemo(() => levelInfo(progress), [progress]);
  const gems = useMemo(() => totalGems(progress), [progress]);
  const solvedCount = Object.values(progress.arena.solved).filter(Boolean).length;
  const bossClears = useMemo(
    () => Object.values(progress.topics).filter((p) => p.cleared >= STAGE_COUNT).length,
    [progress]
  );
  const activeSkin = SKINS.find((s) => s.id === skin.skinId) || SKINS[0];

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
  const [buddyPop, setBuddyPop] = useState(false);
  const [runs, setRuns] = useState(0);
  const [runReady, setRunReady] = useState(false);
  const [swingAnim, setSwingAnim] = useState<"hit" | "miss" | null>(null);
  const [comboStreak, setComboStreak] = useState(0);
  const [feedback, setFeedback] = useState<{ show: boolean; ok: boolean; t2: string } | null>(null);
  const isBoss = curStage.n === STAGE_COUNT;

  const [stageResult, setStageResult] = useState<
    | null
    | { passed: boolean; stars: number; correct: number; gemsGained: number; n: number; isBoss: boolean }
  >(null);
  const [celebrate, setCelebrate] = useState<{ mood: "happy" | "excited"; title: string; body: string } | null>(null);

  function newStageQuestion(topic: Topic, n: number) {
    const problem = topic.gen(STAGE_DIFF[n - 1] as Difficulty);
    const mode =
      n === 1
        ? weightedPick<Mode>([["type", 1], ["choice", 2], ["truefalse", 2]])
        : weightedPick<Mode>([["type", 1], ["choice", 1], ["target", 2], ["truefalse", 1], ["arcade", 3], ["memory", 2]]);
    setCurProblem(problem);
    setCurMode(mode);
    setCurSelection(null);
    setCheckEnabled(false);
    setWrongFlash(false);
    setSwingAnim(null);
    setRunReady(false);
    if (mode === "choice") setTileOptions(shuffle([problem.answer, ...makeDistractors(problem.answer, 3)]));
    else if (mode === "target" || mode === "arcade" || mode === "memory") setTileOptions(shuffle([problem.answer, ...makeDistractors(problem.answer, 5)]));
    else if (mode === "truefalse") {
      const isTrue = Math.random() < 0.5;
      setTfIsTrue(isTrue);
      setTfShown(isTrue ? problem.answer : makeDistractors(problem.answer, 1)[0]);
    }
  }

  function startStage(n: number) {
    if (!currentTopic) return;
    setCurStage({ n, qIndex: 0, correct: 0 });
    setHearts(5);
    setRuns(0);
    setComboStreak(0);
    newStageQuestion(currentTopic, n);
    setView("practice");
  }

  useEffect(() => {
    if (curMode === "type" && view === "practice") {
      typeInputRef.current?.focus();
    }
  }, [curMode, curProblem, view]);

  function checkPractice() {
    if (!curProblem) return;
    let ok: boolean;
    if (curMode === "type") {
      const val = (typeInputRef.current?.value || "").trim().replace(/,/g, "");
      if (val === "") return;
      ok = Number(val) === curProblem.answer;
    } else if (curMode === "truefalse") {
      if (curSelection === null) return;
      ok = curSelection === tfIsTrue;
    } else {
      if (curSelection === null) return;
      ok = curSelection === curProblem.answer;
    }

    if (ok) {
      setCurStage((s) => {
        const correct = s.correct + 1;
        setBestStreakEver((b) => Math.max(b, correct));
        return { ...s, correct };
      });
      const nextCombo = comboStreak + 1;
      const tier = nextCombo >= 9 ? 3 : nextCombo >= 6 ? 2 : nextCombo >= 3 ? 1 : 0;
      const multiplier = tier + 1;
      setComboStreak(nextCombo);
      confetti.burstFromEl(practiceCardRef.current, 18 + tier * 8);
      if (tier > 0 && (nextCombo === 3 || nextCombo === 6 || nextCombo === 9)) sound.combo(tier);
      else sound.correct();
      spawnToast(tier > 0 ? `+${10 * multiplier} 💎 COMBO x${multiplier}!` : "+10 💎", practiceCardRef.current);
      setStreakPop(true);
      setTimeout(() => setStreakPop(false), 220);
      if (curMode === "arcade") {
        sound.hit();
        setSwingAnim("hit");
        setTimeout(() => setSwingAnim(null), 900);
        setTimeout(() => setRunReady(true), 700);
      }
      if (curMode === "memory") sound.flip();
    } else {
      setHearts((h) => Math.max(0, h - 1));
      setComboStreak(0);
      sound.wrong();
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
    setBuddyPop(true);
    setTimeout(() => setBuddyPop(false), 400);
    setFeedback({ show: true, ok, t2: ok ? "" : `${curProblem.prompt} = ${fmt(curProblem.answer)}` });
  }

  function addRun() {
    setRuns((r) => r + 1);
    setRunReady(false);
    sound.correct();
  }

  async function onFeedbackContinue() {
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
      if (levelInfo(next).level > levelBefore) setTimeout(() => sound.levelUp(), 500);
      return next;
    });

    const wasBoss = n === STAGE_COUNT;
    setStageResult({ passed: result.passed, stars: result.stars, correct, gemsGained: result.gemsGained, n, isBoss: wasBoss });
    if (result.passed) {
      confetti.burstCenter(wasBoss ? 160 : 100, wasBoss ? 0.55 : 0.4);
      if (wasBoss) sound.bossFanfare();
      else sound.stageClear();
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
  }

  function getActive(loc: "board" | "tray", gi: number | null, slot: string | null, idx: number | null, g: Glyph[], tr: boolean[]) {
    return loc === "board" ? !!g[gi!].active[slot!] : !!tr[idx!];
  }

  function onSlotClick(loc: "board" | "tray", gi: number | null, slot: string | null, idx: number | null) {
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
      const p = PUZZLES[puzIdx];
      const already = !!progress.arena.solved[p.id];
      const res = await solvePuzzleAction(p.id, moveCount + 1);
      setProgress((prev) => ({
        ...prev,
        arena: {
          solved: { ...prev.arena.solved, [p.id]: true },
          bestMoves: { ...prev.arena.bestMoves, [p.id]: res.bestMoves },
        },
      }));
      confetti.burstFromEl(puzzleSvgRef.current as unknown as HTMLElement, 70);
      sound.stageClear();
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

  /* ================= RENDER ================= */
  return (
    <div id="app">
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

      <header>
        {view !== "home" ? (
          <button className="back-btn" aria-label="Back" onClick={handleBack}>
            ←
          </button>
        ) : (
          <button className="back-btn avatar-btn" aria-label={t.menu.accountLabel} onClick={() => setMenuOpen((o) => !o)}>
            {(user.name?.[0] || user.email?.[0] || "?").toUpperCase()}
          </button>
        )}
        <img src="/brand/vedank-mark.png" alt="" className="header-mark" />
        <div className="header-title"><h1>{headerTitle}</h1></div>
        <div className="stats-row">
          <span className="stat stat-flame">🔥 {bestStreakEver}</span>
          <span className="stat stat-gem">💎 {gems}</span>
          <span className="stat stat-heart">❤️ {hearts}</span>
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
            <button className="menu-row" onClick={() => setSkinsOpen((o) => !o)}>
              <span>🎨 {t.menu.skins}</span>
              <span className="menu-row-val">{activeSkin.name}</span>
            </button>
            {skinsOpen && (
              <div className="skins-panel">
                {SKINS.map((s) => {
                  const unlocked = s.unlocked(li.level, bossClears);
                  return (
                    <button
                      key={s.id}
                      className={`skin-swatch${skin.skinId === s.id ? " active" : ""}${unlocked ? "" : " locked"}`}
                      disabled={!unlocked}
                      title={unlocked ? s.name : s.unlockLabel}
                      onClick={() => unlocked && skin.selectSkin(s.id)}
                    >
                      <span className="skin-swatch-dot" style={{ background: s.swatch }} />
                      <span className="skin-swatch-name">{unlocked ? s.name : "🔒"}</span>
                    </button>
                  );
                })}
              </div>
            )}
            <div className="menu-divider" />
            <button className="menu-row menu-row-danger" onClick={() => signOut({ redirectTo: "/login" })}>
              <span>⏻ {t.menu.signOut}</span>
            </button>
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
            buddyMood={feedback ? (feedback.ok ? "excited" : "sad") : "happy"}
            buddyPop={buddyPop}
            runs={runs}
            runReady={runReady}
            swingAnim={swingAnim}
            onAddRun={addRun}
            isBoss={isBoss}
            comboStreak={comboStreak}
            skinId={skin.skinId}
            typeInputRef={typeInputRef}
            practiceCardRef={practiceCardRef}
            onSelect={(v) => { setCurSelection(v); setCheckEnabled(true); sound.click(); }}
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
      </main>

      <footer className="footerbar active" style={{ display: view === "home" ? "none" : "flex" }}>
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
            <button className="btn btn-primary" disabled={!checkEnabled} onClick={checkPractice}>
              {t.practice.check}
            </button>
          </>
        )}
        {view === "arena" && (
          <>
            <button className="btn btn-ghost" onClick={onHint}>{t.arena.hint}</button>
            <button className="btn btn-ghost" onClick={() => loadPuzzle(puzIdx)}>{t.arena.reset}</button>
            <button className="btn btn-primary" onClick={() => loadPuzzle(puzIdx + 1)}>{t.arena.next}</button>
          </>
        )}
      </footer>

      {feedback?.show && (
        <div className={`feedback-banner show ${feedback.ok ? "good" : "bad"}`}>
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
  lang,
  t,
}: {
  progress: ProgressState;
  li: ReturnType<typeof levelInfo>;
  solvedCount: number;
  dailyStreak: number;
  onOpenTopic: (id: string) => void;
  onOpenArena: () => void;
  lang: Lang;
  t: UIDict;
}) {
  const firstIncompleteIdx = (() => {
    const idx = TOPICS.findIndex((tp) => topicProgressOf(progress, tp.id).cleared < STAGE_COUNT);
    return idx === -1 ? TOPICS.length - 1 : idx;
  })();
  const rank = lang === "ja" ? RANKS_JA[li.rank] || li.rank : li.rank;

  return (
    <section className="view active">
      <div className="unit-banner">
        <svg className="mandala" viewBox="0 0 100 100"><Mandala stroke="#fff" /></svg>
        <div className="mascot"><Mascot mood="happy" /></div>
        <div className="eyebrow">{t.home.eyebrow}</div>
        <h1>{t.home.title}</h1>
        <div className="home-byline">
          <img src="/brand/vedank-mark.png" alt="" />
          <span>{t.home.brand}</span>
        </div>
        <div className="levelrow">
          <span>{t.home.level} {li.level} · {rank}</span>
          <span>{li.into} / 150</span>
        </div>
        <div className="bar-track"><div className="bar-fill" style={{ width: `${li.pct}%` }} /></div>
      </div>

      {dailyStreak > 0 && (
        <div className="streak-calendar">
          <span className="streak-calendar-label">🔥 {dailyStreak}{t.home.streakSuffix}</span>
          <div className="streak-days">
            {Array.from({ length: 7 }, (_, i) => 6 - i).map((daysAgo) => (
              <span key={daysAgo} className={`streak-day${daysAgo < dailyStreak ? " lit" : ""}`}>
                🔥
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="path-wrap">
        <div className="path-line" />
        {TOPICS.map((tp, i) => {
          const p = topicProgressOf(progress, tp.id);
          const isCurrent = i === firstIncompleteIdx;
          const boss =
            i === 6 ? (
              <div className="boss-row" key="boss">
                <div className="node-wrap">
                  <div className="boss-node" onClick={onOpenArena}>
                    🔥
                    <span className="boss-chip">{solvedCount}/{PUZZLES.length}</span>
                  </div>
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
                  <div
                    className={`node${isCurrent ? " current" : ""}`}
                    style={{ background: gradCss(tp.grad) }}
                    onClick={() => onOpenTopic(tp.id)}
                  >
                    {tp.icon}
                    <span className="stage-pips">
                      {Array.from({ length: STAGE_COUNT }, (_, k) => (
                        <i key={k} className={k < p.cleared ? "on" : ""} />
                      ))}
                    </span>
                  </div>
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

function TopicView({ topic, lang, t }: { topic: Topic; lang: Lang; t: UIDict }) {
  const ex = topic.example();
  const rows = topic.exSteps(ex, lang);
  const title = lang === "ja" ? topic.titleJa : topic.title;
  const sutraEn = lang === "ja" ? topic.sutraEnJa : topic.sutraEn;
  const blurb = lang === "ja" ? topic.blurbJa : topic.blurb;
  const steps = lang === "ja" ? topic.stepsJa : topic.steps;
  return (
    <section className="view active">
      <div className="topic-head">
        <div className="icon-badge" style={{ background: gradCss(topic.grad) }}>{topic.icon}</div>
        <div className="sutra-tag" style={{ background: gradCss(topic.grad) }}>
          🕉 {topic.sutraSa} — {sutraEn}
        </div>
        <h1>{title}</h1>
        <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 8, lineHeight: 1.5, fontWeight: 600 }}>{blurb}</p>
      </div>
      <div className="topic-illus" dangerouslySetInnerHTML={{ __html: ILLUS[topic.illus](topic.grad[0], topic.grad[1]) }} />
      <div className="card">
        <h4>{t.topicView.howItWorks}</h4>
        <ol className="steps">
          {steps.map((s, i) => (
            <li key={i}>
              <span className="n" style={{ background: gradCss(topic.grad) }}>{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
        <div className="worked-caption">{lang === "ja" ? "計算例" : "Worked example"}</div>
        <div className="worked">
          {rows.map((r, i) => (
            <div className="ex-line mono" key={i}>
              <span>{r[0]}</span>
              <b>{r[1]}</b>
            </div>
          ))}
        </div>
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
        <div className="sutra-tag" style={{ background: gradCss(topic.grad), display: "inline-flex" }}>
          🕉 {topic.sutraSa}
        </div>
        <h1 style={{ fontSize: 22 }}>{lang === "ja" ? topic.titleJa : topic.title}</h1>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 6, fontWeight: 600 }}>
          {t.stageMap.instructions}
        </p>
      </div>
      <div className="stage-track">
        <div className="stage-line" />
        {Array.from({ length: STAGE_COUNT }, (_, k) => k + 1).map((n) => {
          const unlocked = n <= p.cleared + 1;
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
              </div>
            </div>
          );
        })}
      </div>
    </section>
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
  buddyMood,
  buddyPop,
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
  buddyMood: "happy" | "excited" | "sad";
  buddyPop: boolean;
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
      <div className="topic-head" style={{ marginTop: 2 }}>
        <div className={`eyebrow-tag${isBoss ? " boss-tag" : ""}`}>{isBoss ? t.practice.bossStage : t.practice.stageOf(stageN, STAGE_COUNT)}</div>
        <div className="sutra-tag" style={{ background: gradCss(topic.grad) }}>🕉 {topic.sutraSa}</div>
        <h1>{title}</h1>
      </div>
      <div className={`practice-card${isBoss ? " boss-card" : ""}`} ref={practiceCardRef}>
        <div className={`practice-buddy${buddyPop ? " pop" : ""}`}>
          <Mascot mood={buddyMood} />
        </div>
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
                className={`choice-tile${curSelection === o ? " picked" : ""}${curSelection === o && shakeTile ? " shake-tile" : ""}`}
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
                className={`target-tile${curSelection === o ? " picked" : ""}${curSelection === o && shakeTile ? " shake-tile" : ""}`}
                onClick={() => onSelect(o)}
              >
                {fmt(o)}
              </button>
            ))}
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
        {mode === "memory" && (
          <div className={`memory-grid skin-${skinId}`}>
            {tileOptions.map((o) => (
              <button
                key={o}
                className={`memory-card${curSelection === o ? " flipped" : ""}${curSelection === o && shakeTile ? " shake-tile" : ""}`}
                onClick={() => onSelect(o)}
              >
                <div className="memory-card-inner">
                  <div className="memory-card-back">❓</div>
                  <div className="memory-card-front">{fmt(o)}</div>
                </div>
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
  const p = PUZZLES[puzIdx];
  const cellW = 46, gap = 16, opW = 40;
  let total = 0;
  for (const g of glyphs) total += (g.type === "digit" ? cellW : opW) + gap;
  total -= gap;
  const startX = Math.max(6, (400 - total) / 2);
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
        <g key={`${gi}-${slot}`} onClick={() => onSlotClick("board", gi, slot, null)}>
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
        <div className="icon-badge" style={{ background: "linear-gradient(135deg,#FF5D3A,#FFC93C)" }}>🔥</div>
        <div className="sutra-tag" style={{ background: "linear-gradient(135deg,#FF5D3A,#FF9A2E)" }}>{t.headerTitles.arena}</div>
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
      <div><span className="par-chip">{t.arena.par(p.par)}</span></div>
      <div className="puzzle-board">
        <svg className="mandala-watermark" viewBox="0 0 100 100"><Mandala stroke="#7A4E2C" /></svg>
        <div className="board-svg-wrap">
          <svg ref={svgRef} viewBox="0 0 400 140" width="400" height="140">{sticks}</svg>
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
                onClick={() => onSlotClick("tray", null, null, idx)}
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
    </section>
  );
}
