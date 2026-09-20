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
  type Difficulty,
  type Problem,
  type Topic,
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

type View = "home" | "topic" | "stagemap" | "practice" | "arena";
type Mode = "type" | "choice" | "target" | "truefalse";
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

export function GameApp({ initialProgress }: { initialProgress: ProgressState }) {
  const [progress, setProgress] = useState<ProgressState>(initialProgress);
  const [view, setView] = useState<View>("home");
  const [currentTopicId, setCurrentTopicId] = useState<string | null>(null);
  const currentTopic: Topic | null = currentTopicId ? TOPIC_BY_ID[currentTopicId] : null;

  const [hearts, setHearts] = useState(5);
  const [bestStreakEver, setBestStreakEver] = useState(0);
  const [sparkles, setSparkles] = useState<{ left: number; top: number; delay: number; size: number }[]>([]);

  const confetti = useConfetti();
  const practiceCardRef = useRef<HTMLDivElement | null>(null);
  const puzzleSvgRef = useRef<SVGSVGElement | null>(null);
  const typeInputRef = useRef<HTMLInputElement | null>(null);

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

  const headerTitle =
    view === "arena" ? "Matchstick Dojo" : view === "practice" ? "Speed Drill" : view === "stagemap" ? "Stage Map" : view === "topic" ? "Lesson" : "Sutra Sprint";

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
  const [feedback, setFeedback] = useState<{ show: boolean; ok: boolean; t2: string } | null>(null);

  const [stageResult, setStageResult] = useState<
    | null
    | { passed: boolean; stars: number; correct: number; gemsGained: number; n: number }
  >(null);
  const [celebrate, setCelebrate] = useState<{ mood: "happy" | "excited"; title: string; body: string } | null>(null);

  function newStageQuestion(topic: Topic, n: number) {
    const problem = topic.gen(STAGE_DIFF[n - 1] as Difficulty);
    const mode = weightedPick<Mode>([["type", 1], ["choice", 2], ["target", 2], ["truefalse", 2]]);
    setCurProblem(problem);
    setCurMode(mode);
    setCurSelection(null);
    setCheckEnabled(false);
    setWrongFlash(false);
    if (mode === "choice") setTileOptions(shuffle([problem.answer, ...makeDistractors(problem.answer, 3)]));
    else if (mode === "target") setTileOptions(shuffle([problem.answer, ...makeDistractors(problem.answer, 5)]));
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
      confetti.burstFromEl(practiceCardRef.current, 22);
      setStreakPop(true);
      setTimeout(() => setStreakPop(false), 220);
    } else {
      setHearts((h) => Math.max(0, h - 1));
      if (curMode === "type") setWrongFlash(true);
      else setShakeTile(true);
      setShakeQuestion(true);
      setTimeout(() => setShakeQuestion(false), 400);
      setTimeout(() => setShakeTile(false), 400);
    }
    setFeedback({ show: true, ok, t2: ok ? "" : `${curProblem.prompt} = ${fmt(curProblem.answer)}` });
  }

  async function onFeedbackContinue() {
    setFeedback(null);
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

    setProgress((prev) => {
      const p = topicProgressOf(prev, currentTopic.id);
      const nextStars = { ...p.stageStars };
      if (result.stars > (nextStars[String(n)] || 0)) nextStars[String(n)] = result.stars;
      const nextCleared = result.justUnlocked ? n : p.cleared;
      return {
        ...prev,
        topics: { ...prev.topics, [currentTopic.id]: { cleared: nextCleared, stageStars: nextStars } },
      };
    });

    setStageResult({ passed: result.passed, stars: result.stars, correct, gemsGained: result.gemsGained, n });
    if (result.passed) confetti.burstCenter(100, 0.4);
    if (result.passed && n === STAGE_COUNT) {
      setTimeout(() => {
        setCelebrate({
          mood: "excited",
          title: "Sutra Mastered!",
          body: `You've cleared every stage of ${currentTopic.title}.`,
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
      else setPuzzleStatus({ text: "Tap a lit stick first, then tap where it should go.", color: "var(--ink-dim)" });
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
    checkSolved(nextGlyphs);
  }

  async function checkSolved(g: Glyph[]) {
    const eq = currentEquationText(g);
    if (!eq.valid) {
      setPuzzleStatus({ text: "Shape in progress: " + eq.text, color: "var(--ink-dim)" });
      return;
    }
    const ok = evalEquation(eq.parts);
    if (ok) {
      setPuzzleStatus({ text: "🎉 Solved! " + eq.parts.join(" ") + " is true.", color: "var(--green-dk)" });
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
      if (!already) {
        setTimeout(() => {
          setCelebrate({
            mood: "excited",
            title: "Dojo round cleared!",
            body: `You fixed it in ${moveCount + 1} move${moveCount + 1 === 1 ? "" : "s"} — par is ${p.par}.`,
          });
        }, 300);
      }
    } else {
      setPuzzleStatus({ text: eq.parts.join(" ") + " — not true yet.", color: "var(--red-dk)" });
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
      setPuzzleStatus({ text: "You're already on the solution shape — place your move to win!", color: "var(--ink-dim)" });
      return;
    }
    setHintPair(pair);
    setPuzzleStatus({ text: "💡 Pick up the glowing stick, then place it on the glowing target.", color: "var(--ink-dim)" });
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
          <button className="back-btn" aria-label="Sign out" onClick={() => signOut({ redirectTo: "/login" })} title="Sign out">
            ⏻
          </button>
        )}
        <div className="header-title"><h1>{headerTitle}</h1></div>
        <div className="stats-row">
          <span className="stat stat-flame">🔥 {bestStreakEver}</span>
          <span className="stat stat-gem">💎 {gems}</span>
          <span className="stat stat-heart">❤️ {hearts}</span>
        </div>
      </header>

      <main>
        {view === "home" && (
          <HomeView
            progress={progress}
            li={li}
            solvedCount={solvedCount}
            onOpenTopic={openTopic}
            onOpenArena={() => { loadPuzzle(puzIdx); setView("arena"); }}
          />
        )}

        {view === "topic" && currentTopic && <TopicView topic={currentTopic} />}

        {view === "stagemap" && currentTopic && (
          <StageMapView topic={currentTopic} progress={progress} onPlay={startStage} />
        )}

        {view === "practice" && currentTopic && curProblem && (
          <PracticeView
            topic={currentTopic}
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
            typeInputRef={typeInputRef}
            practiceCardRef={practiceCardRef}
            onSelect={(v) => { setCurSelection(v); setCheckEnabled(true); }}
            onInputChange={(v) => setCheckEnabled(v.trim() !== "")}
            onCheck={checkPractice}
          />
        )}

        {view === "arena" && (
          <ArenaView
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
            See the Stage Map →
          </button>
        )}
        {view === "practice" && (
          <>
            <button className="btn btn-ghost" onClick={() => openTopic(currentTopicId!)}>
              📖 Lesson
            </button>
            <button className="btn btn-primary" disabled={!checkEnabled} onClick={checkPractice}>
              Check
            </button>
          </>
        )}
        {view === "arena" && (
          <>
            <button className="btn btn-ghost" onClick={onHint}>💡 Hint</button>
            <button className="btn btn-ghost" onClick={() => loadPuzzle(puzIdx)}>↺ Reset</button>
            <button className="btn btn-primary" onClick={() => loadPuzzle(puzIdx + 1)}>Next →</button>
          </>
        )}
      </footer>

      {feedback?.show && (
        <div className={`feedback-banner show ${feedback.ok ? "good" : "bad"}`}>
          <div className="feedback-inner">
            <div className="feedback-icon">{feedback.ok ? "✓" : "✕"}</div>
            <div className="feedback-text">
              <div className="t1">{feedback.ok ? "Correct!" : "Not quite!"}</div>
              <div className="t2">{feedback.t2}</div>
            </div>
            <button className="btn" style={{ flex: "0 0 auto" }} onClick={onFeedbackContinue}>
              Continue
            </button>
          </div>
        </div>
      )}

      {stageResult && (
        <div className="show" id="stageResult" style={{ display: "flex", position: "fixed", inset: 0, zIndex: 55, alignItems: "center", justifyContent: "center", background: "rgba(15,15,30,.6)", backdropFilter: "blur(3px)" }}>
          <div className="result-card">
            <div className={`hanko ${stageResult.passed ? "" : "fail"}`}>
              <span className="jp">{stageResult.passed ? "合格" : "再挑戦"}</span>
              <span className="en">{stageResult.passed ? "Clear" : "Retry"}</span>
            </div>
            <div className="result-stars">
              {[0, 1, 2].map((i) => (
                <span key={i} className={i < stageResult.stars ? "on pop" : ""}>
                  ★
                </span>
              ))}
            </div>
            <div className="result-sub">{stageResult.correct} / {QUESTIONS_PER_STAGE} correct</div>
            <div className="result-gems">+{stageResult.gemsGained} 💎</div>
            <div className="result-actions">
              {stageResult.passed ? (
                stageResult.n < STAGE_COUNT ? (
                  <button className="btn btn-primary" onClick={() => afterStageResult("next")}>Next Stage →</button>
                ) : (
                  <button className="btn btn-primary" onClick={() => afterStageResult("map")}>Back to Map</button>
                )
              ) : (
                <button className="btn btn-primary" onClick={() => afterStageResult("retry")}>Retry Stage</button>
              )}
              <button className="btn btn-ghost" onClick={() => afterStageResult("map")}>Map</button>
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
              Continue
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
  onOpenTopic,
  onOpenArena,
}: {
  progress: ProgressState;
  li: ReturnType<typeof levelInfo>;
  solvedCount: number;
  onOpenTopic: (id: string) => void;
  onOpenArena: () => void;
}) {
  const firstIncompleteIdx = (() => {
    const idx = TOPICS.findIndex((t) => topicProgressOf(progress, t.id).cleared < STAGE_COUNT);
    return idx === -1 ? TOPICS.length - 1 : idx;
  })();

  return (
    <section className="view active">
      <div className="unit-banner">
        <svg className="mandala" viewBox="0 0 100 100"><Mandala stroke="#fff" /></svg>
        <div className="mascot"><Mascot mood="happy" /></div>
        <div className="eyebrow">The Sutra Deck</div>
        <h1>Play the Sutras</h1>
        <div className="levelrow">
          <span>Level {li.level} · {li.rank}</span>
          <span>{li.into} / 150</span>
        </div>
        <div className="bar-track"><div className="bar-fill" style={{ width: `${li.pct}%` }} /></div>
      </div>

      <div className="path-wrap">
        <div className="path-line" />
        {TOPICS.map((t, i) => {
          const p = topicProgressOf(progress, t.id);
          const isCurrent = i === firstIncompleteIdx;
          const boss =
            i === 6 ? (
              <div className="boss-row" key="boss">
                <div className="node-wrap">
                  <div className="boss-node" onClick={onOpenArena}>
                    🔥
                    <span className="boss-chip">{solvedCount}/{PUZZLES.length}</span>
                  </div>
                  <div className="node-label">Matchstick Dojo</div>
                </div>
              </div>
            ) : null;
          return (
            <div key={t.id}>
              {boss}
              <div className={`path-row pos-${PATH_POS[i % PATH_POS.length]}`}>
                <div className="node-wrap">
                  {isCurrent && <div className="node-bubble">Play</div>}
                  <div
                    className={`node${isCurrent ? " current" : ""}`}
                    style={{ background: gradCss(t.grad) }}
                    onClick={() => onOpenTopic(t.id)}
                  >
                    {t.icon}
                    <span className="stage-pips">
                      {Array.from({ length: STAGE_COUNT }, (_, k) => (
                        <i key={k} className={k < p.cleared ? "on" : ""} />
                      ))}
                    </span>
                  </div>
                  <div className="node-label">{t.title}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TopicView({ topic }: { topic: Topic }) {
  const ex = topic.example();
  const rows = topic.exSteps(ex);
  return (
    <section className="view active">
      <div className="topic-head">
        <div className="icon-badge" style={{ background: gradCss(topic.grad) }}>{topic.icon}</div>
        <div className="sutra-tag" style={{ background: gradCss(topic.grad) }}>
          🕉 {topic.sutraSa} — {topic.sutraEn}
        </div>
        <h1>{topic.title}</h1>
        <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 8, lineHeight: 1.5, fontWeight: 600 }}>{topic.blurb}</p>
      </div>
      <div className="topic-illus" dangerouslySetInnerHTML={{ __html: ILLUS[topic.illus](topic.grad[0], topic.grad[1]) }} />
      <div className="card">
        <h4>How it works</h4>
        <ol className="steps">
          {topic.steps.map((s, i) => (
            <li key={i}>
              <span className="n" style={{ background: gradCss(topic.grad) }}>{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
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
}: {
  topic: Topic;
  progress: ProgressState;
  onPlay: (n: number) => void;
}) {
  const p = topicProgressOf(progress, topic.id);
  return (
    <section className="view active">
      <div className="stagemap-head">
        <div className="sutra-tag" style={{ background: gradCss(topic.grad), display: "inline-flex" }}>
          🕉 {topic.sutraSa}
        </div>
        <h1 style={{ fontSize: 22 }}>{topic.title}</h1>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 6, fontWeight: 600 }}>
          Clear a stage (3 of 5 right) to unlock the next. 5 in a row earns all 3 stars.
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
                {isCurrent && <div className="node-bubble">Play</div>}
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
  typeInputRef,
  practiceCardRef,
  onSelect,
  onInputChange,
  onCheck,
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
  typeInputRef: React.RefObject<HTMLInputElement | null>;
  practiceCardRef: React.RefObject<HTMLDivElement | null>;
  onSelect: (v: number | boolean) => void;
  onInputChange: (v: string) => void;
  onCheck: () => void;
}) {
  const modeTag =
    mode === "type" ? "⌨️ Type it" : mode === "choice" ? "🧩 Choose the answer" : mode === "target" ? "🎯 Tap it fast!" : "🔎 True or false?";

  return (
    <section className="view active">
      <div className="progress-top">
        <div className="progress-top-fill" style={{ width: `${Math.round((qIndex / QUESTIONS_PER_STAGE) * 100)}%` }} />
      </div>
      <div className="topic-head" style={{ marginTop: 2 }}>
        <div className="eyebrow-tag">Stage {stageN} of {STAGE_COUNT}</div>
        <div className="sutra-tag" style={{ background: gradCss(topic.grad) }}>🕉 {topic.sutraSa}</div>
        <h1>{topic.title}</h1>
      </div>
      <div className="practice-card" ref={practiceCardRef}>
        <div className="practice-meta">
          <span>Question {qIndex + 1} / {QUESTIONS_PER_STAGE}</span>
          <span className={`streak-flame${streakPop ? " pop" : ""}${correct >= 3 ? " combo3" : ""}`}>🔥 {correct}</span>
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
        {mode === "truefalse" && (
          <>
            <div className="tf-equation mono">{problem.prompt} = {fmt(tfShown)}</div>
            <div className="tf-row">
              <button
                className={`tf-btn${curSelection === true ? " picked true" : ""}${curSelection === true && shakeTile ? " shake-tile" : ""}`}
                onClick={() => onSelect(true)}
              >
                <span className="ic">✅</span>True
              </button>
              <button
                className={`tf-btn${curSelection === false ? " picked false" : ""}${curSelection === false && shakeTile ? " shake-tile" : ""}`}
                onClick={() => onSelect(false)}
              >
                <span className="ic">❌</span>False
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
        <div className="sutra-tag" style={{ background: "linear-gradient(135deg,#FF5D3A,#FF9A2E)" }}>Matchstick Dojo</div>
        <h1>Move a stick, fix the sum</h1>
        <p style={{ color: "var(--muted)", fontSize: 13.5, marginTop: 6, lineHeight: 1.5, fontWeight: 600 }}>
          Tap a lit stick to pick it up, then tap an empty spot — on the board or the tray — to place it. Every equation here bends true in exactly one move.
        </p>
      </div>
      <div className="puzzle-nav">
        <span>Round {puzIdx + 1} of {PUZZLES.length}</span>
        <div className="dot-row">
          {PUZZLES.map((pz, i) => (
            <div key={pz.id} className={`dot${i === puzIdx ? " on" : ""}${solvedMap[pz.id] && i !== puzIdx ? " solved" : ""}`} />
          ))}
        </div>
      </div>
      <div><span className="par-chip">🎯 Par: {p.par} move{p.par === 1 ? "" : "s"}</span></div>
      <div className="puzzle-board">
        <svg className="mandala-watermark" viewBox="0 0 100 100"><Mandala stroke="#7A4E2C" /></svg>
        <div className="board-svg-wrap">
          <svg ref={svgRef} viewBox="0 0 400 140" width="400" height="140">{sticks}</svg>
        </div>
      </div>
      <div className="tray-wrap">
        <span className="tray-label">Spare tray</span>
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
        <span>Moves used: <b>{moveCount}</b></span>
        <span>Best: <b>{bestMoves != null ? bestMoves : "–"}</b></span>
      </div>
      <div className="puzzle-status" style={{ color: status.color }}>{status.text}</div>
      <div className="story-chip">{p.story}</div>
    </section>
  );
}
