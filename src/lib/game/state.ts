import { TOPICS, STAGE_COUNT, rankFor } from "./topics";

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
