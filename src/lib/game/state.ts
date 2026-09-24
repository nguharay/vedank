import { TOPICS, STAGE_COUNT, PASS_THRESHOLD, rankFor } from "./topics";

export type TopicProgressRow = { cleared: number; stageStars: Record<string, number> };
export type ProgressState = {
  topics: Record<string, TopicProgressRow>;
  arena: { solved: Record<string, boolean>; bestMoves: Record<string, number> };
};

export function emptyProgress(): ProgressState {
  const topics: Record<string, TopicProgressRow> = {};
  for (const t of TOPICS) topics[t.id] = { cleared: 0, stageStars: {} };
  return { topics, arena: { solved: {}, bestMoves: {} } };
}

export function topicProgressOf(state: ProgressState, id: string): TopicProgressRow {
  return state.topics[id] || { cleared: 0, stageStars: {} };
}

export function starsForStage(state: ProgressState, id: string, n: number): number {
  return topicProgressOf(state, id).stageStars[String(n)] || 0;
}

// A stage opens only once the stage before it in the same topic is cleared AND
// the same-numbered stage of the previous topic is cleared, so the whole course
// advances one stage at a time across topics.
export function stageUnlocked(state: ProgressState, topicId: string, n: number): boolean {
  if (n > topicProgressOf(state, topicId).cleared + 1) return false;
  const idx = TOPICS.findIndex((t) => t.id === topicId);
  if (idx <= 0) return true;
  return topicProgressOf(state, TOPICS[idx - 1].id).cleared >= n;
}

// The topic that gates this one, and the stage of it still to clear — used to
// tell the player exactly what to finish first.
export function stageBlocker(
  state: ProgressState,
  topicId: string,
  n: number
): { topicId: string; stage: number } | null {
  const idx = TOPICS.findIndex((t) => t.id === topicId);
  if (idx <= 0) return null;
  const prev = TOPICS[idx - 1];
  const prevCleared = topicProgressOf(state, prev.id).cleared;
  return prevCleared >= n ? null : { topicId: prev.id, stage: prevCleared + 1 };
}

export function topicUnlocked(state: ProgressState, topicId: string): boolean {
  return stageUnlocked(state, topicId, 1);
}

export function totalGems(state: ProgressState): number {
  let g = 0;
  for (const t of TOPICS) {
    const p = topicProgressOf(state, t.id);
    for (let i = 1; i <= STAGE_COUNT; i++) g += (p.stageStars[String(i)] || 0) * 25;
    g += p.cleared * 50;
  }
  for (const solved of Object.values(state.arena.solved)) if (solved) g += 40;
  return g;
}

export function levelInfo(state: ProgressState) {
  const xp = totalGems(state);
  const level = Math.floor(xp / 150) + 1;
  const into = xp % 150;
  return { xp, level, into, pct: Math.round((into / 150) * 100), rank: rankFor(level) };
}

/* ---------- what a finished stage is worth ----------
   Pure, and here rather than in progress.ts, because two callers need it: the
   server when it writes a signed-in player's row, and the browser when a guest
   is playing and there is no row to write. Same numbers either way — a guest
   who signs up must not see their stars change. */
export type StageOutcome = {
  stars: number;
  passed: boolean;
  justUnlocked: boolean;
  gemsGained: number;
};

export function stageOutcome(correct: number, stageN: number, prevCleared: number): StageOutcome {
  const stars = correct >= 5 ? 3 : correct >= 4 ? 2 : correct >= 3 ? 1 : 0;
  const passed = correct >= PASS_THRESHOLD;
  const justUnlocked = passed && stageN > prevCleared;
  return { stars, passed, justUnlocked, gemsGained: correct * 10 + (justUnlocked ? 50 : 0) };
}
