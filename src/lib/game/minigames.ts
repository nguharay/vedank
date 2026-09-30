import { BLITZ_TOPICS, blitzDiff, type Difficulty } from "./topics";
import { seededRandom, withSeededRandom } from "./daily";

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
   Excluded rather than reworded, because the prompt is the lesson's. */
const NOT_SELF_EXPLANATORY = new Set(["balancing"]);

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

/* ---------- Quick games ----------
   Eight games share one shape: a prompt, two to four options, one right.
   Each is a generator here and a row on the shelf — the view is shared. The
   `note` is shown after answering: the one-line trick that makes the answer
   quick, which is the point of a Vedic maths game. */
export type QuickRound = { prompt: string; options: string[]; answer: number; noteJa: string; noteEn: string };
export type QuickGame = {
  id: string; icon: string; tint: string;
  name: string; nameJa: string; blurb: string; blurbJa: string;
  hintJa: string; hintEn: string;
  next: (streak: number, lang: "en" | "ja") => QuickRound;
};

const ri = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
const fmtN = (n: number) => n.toLocaleString("en-IN");

/* Options around a numeric answer, all distinct, shuffled; returns the index
   of the right one. */
function numericOptions(answer: number, count: number, spread: (a: number) => number[]): { options: string[]; answer: number } {
  const set = new Set<number>([answer]);
  const cands = spread(answer).filter((x) => Number.isFinite(x) && x !== answer);
  for (const c of shuffle(cands)) {
    if (set.size >= count) break;
    set.add(c);
  }
  let k = 1;
  while (set.size < count) { set.add(answer + k); set.add(answer - k); k++; }
  const opts = shuffle([...set].slice(0, count).concat(set.has(answer) ? [] : [answer]).slice(0, count));
  if (!opts.includes(answer)) opts[0] = answer;
  return { options: opts.map(fmtN), answer: opts.indexOf(answer) };
}

export const QUICK_GAMES: QuickGame[] = [
  {
    id: "tf", icon: "⭕", tint: "var(--green-dk)",
    name: "True or False", nameJa: "○×スピード",
    blurb: "Is the sum right? Decide fast.", blurbJa: "この式、正しい？ すばやく判定。",
    hintJa: "正しければ○、まちがいなら×", hintEn: "○ if it's right, × if it's wrong",
    next: (streak) => {
      /* A prompt that is itself a statement ("49 = 50 − ?") cannot be judged
         true or false once an "= answer" is appended to it. */
      let p = drawProblem(streak >= 8 ? "medium" : "easy");
      for (let i = 0; i < 40 && /[=?]/.test(p.prompt); i++) p = drawProblem(streak >= 8 ? "medium" : "easy");
      if (/[=?]/.test(p.prompt)) p = { prompt: "7 × 8", answer: 56 };
      const lie = Math.random() < 0.5;
      const shown = lie ? p.answer + pick([1, -1, 10, -10, 2, 9, -9]) : p.answer;
      return {
        prompt: `${p.prompt} = ${fmtN(shown)}`,
        options: ["○", "×"], answer: lie ? 1 : 0,
        noteJa: `正解は ${fmtN(p.answer)}`, noteEn: `The answer is ${fmtN(p.answer)}`,
      };
    },
  },
  {
    id: "missing", icon: "❓", tint: "var(--sky2)",
    name: "Missing Number", nameJa: "穴うめ",
    blurb: "Fill the blank in the sum.", blurbJa: "□ に入る数は？",
    hintJa: "□ に入る数をえらぼう", hintEn: "Pick what goes in the blank",
    next: (streak) => {
      const a = ri(10, streak >= 8 ? 99 : 60), b = ri(2, streak >= 8 ? 99 : 40);
      const hideA = Math.random() < 0.5;
      const add = Math.random() < 0.6;
      const total = add ? a + b : a * b;
      const missing = hideA ? a : b;
      const prompt = add
        ? (hideA ? `□ + ${b} = ${total}` : `${a} + □ = ${total}`)
        : (hideA ? `□ × ${b} = ${fmtN(total)}` : `${a} × □ = ${fmtN(total)}`);
      const o = numericOptions(missing, 4, (x) => [x + 1, x - 1, x + 10, x - 10, x + 2, x - 2, x + 5]);
      return { prompt, ...o,
        noteJa: add ? `${fmtN(total)} − ${hideA ? b : a} = ${missing}` : `${fmtN(total)} ÷ ${hideA ? b : a} = ${missing}`,
        noteEn: add ? `${fmtN(total)} − ${hideA ? b : a} = ${missing}` : `${fmtN(total)} ÷ ${hideA ? b : a} = ${missing}` };
    },
  },
  {
    id: "lastdigit", icon: "🔚", tint: "var(--violet)",
    name: "Last Digit", nameJa: "一の位だけ",
    blurb: "Only the last digit of the product matters.", blurbJa: "かけ算の一の位だけ当てよう。",
    hintJa: "一の位どうしをかければ、答えの一の位がわかる", hintEn: "Multiply just the last digits",
    next: (_streak, lang) => {
      const a = ri(12, 99), b = ri(12, 99);
      const last = (a * b) % 10;
      const o = numericOptions(last, 4, (x) => [0,1,2,3,4,5,6,7,8,9].filter((d) => d !== x));
      return { prompt: lang === "ja" ? `${a} × ${b} の一の位は？` : `Last digit of ${a} × ${b}?`, ...o,
        noteJa: `${a % 10} × ${b % 10} = ${(a % 10) * (b % 10)} → 一の位は ${last}`,
        noteEn: `${a % 10} × ${b % 10} = ${(a % 10) * (b % 10)} → last digit ${last}` };
    },
  },
  {
    id: "digitsum", icon: "9️⃣", tint: "var(--sun1)",
    name: "Digit Sum", nameJa: "数字の合計",
    blurb: "Fold the digits down to one.", blurbJa: "各位の数字をたして、一けたにしよう。",
    hintJa: "数字をぜんぶたして、一けたになるまでくり返す", hintEn: "Add the digits until one remains",
    next: (streak) => {
      const n = ri(streak >= 6 ? 1000 : 100, streak >= 6 ? 99999 : 9999);
      const ds = digitSum(n);
      const o = numericOptions(ds, 4, (x) => [1,2,3,4,5,6,7,8,9].filter((d) => d !== x));
      const firstPass = String(n).split("").reduce((s, c) => s + Number(c), 0);
      return { prompt: `${fmtN(n)}`, ...o,
        noteJa: `${String(n).split("").join("+")} = ${firstPass}${firstPass > 9 ? ` → ${ds}` : ""}`,
        noteEn: `${String(n).split("").join("+")} = ${firstPass}${firstPass > 9 ? ` → ${ds}` : ""}` };
    },
  },
  {
    id: "div9", icon: "➗", tint: "var(--pink)",
    name: "Divisible by 9?", nameJa: "9で割れる？",
    blurb: "Yes or no — without dividing.", blurbJa: "割らずに判定できるかな？",
    hintJa: "数字の合計が9なら、9で割れる", hintEn: "Digit sum 9 means divisible by 9",
    next: (_streak, lang) => {
      const yes = Math.random() < 0.5;
      let n = ri(100, 9999);
      if (yes) n = n - (n % 9) || 9; else if (n % 9 === 0) n += ri(1, 8);
      return { prompt: `${fmtN(n)}`,
        options: lang === "ja" ? ["○ 割れる", "× 割れない"] : ["○ Yes", "× No"], answer: yes ? 0 : 1,
        noteJa: `数字の合計 → ${digitSum(n)} → ${yes ? "9で割れる" : "割れない"}`,
        noteEn: `digit sum → ${digitSum(n)} → ${yes ? "divisible" : "not divisible"}` };
    },
  },
  {
    id: "sq5", icon: "🟪", tint: "var(--indigo, #3A1D7A)",
    name: "Squares Ending in 5", nameJa: "5で終わる数の2乗",
    blurb: "25², 35², 85² — in one step.", blurbJa: "25², 35², 85² を一発で。",
    hintJa: "十の位 × (十の位+1) のあとに 25", hintEn: "tens × (tens+1), then write 25",
    next: () => {
      const t = ri(1, 12), n = t * 10 + 5, sq = n * n;
      const o = numericOptions(sq, 4, (x) => [x + 100, x - 100, x + 1000, x - 1000, x + 10, x + 200]);
      return { prompt: `${n}²`, ...o,
        noteJa: `${t} × ${t + 1} = ${t * (t + 1)} → ${fmtN(sq)}`, noteEn: `${t} × ${t + 1} = ${t * (t + 1)} → ${fmtN(sq)}` };
    },
  },
  {
    id: "x11", icon: "1️⃣", tint: "var(--teal, #0A7E92)",
    name: "Times Eleven", nameJa: "11をかける",
    blurb: "Any two-digit number × 11.", blurbJa: "2けたの数 × 11 をすばやく。",
    hintJa: "両はしはそのまま、まん中はたし算", hintEn: "Keep the ends, add for the middle",
    next: (streak) => {
      const n = ri(12, streak >= 6 ? 98 : 89), ans = n * 11;
      const o = numericOptions(ans, 4, (x) => [x + 11, x - 11, x + 10, x - 10, x + 100, x - 100]);
      const d1 = Math.floor(n / 10), d2 = n % 10;
      return { prompt: `${n} × 11`, ...o,
        noteJa: `${d1} | ${d1}+${d2}=${d1 + d2} | ${d2} → ${fmtN(ans)}`, noteEn: `${d1} | ${d1}+${d2}=${d1 + d2} | ${d2} → ${fmtN(ans)}` };
    },
  },
  {
    id: "estimate", icon: "🎯", tint: "var(--gold-dk)",
    name: "Closest Guess", nameJa: "だいたいいくつ？",
    blurb: "Which is nearest? No exact working needed.", blurbJa: "いちばん近いのはどれ？ 計算しきらなくてOK。",
    hintJa: "だいたいで考えて、いちばん近い答えをえらぼう", hintEn: "Round, then pick the nearest",
    next: () => {
      const a = ri(21, 99), b = ri(21, 99), exact = a * b;
      const near = Math.round(exact / 100) * 100;
      const opts = shuffle([near, near + 500, near - 500, near + 1000].filter((x) => x > 0));
      const target = opts.indexOf(near);
      return { prompt: `${a} × ${b} ≈ ?`, options: opts.map(fmtN), answer: target,
        noteJa: `${a} × ${b} = ${fmtN(exact)}`, noteEn: `${a} × ${b} = ${fmtN(exact)}` };
    },
  },
];

export function quickGame(id: string): QuickGame | undefined {
  return QUICK_GAMES.find((g) => g.id === id);
}


/* ---------- Number Pop — balloons with sums ----------
   One sum at the top, nine pads below. Three balloons float up: the answer
   and two near-misses. Pop the answer before they drift off. The near-misses are
   deliberately close (±1, ±10, a swapped digit) so a glance is not enough. */
export type PopRound = { prompt: string; answer: number; holes: (number | null)[] };

/* How long the balloons stay up, in ms: brisk from the start, quick by the end. */
export function popUpMs(streak: number): number {
  return Math.max(1100, 2400 - streak * 70);
}
/* Pop sums are meant to be read and answered in a second or two — this is a
   reflex game, so the arithmetic stays small. It ramps gently: single digits,
   then teens and the small tables, then the book's easiest tricks. */
export function popSum(streak: number): { prompt: string; answer: number } {
  const ri = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1));
  const tier = streak < 6 ? 0 : streak < 14 ? 1 : 2;
  const k = ri(0, 3);
  if (tier === 0) {
    if (k === 0) { const a = ri(2, 9), b = ri(2, 9); return { prompt: `${a} + ${b}`, answer: a + b }; }
    if (k === 1) { const a = ri(6, 15), b = ri(1, a - 1); return { prompt: `${a} − ${b}`, answer: a - b }; }
    if (k === 2) { const a = ri(2, 5), b = ri(2, 6); return { prompt: `${a} × ${b}`, answer: a * b }; }
    const a = ri(1, 9); return { prompt: `${a} + 10`, answer: a + 10 };
  }
  if (tier === 1) {
    if (k === 0) { const a = ri(11, 29), b = ri(2, 9); return { prompt: `${a} + ${b}`, answer: a + b }; }
    if (k === 1) { const a = ri(11, 30), b = ri(2, 9); return { prompt: `${a} − ${b}`, answer: a - b }; }
    if (k === 2) { const a = ri(2, 9), b = ri(2, 9); return { prompt: `${a} × ${b}`, answer: a * b }; }
    const a = ri(1, 9) * 10, b = ri(1, 9) * 10; return { prompt: `${a} + ${b}`, answer: a + b };
  }
  if (k === 0) { const a = ri(12, 25); return { prompt: `${a} × 11`, answer: a * 11 }; }
  if (k === 1) { const a = ri(11, 89); return { prompt: `100 − ${a}`, answer: 100 - a }; }
  if (k === 2) { const a = ri(1, 2) * 10 + 5; return { prompt: `${a}²`, answer: a * a }; }
  const a = ri(12, 40), b = ri(1, 2) * 10 + 9; return { prompt: `${a} + ${b}`, answer: a + b };
}

export function buildPopRound(streak: number): PopRound {
  const p = popSum(streak);
  const decoys = new Set<number>();
  const swapped = Number(String(Math.abs(p.answer)).split("").reverse().join(""));
  const cands = [p.answer + 1, p.answer - 1, p.answer + 10, p.answer - 10, swapped, p.answer + 2, p.answer - 2, p.answer + 100];
  for (const c of shuffle(cands)) {
    if (decoys.size >= 2) break;
    if (c !== p.answer && c > 0 && Number.isFinite(c)) decoys.add(c);
  }
  while (decoys.size < 2) decoys.add(p.answer + 3 + decoys.size);
  const holes: (number | null)[] = Array(9).fill(null);
  const spots = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]).slice(0, 3);
  [p.answer, ...decoys].forEach((v, i) => { holes[spots[i]] = v; });
  return { prompt: p.prompt, answer: p.answer, holes };
}
/* Combos pay: the fifth hit in a row is worth more than the first. */
export function popPoints(combo: number): number {
  return 10 + Math.min(combo, 10) * 5;
}

/* ---------- Math Runner & Math Race ----------
   Both are "answer to move" games: one sum, three answers to tap. They share
   Number Pop's sums, which ramp by streak and stay small enough to do in a
   second or two while something is running at you. */
export type ChoiceRound = { prompt: string; answer: number; options: number[] };

export function buildChoiceRound(streak: number): ChoiceRound {
  return choiceFor(popSum(streak));
}
/* Three answers for a sum: the right one and two near misses a hurried
   player might pick (off by one, off by ten, digits swapped). */
function choiceFor(p: { prompt: string; answer: number }): ChoiceRound {
  const swapped = Number(String(Math.abs(p.answer)).split("").reverse().join(""));
  const cands = [p.answer + 1, p.answer - 1, p.answer + 10, p.answer - 10, swapped, p.answer + 2, p.answer - 2];
  const decoys = new Set<number>();
  for (const c of shuffle(cands)) {
    if (decoys.size >= 2) break;
    if (c !== p.answer && c > 0 && Number.isFinite(c)) decoys.add(c);
  }
  while (decoys.size < 2) decoys.add(p.answer + 3 + decoys.size);
  return { prompt: p.prompt, answer: p.answer, options: shuffle([p.answer, ...decoys]) };
}

/* Runner: how long an obstacle takes to reach you — the answer window. */
export function runnerWindowMs(streak: number): number {
  return Math.max(2600, 5200 - streak * 110);
}
/* Runner: each obstacle cleared is worth more the longer the run. */
export function runnerPoints(streak: number): number {
  return 10 + Math.min(streak, 20) * 2;
}

/* Race: correct answers needed to cross the line. */
export const RACE_GOAL = 15;

/* Race levels. The sums never get harder — the rivals get faster. Each level
   has two rivals; `secs` is how long each takes to finish. Beating the faster
   one needs roughly secs / RACE_GOAL seconds per answer:
     Lv1  ~6 s an answer   Lv2  ~3.7 s   Lv3  ~2.8 s   Lv4  ~2.1 s
   Winning a level (1st place) unlocks the next. */
export type RaceRival = { id: string; emoji: string; name: string; nameJa: string; secs: number };
export type RaceLevel = { id: number; name: string; nameJa: string; rivals: [RaceRival, RaceRival] };
export const RACE_LEVELS: RaceLevel[] = [
  { id: 1, name: "Beginner", nameJa: "はじめて", rivals: [
    { id: "kame", emoji: "🐢", name: "Shelly", nameJa: "カメキチ", secs: 90 },
    { id: "katatsu", emoji: "🐌", name: "Slowpoke", nameJa: "ノロノロ", secs: 105 },
  ] },
  { id: 2, name: "Runner", nameJa: "ランナー", rivals: [
    { id: "usa", emoji: "🐰", name: "Hop", nameJa: "ウサピョン", secs: 56 },
    { id: "kame", emoji: "🐢", name: "Shelly", nameJa: "カメキチ", secs: 68 },
  ] },
  { id: 3, name: "Pro", nameJa: "プロ", rivals: [
    { id: "kitsune", emoji: "🦊", name: "Foxy", nameJa: "コンタ", secs: 42 },
    { id: "usa", emoji: "🐰", name: "Hop", nameJa: "ウサピョン", secs: 48 },
  ] },
  { id: 4, name: "Champion", nameJa: "チャンピオン", rivals: [
    { id: "cheetah", emoji: "🐆", name: "Dash", nameJa: "チーター", secs: 32 },
    { id: "kitsune", emoji: "🦊", name: "Foxy", nameJa: "コンタ", secs: 37 },
  ] },
];
export function raceLevel(id: number): RaceLevel {
  return RACE_LEVELS.find((l) => l.id === id) ?? RACE_LEVELS[0];
}

/* A rival's progress (0..1) after `t` seconds. They do not run like a
   metronome: each surges and fades a little mid-race — zero at the start and
   at the line, so their finish time is exactly `secs` — which makes the lead
   change hands and keeps the race close. */
export function rivalProgress(r: RaceRival, t: number, seed: number): number {
  if (t >= r.secs) return 1;
  const f = t / r.secs;
  const surge = Math.sin(f * Math.PI) * (0.05 * Math.sin(t * 0.9 + seed * 2.1) + 0.025 * Math.sin(t * 2.3 + seed));
  return Math.max(0, Math.min(1, f + surge));
}

/* Where the player finished, given their time. 1-based. */
export function racePlace(level: RaceLevel, secs: number): number {
  return 1 + level.rivals.filter((r) => r.secs < secs).length;
}

/* ---------- Online race ----------
   Everyone in a room gets the same sums in the same order: question i is
   drawn from the room's seed, so the server can re-derive it and check an
   answer without storing the sequence, and nobody gets an easier run. */
export const RACE_ROOM_MAX = 4;
export function raceQuestion(seed: number, i: number): ChoiceRound {
  const rand = seededRandom((seed ^ Math.imul(i + 1, 2654435761)) >>> 0);
  return withSeededRandom(rand, () => buildChoiceRound(i));
}

/* ---------- Sushi Shop ----------
   A kaiten-zushi counter. Customers eat from the belt, stack their plates,
   then call for the bill; you total it (or give change from a ¥1,000 note)
   before they lose patience. The prices are chosen so the book's tricks do
   the work: ¥110 plates are ×11, ¥99 plates are "below base 100", and change
   from ¥1,000 is "all from 9, last from 10". */
export type Plate = { id: string; yen: number; color: string; name: string; nameJa: string; sushi: string };
export const PLATES: Plate[] = [
  { id: "w", yen: 110, color: "#f4f1ea", name: "Tamago", nameJa: "たまご", sushi: "🍣" },
  { id: "b", yen: 150, color: "#5b8fd9", name: "Salmon", nameJa: "サーモン", sushi: "🍣" },
  { id: "r", yen: 99, color: "#d9534f", name: "Kappa maki", nameJa: "かっぱ巻き", sushi: "🥒" },
  { id: "g", yen: 200, color: "#e2b53b", name: "Ebi", nameJa: "えび", sushi: "🍤" },
  { id: "k", yen: 300, color: "#2d2d2d", name: "Toro", nameJa: "トロ", sushi: "🐟" },
];
const PLATE = (id: string) => PLATES.find((p) => p.id === id)!;

export type SushiBill = {
  plates: { plate: Plate; n: number }[];
  kind: "total" | "change" | "tax";
  paid: number;         /* the note handed over, for "change" bills */
  prompt: string;       /* the sum, e.g. "4 × ¥110", "¥1,000 − ¥440", "¥600 + 10%" */
  answer: number;
  options: number[];
};

function yen(n: number) { return `¥${n.toLocaleString("en-US")}`; }

/* The shop levels up every SUSHI_PER_LEVEL customers served. Each level adds
   one new kind of bill — never a jump to paper maths:
     Lv1  one colour: 2–4 × ¥110 or ¥200                   (×11, ×2)
     Lv2  up to 9 × ¥110, or ¥99 plates                     (×11, below base 100)
     Lv3  two colours; change from ¥1,000                   (all from 9, last from 10)
     Lv4  ¥110 + ¥150 mixes; change on ¥99 plates
     Lv5  three colours, toro (¥300)
     Lv6  10% tax on a round subtotal                       (×1.1 = ×11 ÷ 10)
     Lv7+ change from ¥5,000 on bigger bills, tax on mixes
   A third of the bills come from the level below, so it ramps, not jumps. */
export const SUSHI_PER_LEVEL = 5;
export function sushiLevel(served: number): number {
  return 1 + Math.floor(served / SUSHI_PER_LEVEL);
}
export const SUSHI_LEVEL_NOTES: Record<number, { en: string; ja: string }> = {
  2: { en: "Bigger stacks — and ¥99 kappa maki!", ja: "お皿がふえる！¥99のかっぱ巻きも登場" },
  3: { en: "Two kinds of plate, and ¥1,000 notes for change", ja: "2種類のお皿と、1,000円札でおつり" },
  4: { en: "Salmon ¥150 joins the belt", ja: "¥150のサーモン登場" },
  5: { en: "Three kinds of plate — and toro ¥300", ja: "3種類のお皿と¥300のトロ" },
  6: { en: "Tax time: add 10%", ja: "消費税10%をたそう" },
  7: { en: "Big spenders pay with ¥5,000", ja: "5,000円札でお支払い" },
};

export function buildSushiBill(served: number): SushiBill {
  const ri = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1));
  const top = Math.min(7, sushiLevel(served));
  const lv = top > 1 && Math.random() < 0.33 ? top - 1 : top;
  let plates: { plate: Plate; n: number }[];
  let kind: SushiBill["kind"] = "total";
  let paid = 1000;
  const k = Math.random();
  switch (lv) {
    case 1:
      plates = [{ plate: PLATE(k < 0.6 ? "w" : "g"), n: ri(2, 4) }];
      break;
    case 2:
      plates = k < 0.5 ? [{ plate: PLATE("w"), n: ri(4, 9) }] : [{ plate: PLATE("r"), n: ri(2, 5) }];
      break;
    case 3:
      if (k < 0.5) plates = [{ plate: PLATE("w"), n: ri(2, 5) }, { plate: PLATE("g"), n: ri(1, 2) }];
      else { plates = [{ plate: PLATE(k < 0.75 ? "w" : "g"), n: ri(2, 4) }]; kind = "change"; }
      break;
    case 4:
      if (k < 0.5) plates = [{ plate: PLATE("w"), n: ri(3, 8) }, { plate: PLATE("b"), n: ri(1, 3) }];
      else { plates = [{ plate: PLATE("r"), n: ri(3, 9) }]; kind = "change"; }
      break;
    case 5:
      plates = k < 0.5
        ? [{ plate: PLATE("w"), n: ri(1, 4) }, { plate: PLATE("b"), n: ri(1, 2) }, { plate: PLATE("g"), n: ri(1, 2) }]
        : [{ plate: PLATE("k"), n: ri(1, 3) }, { plate: PLATE("w"), n: ri(1, 4) }];
      break;
    case 6:
      /* a subtotal in whole hundreds, so the tax is a clean ×1.1 */
      plates = k < 0.5 ? [{ plate: PLATE("g"), n: ri(2, 6) }] : [{ plate: PLATE("k"), n: ri(1, 3) }, { plate: PLATE("g"), n: ri(1, 3) }];
      kind = "tax";
      break;
    default:
      if (k < 0.5) {
        plates = [{ plate: PLATE("w"), n: ri(2, 5) }, { plate: PLATE("b"), n: ri(1, 3) }, { plate: PLATE("k"), n: ri(1, 2) }];
        kind = "change"; paid = 5000;
      } else {
        plates = [{ plate: PLATE("k"), n: ri(2, 4) }, { plate: PLATE("g"), n: ri(2, 5) }];
        kind = "tax";
      }
  }
  const total = plates.reduce((a, p) => a + p.plate.yen * p.n, 0);
  if (kind === "change" && total >= paid) kind = "total";
  const answer = kind === "total" ? total : kind === "change" ? paid - total : total + total / 10;
  const prompt = kind === "total"
    ? plates.map((p) => `${p.n} × ${yen(p.plate.yen)}`).join(" + ")
    : kind === "change" ? `${yen(paid)} − ${yen(total)}` : `${yen(total)} + 10%`;
  const cands = [answer + 10, answer - 10, answer + 100, answer - 100, answer + 1, answer - 1, answer + 110, answer + 50];
  if (kind === "tax") cands.push(total, answer + total / 10);
  const decoys = new Set<number>();
  for (const c of shuffle(cands)) { if (decoys.size >= 2) break; if (c > 0 && c !== answer) decoys.add(c); }
  return { plates, kind, paid, prompt, answer, options: shuffle([answer, ...decoys]) };
}
/* Seconds a customer waits for the bill, and how long they eat first —
   both shrink as the shop levels up. */
export function sushiPatience(served: number): number {
  return Math.max(8, 16 - (sushiLevel(served) - 1) * 1.2);
}
export function sushiEatMs(served: number): number {
  return Math.max(1500, 2800 - (sushiLevel(served) - 1) * 200);
}

/* ---------- Castle Defense ----------
   Monsters march along the road to your castle, each carrying a sum. Answer
   the front one to fire; a wave is a set number of monsters, every fifth
   wave ends with a boss that takes three hits. */
export type CastleWave = { count: number; gapMs: number; speed: number; boss: boolean };
export function castleWave(n: number): CastleWave {
  /* speed = fraction of the road per second */
  return { count: 4 + n, gapMs: Math.max(1100, 2600 - n * 150), speed: Math.min(0.12, 0.05 + n * 0.006), boss: n % 5 === 0 };
}
export function castlePoints(wave: number, boss: boolean): number {
  return (boss ? 50 : 10) + wave * 2;
}

/* Castle Defense sums, one step harder every wave — but every one is a
   single mental step or one of the book's tricks, never paper work:
     w1  single-digit + and −          w2  teens ± a digit, small tables
     w3  full times tables, 2-digit + 1-digit
     w4  2-digit ± tens, ×11 (no carry), ×10
     w5+ 100 − x, 2-digit ×11, 15²–45², ×9, x + 29
     w8+ 1000 − x, teens × teens (base 10), up to 95², ×5, 9-ending adds
   Each wave also mixes in some of the previous tier so it never jumps. */
export function castleQuestion(wave: number): ChoiceRound {
  const ri = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1));
  const tiers: (() => { prompt: string; answer: number })[][] = [
    [
      () => { const a = ri(1, 9), b = ri(1, 9); return { prompt: `${a} + ${b}`, answer: a + b }; },
      () => { const a = ri(5, 10), b = ri(1, a - 1); return { prompt: `${a} − ${b}`, answer: a - b }; },
    ],
    [
      () => { const a = ri(11, 19), b = ri(2, 9); return { prompt: `${a} + ${b}`, answer: a + b }; },
      () => { const a = ri(11, 20), b = ri(2, 9); return { prompt: `${a} − ${b}`, answer: a - b }; },
      () => { const a = ri(2, 5), b = ri(2, 5); return { prompt: `${a} × ${b}`, answer: a * b }; },
    ],
    [
      () => { const a = ri(3, 9), b = ri(3, 9); return { prompt: `${a} × ${b}`, answer: a * b }; },
      () => { const a = ri(21, 89), b = ri(2, 9); return { prompt: `${a} + ${b}`, answer: a + b }; },
      () => { const a = ri(21, 60), b = ri(2, 9); return { prompt: `${a} − ${b}`, answer: a - b }; },
    ],
    [
      () => { const a = ri(12, 70), b = ri(1, 3) * 10; return { prompt: `${a} + ${b}`, answer: a + b }; },
      () => { const a = ri(40, 99), b = ri(1, 3) * 10; return { prompt: `${a} − ${b}`, answer: a - b }; },
      () => { let n: number; do { n = ri(11, 72); } while (Math.floor(n / 10) + (n % 10) >= 10); return { prompt: `${n} × 11`, answer: n * 11 }; },
      () => { const a = ri(12, 99); return { prompt: `${a} × 10`, answer: a * 10 }; },
    ],
    [
      () => { const a = ri(11, 89); return { prompt: `100 − ${a}`, answer: 100 - a }; },
      () => { const n = ri(12, 99); return { prompt: `${n} × 11`, answer: n * 11 }; },
      () => { const a = ri(1, 4) * 10 + 5; return { prompt: `${a}²`, answer: a * a }; },
      () => { const a = ri(3, 12); return { prompt: `${a} × 9`, answer: a * 9 }; },
      () => { const a = ri(12, 60), b = ri(1, 3) * 10 + 9; return { prompt: `${a} + ${b}`, answer: a + b }; },
    ],
    [
      () => { const a = ri(101, 899); return { prompt: `1000 − ${a}`, answer: 1000 - a }; },
      () => { const a = ri(11, 15), b = ri(11, 15); return { prompt: `${a} × ${b}`, answer: a * b }; },
      () => { const a = ri(5, 9) * 10 + 5; return { prompt: `${a}²`, answer: a * a }; },
      () => { const a = ri(6, 40) * 2; return { prompt: `${a} × 5`, answer: a * 5 }; },
      () => { const a = ri(120, 480), b = ri(1, 4) * 10 + 9; return { prompt: `${a} + ${b}`, answer: a + b }; },
    ],
  ];
  /* w1→0, w2→1, w3→2, w4→3, w5-7→4, w8+→5 */
  const top = wave <= 4 ? wave - 1 : wave <= 7 ? 4 : 5;
  /* a third of the time, a sum from the tier below */
  const tier = top > 0 && Math.random() < 0.33 ? top - 1 : top;
  const gens = tiers[Math.max(0, tier)];
  return choiceFor(gens[Math.floor(Math.random() * gens.length)]());
}

/* ---------- 🏪 Konbini Cashier ----------
   Real convenience-store prices. The customer puts items down and pays; you
   give the change. A level every KONBINI_PER_LEVEL customers:
     Lv1  one item, a ¥1,000 note            ¥1,000 − ¥150
     Lv2  one ¥x98 item                       ¥1,000 − ¥298 (all from 9, last from 10)
     Lv3  two items: the total is shown, ¥1,000 note
     Lv4  a ¥5,000 note on a bigger basket
     Lv5  a ¥10,000 note
     Lv6+ the Japanese trick: pays ¥1,030 for ¥530 so the change is ¥500 */
export const KONBINI_PER_LEVEL = 5;
export function konbiniLevel(served: number): number { return 1 + Math.floor(served / KONBINI_PER_LEVEL); }
export type KonbiniItem = { id: string; emoji: string; name: string; nameJa: string; yen: number };
export const KONBINI_ITEMS: KonbiniItem[] = [
  { id: "onigiri", emoji: "🍙", name: "Onigiri", nameJa: "おにぎり", yen: 150 },
  { id: "tea", emoji: "🍵", name: "Green tea", nameJa: "お茶", yen: 130 },
  { id: "sando", emoji: "🥪", name: "Sandwich", nameJa: "サンドイッチ", yen: 298 },
  { id: "karaage", emoji: "🍗", name: "Karaage", nameJa: "からあげ", yen: 238 },
  { id: "ice", emoji: "🍦", name: "Ice cream", nameJa: "アイス", yen: 168 },
  { id: "bento", emoji: "🍱", name: "Bento", nameJa: "お弁当", yen: 498 },
  { id: "nikuman", emoji: "🥟", name: "Nikuman", nameJa: "肉まん", yen: 140 },
  { id: "coffee", emoji: "☕", name: "Coffee", nameJa: "コーヒー", yen: 120 },
  { id: "pudding", emoji: "🍮", name: "Pudding", nameJa: "プリン", yen: 198 },
  { id: "bread", emoji: "🍞", name: "Melon pan", nameJa: "メロンパン", yen: 160 },
];
export type KonbiniQ = { items: KonbiniItem[]; total: number; paid: number; answer: number; options: number[] };
export function buildKonbiniQ(served: number): KonbiniQ {
  const ri = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1));
  const top = Math.min(6, konbiniLevel(served));
  const lv = top > 1 && Math.random() < 0.3 ? top - 1 : top;
  const round = KONBINI_ITEMS.filter((i) => i.yen % 10 === 0 && i.yen % 100 !== 98);
  const x98 = KONBINI_ITEMS.filter((i) => i.yen % 100 === 98);
  let items: KonbiniItem[];
  if (lv === 1) items = [round[ri(0, round.length - 1)]];
  else if (lv === 2) items = [x98[ri(0, x98.length - 1)]];
  else if (lv === 3) items = shuffle(KONBINI_ITEMS).slice(0, 2);
  else items = shuffle(KONBINI_ITEMS).slice(0, ri(3, lv >= 5 ? 5 : 4));
  const total = items.reduce((a, i) => a + i.yen, 0);
  let paid: number;
  if (lv <= 3) paid = total < 1000 ? 1000 : 5000;
  else if (lv === 4) paid = total < 5000 ? 5000 : 10000;
  else if (lv === 5) paid = 10000;
  else {
    /* pay a note plus the coins that round the change: ¥1,030 for ¥530 */
    const coins = total % 100;
    const note = Math.ceil(total / 1000) * 1000;
    paid = coins && Math.random() < 0.7 ? note + coins : note;
  }
  const answer = paid - total;
  const cands = [answer + 10, answer - 10, answer + 100, answer - 100, answer + 2, answer - 2, answer + 1000];
  const decoys = new Set<number>();
  for (const c of shuffle(cands)) { if (decoys.size >= 2) break; if (c > 0 && c !== answer) decoys.add(c); }
  return { items, total, paid, answer, options: shuffle([answer, ...decoys]) };
}
export function konbiniPatience(served: number): number { return Math.max(9, 17 - (konbiniLevel(served) - 1) * 1.5); }

/* ---------- 🧩 Number Crossword ----------
   A grid of numbers with some blanks; every row and column shows its sum.
   Fill the blanks so all the sums hold. Blanks are chosen so the puzzle can
   always be solved one step at a time (some row or column always has just
   one blank left) — which also makes the answer unique.

   Every level is a notch harder than the last — more blanks, bigger
   numbers, a bigger grid, and from level 4 a longer chain of reasoning
   ("depth": how many rounds of filling it takes, since a blank that can only
   be found after another is found is the hard kind):
     Lv1  2×2  1–9    2 blanks          Lv7  3×3  10–99  5 blanks, depth 3
     Lv2  3×3  1–9    3 blanks          Lv8  4×4  1–20   6 blanks, depth 3
     Lv3  3×3  1–9    4 blanks          Lv9  4×4  1–30   7 blanks, depth 3
     Lv4  3×3  1–9    5 blanks, depth 2 Lv10 4×4  10–60  7 blanks, depth 4
     Lv5  3×3  10–30  4 blanks, depth 2 Lv11+ 4×4 20–99  7 blanks, depth 4
     Lv6  3×3  10–50  5 blanks, depth 2
   (8+ blanks in a 4×4 or 6+ in a 3×3 almost never peel, so difficulty grows
   through numbers and depth instead.) */
export type Crossword = { size: number; cells: number[]; blanks: number[]; rowSums: number[]; colSums: number[] };
const CROSS_LEVELS = [
  { size: 2, lo: 1, hi: 9, blanks: 2, depth: 1 },
  { size: 3, lo: 1, hi: 9, blanks: 3, depth: 1 },
  { size: 3, lo: 1, hi: 9, blanks: 4, depth: 1 },
  { size: 3, lo: 1, hi: 9, blanks: 5, depth: 2 },
  { size: 3, lo: 10, hi: 30, blanks: 4, depth: 2 },
  { size: 3, lo: 10, hi: 50, blanks: 5, depth: 2 },
  { size: 3, lo: 10, hi: 99, blanks: 5, depth: 3 },
  { size: 4, lo: 1, hi: 20, blanks: 6, depth: 3 },
  { size: 4, lo: 1, hi: 30, blanks: 7, depth: 3 },
  { size: 4, lo: 10, hi: 60, blanks: 7, depth: 4 },
  { size: 4, lo: 20, hi: 99, blanks: 7, depth: 4 },
];
export function buildCrossword(level: number): Crossword {
  const ri = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1));
  const cfg = CROSS_LEVELS[Math.min(CROSS_LEVELS.length, Math.max(1, level)) - 1];
  const n = cfg.size;
  /* find a blank pattern that peels with at least the wanted depth; keep the
     deepest one seen in case the target is rarely reached */
  let best: number[] | null = null, bestDepth = 0;
  for (let tries = 0; tries < 600; tries++) {
    const blanks = shuffle(Array.from({ length: n * n }, (_, i) => i)).slice(0, cfg.blanks);
    const d = peelDepth(n, blanks);
    if (d > bestDepth) { best = blanks; bestDepth = d; }
    if (d >= cfg.depth) break;
  }
  if (!best) return buildCrossword(1);
  const cells = Array.from({ length: n * n }, () => ri(cfg.lo, cfg.hi));
  const rowSums = Array.from({ length: n }, (_, r) => cells.slice(r * n, r * n + n).reduce((a, b) => a + b, 0));
  const colSums = Array.from({ length: n }, (_, c) => cells.filter((_, i) => i % n === c).reduce((a, b) => a + b, 0));
  return { size: n, cells, blanks: best.sort((a, b) => a - b), rowSums, colSums };
}
/* How many rounds of "fill every blank that is alone in its row or column"
   it takes to finish; 0 if it can't be finished that way. */
export function peelDepth(n: number, blanks: number[]): number {
  const left = new Set(blanks);
  let rounds = 0;
  while (left.size) {
    const now: number[] = [];
    for (let k = 0; k < n; k++) {
      const row = [...left].filter((i) => Math.floor(i / n) === k);
      if (row.length === 1) now.push(row[0]);
      const col = [...left].filter((i) => i % n === k);
      if (col.length === 1) now.push(col[0]);
    }
    if (!now.length) return 0;
    now.forEach((i) => left.delete(i));
    rounds++;
  }
  return rounds;
}
