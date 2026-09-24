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

/* ---------- Odd One Out — three share a digit sum, one does not ----------
   Built on digit sums rather than on generated problems: finding three
   different expressions that happen to share an answer needs rejection
   sampling that may not terminate, whereas numbers with a given digit sum
   can simply be constructed. It also puts the book's own digit-sum idea in
   front of the player. */
export type OddRound = { tiles: { id: string; n: number }[]; oddId: string; sum: number };

export function digitSum(n: number): number {
  let x = Math.abs(n);
  while (x > 9) x = String(x).split("").reduce((a, c) => a + Number(c), 0);
  return x;
}

function numberWithDigitSum(target: number, rng = Math.random): number {
  /* Digit sum is invariant mod 9, so any n ≡ target (mod 9) works.
     target 9 maps to multiples of 9, which is the identity the book uses. */
  for (let i = 0; i < 200; i++) {
    const n = 12 + Math.floor(rng() * 300);
    if (digitSum(n) === target) return n;
  }
  return target;
}

export function buildOddRound(): OddRound {
  const sum = 1 + Math.floor(Math.random() * 9);
  let other = 1 + Math.floor(Math.random() * 9);
  while (other === sum) other = 1 + Math.floor(Math.random() * 9);

  const used = new Set<number>();
  const pick = (s: number) => {
    for (let i = 0; i < 200; i++) {
      const n = numberWithDigitSum(s);
      if (!used.has(n)) {
        used.add(n);
        return n;
      }
    }
    return numberWithDigitSum(s);
  };

  const same = [pick(sum), pick(sum), pick(sum)];
  const odd = pick(other);
  const tiles = shuffle([...same.map((n) => ({ n })), { n: odd }]).map((t, i) => ({
    id: `o${i}`,
    n: t.n,
  }));
  return { tiles, oddId: tiles.find((t) => t.n === odd)!.id, sum };
}

/* ---------- Sort — put four results in order ----------
   Distinct values, or "smallest first" has more than one right answer. */
export type SortRound = { cards: { id: string; prompt: string; value: number }[] };

export function buildSortRound(count = 4, want: Difficulty = "easy"): SortRound {
  const seen = new Set<number>();
  const picked: { prompt: string; value: number }[] = [];
  for (let i = 0; i < 300 && picked.length < count; i++) {
    const p = drawProblem(want);
    if (seen.has(p.answer)) continue;
    seen.add(p.answer);
    picked.push({ prompt: p.prompt, value: p.answer });
  }
  return { cards: shuffle(picked).map((c, i) => ({ id: `s${i}`, ...c })) };
}

export function sortedIds(round: SortRound): string[] {
  return [...round.cards].sort((a, b) => a.value - b.value).map((c) => c.id);
}

/* ---------- Game of the Day ----------
   One board, the same for everyone, changing at midnight — which is what
   makes a score worth telling a friend. Only the fixed-board games qualify:
   Which is Bigger, Odd One Out and Smallest First are endless streaks, so
   there is no shared thing to compare.

   Distinct from the existing Daily Challenge, which is eight questions. */
export type DailyGameId = "match" | "memory";

export function dailySeed(dateKey: string): number {
  let h = 2166136261;
  for (let i = 0; i < dateKey.length; i++) {
    h ^= dateKey.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* Alternates day to day so it does not become the same game forever. */
export function dailyGameId(dateKey: string): DailyGameId {
  return dailySeed(dateKey) % 2 === 0 ? "match" : "memory";
}

export function dailyGameKey(dateKey: string): string {
  return `sutraSprint.dailyGame.${dateKey}`;
}
