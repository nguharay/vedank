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
function popSum(streak: number): { prompt: string; answer: number } {
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
