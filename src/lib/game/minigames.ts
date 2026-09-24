import { BLITZ_TOPICS, blitzDiff, type Difficulty } from "./topics";

/* The mini-games behind the Games tab. Each one is pure and client-side, so
   they work as a guest and offline — and can be tested without a browser.
 
   ---------- Number Match — pair each expression with its answer.
 
   The one rule that makes or breaks it: within a round every answer must be
   unique. Two expressions sharing an answer would make a tap ambiguous, and
   the player would be told they were wrong for a pairing that was right. */

export type MatchTile = { id: string; pairId: number; kind: "expr" | "ans"; text: string; value: number };
export type MatchRound = { tiles: MatchTile[]; pairs: number };

/* Longest expression a tile can show without wrapping at phone widths. */
const MAX_TILE_CHARS = 16;

/* A mini-game shows the prompt and nothing else — no lesson, no worked
   example. These topics are fine on a question card, where the chapter has
   just explained the notation, and meaningless on a bare tile:
     balancing   "8 | 10 | 53"      — the bars mean nothing out of context
     devinculum  "4 9̄ (bar number)" — same, plus a combining overline
   Excluded rather than reworded, because the prompt is the lesson's. */
const NOT_SELF_EXPLANATORY = new Set(["balancing", "devinculum"]);

function miniTopics() {
  return BLITZ_TOPICS.filter((t) => !NOT_SELF_EXPLANATORY.has(t.id));
}

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

export function buildMatchRound(pairs = 6, want: Difficulty = "easy"): MatchRound {
  const seen = new Set<number>();
  const chosen: { prompt: string; answer: number }[] = [];

  /* Bounded rather than while(true): a topic set that cannot yield enough
     distinct answers must degrade to a shorter round, not hang. */
  for (let tries = 0; tries < 400 && chosen.length < pairs; tries++) {
    const pool = miniTopics();
    const topic = pool[Math.floor(Math.random() * pool.length)];
    const p = topic.gen(blitzDiff(topic.id, want));
    if (!Number.isFinite(p.answer) || seen.has(p.answer)) continue;
    /* Keep the tiles readable. A 7-digit answer wraps on a phone, and some
       topics carry a parenthetical in the prompt ("122 ÷ 8 (quotient, rounded
       down)") that is fine on a question card and hopeless on a tile. */
    if (Math.abs(p.answer) > 999999) continue;
    if (p.prompt.length > MAX_TILE_CHARS) continue;
    seen.add(p.answer);
    chosen.push({ prompt: p.prompt, answer: p.answer });
  }

  const tiles: MatchTile[] = [];
  chosen.forEach((c, i) => {
    tiles.push({ id: `e${i}`, pairId: i, kind: "expr", text: c.prompt, value: c.answer });
    tiles.push({ id: `a${i}`, pairId: i, kind: "ans", text: c.answer.toLocaleString("en-IN"), value: c.answer });
  });
  return { tiles: shuffle(tiles), pairs: chosen.length };
}

/* A pair is two tiles of opposite kind from the same problem. Comparing
   pairId rather than value keeps it honest even if a future generator
   produces a duplicate answer that slipped the filter. */
export function isPair(a: MatchTile, b: MatchTile): boolean {
  return a.id !== b.id && a.pairId === b.pairId && a.kind !== b.kind;
}

/* Fewer mistakes matter more than raw speed, but speed breaks ties. */
export function matchScore(pairs: number, seconds: number, mistakes: number): number {
  const base = pairs * 100;
  const speed = Math.max(0, 300 - Math.round(seconds * 4));
  return Math.max(0, base + speed - mistakes * 25);
}


/* ---------- Which is Bigger — tap the larger of two sums ----------
   The two answers must differ, or the question has no right answer. They
   must also not differ so wildly that it stops being arithmetic: a round of
   "7 vs 90,000" is a reading test. */
export type BiggerPair = {
  left: { prompt: string; answer: number };
  right: { prompt: string; answer: number };
};

export function buildBiggerPair(want: Difficulty = "easy"): BiggerPair {
  let a = drawProblem(want);
  let b = drawProblem(want);
  for (let tries = 0; tries < 60 && !usableBiggerPair(a, b); tries++) {
    b = drawProblem(want);
    if (!usableBiggerPair(a, b)) a = drawProblem(want);
  }
  /* Last resort: nudge one side so the round is always answerable. */
  if (a.answer === b.answer) b = { ...b, answer: b.answer + 1, prompt: `${b.prompt} + 1` };
  return { left: a, right: b };
}

function usableBiggerPair(a: { answer: number }, b: { answer: number }) {
  if (a.answer === b.answer) return false;
  const hi = Math.max(Math.abs(a.answer), Math.abs(b.answer));
  const lo = Math.min(Math.abs(a.answer), Math.abs(b.answer));
  return hi <= lo * 12 + 10;          /* close enough that you have to work it out */
}

function drawProblem(want: Difficulty): { prompt: string; answer: number } {
  for (let i = 0; i < 80; i++) {
    const pool = miniTopics();
    const topic = pool[Math.floor(Math.random() * pool.length)];
    const p = topic.gen(blitzDiff(topic.id, want));
    if (!Number.isFinite(p.answer)) continue;
    if (Math.abs(p.answer) > 999999) continue;
    if (p.prompt.length > MAX_TILE_CHARS) continue;
    return { prompt: p.prompt, answer: p.answer };
  }
  return { prompt: "2 + 2", answer: 4 };
}

/* A run ends on the first miss, so the streak is the score. */
export function biggerScore(streak: number): number {
  return streak * 10;
}
