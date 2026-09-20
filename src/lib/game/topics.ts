export type Difficulty = "easy" | "medium" | "hard";

export type Problem = { prompt: string; answer: number };

export type ExStep = [string, string];

export type Topic = {
  id: string;
  icon: string;
  grad: [string, string];
  illus: "numberline" | "grid" | "ladder" | "squaregrid" | "loop";
  title: string;
  sutraSa: string;
  sutraEn: string;
  blurb: string;
  steps: string[];
  example: () => Record<string, number | string>;
  exSteps: (ex: Record<string, number | string>) => ExStep[];
  gen: (diff: Difficulty) => Problem;
};

function ri(a: number, b: number) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}
function pad2(n: number) {
  return (n < 10 ? "0" : "") + n;
}
function fmt(n: number) {
  return n.toLocaleString("en-IN");
}

export const TOPICS: Topic[] = [
  {
    id: "add9",
    icon: "➕",
    grad: ["#FF7A45", "#FF3D77"],
    illus: "numberline",
    title: "Adding 9‑Ending Numbers",
    sutraSa: "Ekadhikena Pūrvena",
    sutraEn: "one more than the one before",
    blurb: "Round the 9-ending number up to the next ten, add, then step back by one.",
    steps: [
      "Spot the number ending in 9.",
      "Round it up to the next multiple of 10 (add 1).",
      "Add the rounded number to the other one.",
      "Subtract 1 from that total to undo the rounding.",
    ],
    example: () => ({ a: 47, b: 29 }),
    exSteps: (ex) => {
      const a = ex.a as number, b = ex.b as number;
      return [
        [`${a} + ${b}`, "="],
        [`${b} rounds up to ${b + 1}`, `${a} + ${b + 1} = ${a + b + 1}`],
        ["step back by 1", `${a + b + 1} − 1 = ${a + b}`],
      ];
    },
    gen: (diff) => {
      const b =
        10 *
          ri(
            diff === "easy" ? 1 : diff === "medium" ? 1 : 3,
            diff === "easy" ? 8 : diff === "medium" ? 19 : 79
          ) +
        9;
      const a = diff === "easy" ? ri(10, 89) : diff === "medium" ? ri(10, 299) : ri(100, 899);
      const swap = Math.random() < 0.35;
      return { prompt: swap ? `${b} + ${a}` : `${a} + ${b}`, answer: a + b };
    },
  },
  {
    id: "sub9",
    icon: "➖",
    grad: ["#7C5CFC", "#B26CFF"],
    illus: "numberline",
    title: "Subtracting 9‑Ending Numbers",
    sutraSa: "Ekanyūnena Pūrvena",
    sutraEn: "one less than the one before",
    blurb: "Round the 9-ending number up to the next ten, subtract, then give one back.",
    steps: [
      "Spot the number being subtracted, ending in 9.",
      "Round it up to the next multiple of 10 (add 1).",
      "Subtract that rounder number instead.",
      "Add 1 back to the result to correct it.",
    ],
    example: () => ({ a: 84, b: 39 }),
    exSteps: (ex) => {
      const a = ex.a as number, b = ex.b as number;
      return [
        [`${a} − ${b}`, "="],
        [`${b} rounds up to ${b + 1}`, `${a} − ${b + 1} = ${a - b - 1}`],
        ["add 1 back", `${a - b - 1} + 1 = ${a - b}`],
      ];
    },
    gen: (diff) => {
      const lo = diff === "easy" ? 30 : diff === "medium" ? 100 : 400;
      const hi = diff === "easy" ? 99 : diff === "medium" ? 399 : 999;
      let b = 10 * ri(1, Math.floor((hi - 9) / 10) - 1) + 9;
      if (b < 19) b = 19;
      const a = ri(Math.max(lo, b + 5), hi);
      return { prompt: `${a} − ${b}`, answer: a - b };
    },
  },
  {
    id: "add8sub8",
    icon: "±",
    grad: ["#12B8A6", "#34D6C9"],
    illus: "numberline",
    title: "±8‑Ending Numbers",
    sutraSa: "Ekadhikena, extended",
    sutraEn: "round by two, not one",
    blurb: "Numbers ending in 8 work the same way — just round by 2 instead of 1.",
    steps: [
      "Spot the number ending in 8.",
      "Round it up to the next multiple of 10 (add 2).",
      "Add or subtract using the rounder number.",
      "Undo the rounding: subtract 2 (if adding) or add 2 back (if subtracting).",
    ],
    example: () => ({ a: 56, b: 48, op: "+" }),
    exSteps: (ex) => {
      const a = ex.a as number, b = ex.b as number, op = ex.op as string;
      if (op === "+")
        return [
          [`${a} + ${b}`, "="],
          [`${b} rounds up to ${b + 2}`, `${a} + ${b + 2} = ${a + b + 2}`],
          ["step back by 2", `${a + b + 2} − 2 = ${a + b}`],
        ];
      return [
        [`${a} − ${b}`, "="],
        [`${b} rounds up to ${b + 2}`, `${a} − ${b + 2} = ${a - b - 2}`],
        ["add 2 back", `${a - b - 2} + 2 = ${a - b}`],
      ];
    },
    gen: (diff) => {
      const op = Math.random() < 0.5 ? "+" : "-";
      const lo = diff === "easy" ? 20 : diff === "medium" ? 100 : 400;
      const hi = diff === "easy" ? 99 : diff === "medium" ? 399 : 999;
      let b = 10 * ri(1, Math.floor((hi - 8) / 10) - 1) + 8;
      if (b < 18) b = 18;
      const a = op === "+" ? ri(lo, hi) : ri(Math.max(lo, b + 5), hi);
      return { prompt: `${a} ${op} ${b}`, answer: op === "+" ? a + b : a - b };
    },
  },
  {
    id: "mult11",
    icon: "✕",
    grad: ["#3E7BFA", "#6C4CF5"],
    illus: "grid",
    title: "Multiplying by 11",
    sutraSa: "Corollary · Ekadhikena",
    sutraEn: "slot the digit-sum in the middle",
    blurb: "Keep the outer digits, drop their sum in between — carry if it overflows.",
    steps: [
      "Write the first digit of the number.",
      "Write the sum of the two digits next to it (this is the middle digit).",
      "Write the last digit.",
      "If the middle sum is 10 or more, carry the 1 into the first digit.",
    ],
    example: () => ({ n: 24 }),
    exSteps: (ex) => {
      const n = ex.n as number, a = Math.floor(n / 10), b = n % 10;
      return [
        [`digits of ${n}`, `${a} and ${b}`],
        [`sum ${a}+${b}`, `= ${a + b}`],
        ["slot it in the middle", `${a} ${a + b} ${b}  →  ${n * 11}`],
      ];
    },
    gen: (diff) => {
      let n: number;
      if (diff === "easy") {
        do {
          n = ri(10, 89);
        } while (Math.floor(n / 10) + (n % 10) >= 10);
      } else if (diff === "medium") {
        n = ri(10, 99);
      } else {
        n = ri(100, 998);
      }
      return { prompt: `${n} × 11`, answer: n * 11 };
    },
  },
  {
    id: "specialMult1",
    icon: "⚡",
    grad: ["#E63A8C", "#FF7AAE"],
    illus: "grid",
    title: "Same Tens, Units Sum to 10",
    sutraSa: "Corollary · Ůrdhva-Tiryagbhyām",
    sutraEn: "multiply the units, bump the tens",
    blurb: "When both numbers share a tens digit and their units add to 10 — e.g. 23×27 — multiply in two clean chunks.",
    steps: [
      "Check: same tens digit, and units add to 10.",
      "Multiply the tens digit by (itself + 1).",
      "Multiply the two units digits (pad to 2 digits if needed).",
      "Place the second result right after the first — that's your answer.",
    ],
    example: () => ({ t: 2, u1: 3, u2: 7 }),
    exSteps: (ex) => {
      const t = ex.t as number, u1 = ex.u1 as number, u2 = ex.u2 as number;
      return [
        [`tens ${t} × (${t}+1)`, `= ${t * (t + 1)}`],
        [`units ${u1} × ${u2}`, `= ${pad2(u1 * u2)}`],
        ["combine", `${t * (t + 1)}${pad2(u1 * u2)}  →  ${t * (t + 1) * 100 + u1 * u2}`],
      ];
    },
    gen: (diff) => {
      const t = diff === "easy" ? ri(1, 9) : diff === "medium" ? ri(1, 29) : ri(1, 99);
      const u1 = ri(1, 9);
      const u2 = 10 - u1;
      const a = 10 * t + u1, b = 10 * t + u2;
      return { prompt: `${a} × ${b}`, answer: a * b };
    },
  },
  {
    id: "specialMult2",
    icon: "⚡",
    grad: ["#FFB020", "#FF7A1A"],
    illus: "grid",
    title: "Same Units, Tens Sum to 10",
    sutraSa: "Corollary · Ůrdhva-Tiryagbhyām",
    sutraEn: "cross-multiply the tens",
    blurb: "When both numbers share a units digit and their tens add to 10 — e.g. 23×83 — another two-chunk shortcut.",
    steps: [
      "Check: same units digit, and tens add to 10.",
      "Multiply the two tens digits and add the shared unit.",
      "Square the shared units digit (pad to 2 digits if needed).",
      "Place the second result right after the first.",
    ],
    example: () => ({ t1: 2, t2: 8, u: 3 }),
    exSteps: (ex) => {
      const t1 = ex.t1 as number, t2 = ex.t2 as number, u = ex.u as number;
      return [
        [`tens ${t1}×${t2} + ${u}`, `= ${t1 * t2 + u}`],
        [`units ${u}×${u}`, `= ${pad2(u * u)}`],
        ["combine", `${t1 * t2 + u}${pad2(u * u)}  →  ${(t1 * t2 + u) * 100 + u * u}`],
      ];
    },
    gen: (diff) => {
      const u = ri(1, 9);
      const t1 = ri(1, 9), t2 = 10 - t1;
      const a = 10 * t1 + u, b = 10 * t2 + u;
      return { prompt: `${a} × ${b}`, answer: a * b };
    },
  },
  {
    id: "mult1x",
    icon: "✕",
    grad: ["#17B978", "#79E6A9"],
    illus: "grid",
    title: "Two Numbers, Both Start with 1",
    sutraSa: "Corollary · Ůrdhva-Tiryagbhyām",
    sutraEn: "cross-add, then multiply the tails",
    blurb: "For any 11–19 × 11–19: add the units crosswise, then multiply the units.",
    steps: [
      'Take the two "extra" digits past 10 (e.g. 14 → 4).',
      "Add 100 (10×10) as the base.",
      "Add 10 × (sum of the two extra digits).",
      "Add the product of the two extra digits.",
    ],
    example: () => ({ x: 4, y: 3 }),
    exSteps: (ex) => {
      const x = ex.x as number, y = ex.y as number;
      return [
        ["base 10×10", "= 100"],
        [`10 × (${x}+${y})`, `= ${10 * (x + y)}`],
        [`extras ${x}×${y}`, `= ${x * y}`],
        ["sum", `100 + ${10 * (x + y)} + ${x * y} = ${100 + 10 * (x + y) + x * y}`],
      ];
    },
    gen: (diff) => {
      const x = diff === "easy" ? ri(1, 4) : ri(1, 9);
      const y = diff === "easy" ? ri(1, 4) : ri(1, 9);
      const a = 10 + x, b = 10 + y;
      return { prompt: `${a} × ${b}`, answer: a * b };
    },
  },
  {
    id: "mult12to19",
    icon: "✕",
    grad: ["#2FA8E0", "#3D6BFF"],
    illus: "ladder",
    title: "Multiplying by 12–19",
    sutraSa: "Corollary · Ůrdhva-Tiryagbhyām",
    sutraEn: "split into tens and the extra",
    blurb: "Multiplying by a teen number? Split it into ×10 plus ×(the extra digit).",
    steps: [
      "Write the multiplier as 10 + d.",
      "Multiply the number by 10.",
      "Multiply the number by d.",
      "Add the two together.",
    ],
    example: () => ({ n: 34, d: 4 }),
    exSteps: (ex) => {
      const n = ex.n as number, d = ex.d as number;
      return [
        [`${n} × 10`, `= ${n * 10}`],
        [`${n} × ${d}`, `= ${n * d}`],
        ["add", `${n * 10} + ${n * d} = ${n * 10 + n * d}`],
      ];
    },
    gen: (diff) => {
      const n = diff === "easy" ? ri(2, 9) : diff === "medium" ? ri(10, 99) : ri(100, 499);
      const d = ri(2, 9);
      return { prompt: `${n} × ${10 + d}`, answer: n * (10 + d) };
    },
  },
  {
    id: "baseBelow10",
    icon: "↘",
    grad: ["#FF5A5F", "#FF947D"],
    illus: "ladder",
    title: "Base Method — Below 10",
    sutraSa: "Nikhilam Navatáścaramam Daśataḥ",
    sutraEn: "all from 9, the last from 10",
    blurb: "For numbers just under 10, work with how far short of 10 they are.",
    steps: [
      "Find each number's deficiency from 10 (10 minus the number).",
      "Cross-subtract: number − other's deficiency, ×10.",
      "Multiply the two deficiencies together.",
      "Add the two parts for the answer.",
    ],
    example: () => ({ a: 7, b: 8 }),
    exSteps: (ex) => {
      const a = ex.a as number, b = ex.b as number, x = 10 - a, y = 10 - b;
      return [
        ["deficiencies", `10−${a}=${x},  10−${b}=${y}`],
        ["cross-subtract ×10", `(${a}−${y})×10 = ${(a - y) * 10}`],
        ["deficiencies × each other", `${x}×${y} = ${x * y}`],
        ["add", `${(a - y) * 10} + ${x * y} = ${a * b}`],
      ];
    },
    gen: (diff) => {
      const lo = diff === "easy" ? 6 : diff === "medium" ? 3 : 1, hi = 9;
      const a = ri(lo, hi), b = ri(lo, hi);
      return { prompt: `${a} × ${b}`, answer: a * b };
    },
  },
  {
    id: "baseAbove10",
    icon: "↗",
    grad: ["#9B3AE6", "#E33AC0"],
    illus: "ladder",
    title: "Base Method — Above 10",
    sutraSa: "Nikhilam Navatáścaramam Daśataḥ",
    sutraEn: "work with the excess, not the number",
    blurb: "For numbers just over 10, work with how far past 10 they are.",
    steps: [
      "Find each number's excess over 10 (the number minus 10).",
      "Cross-add: number + other's excess, ×10.",
      "Multiply the two excesses together.",
      "Add the two parts for the answer.",
    ],
    example: () => ({ a: 12, b: 13 }),
    exSteps: (ex) => {
      const a = ex.a as number, b = ex.b as number, x = a - 10, y = b - 10;
      return [
        ["excesses", `${a}−10=${x},  ${b}−10=${y}`],
        ["cross-add ×10", `(${a}+${y})×10 = ${(a + y) * 10}`],
        ["excesses × each other", `${x}×${y} = ${x * y}`],
        ["add", `${(a + y) * 10} + ${x * y} = ${a * b}`],
      ];
    },
    gen: (diff) => {
      const hi = diff === "easy" ? 14 : diff === "medium" ? 17 : 19;
      const a = ri(11, hi), b = ri(11, hi);
      return { prompt: `${a} × ${b}`, answer: a * b };
    },
  },
  {
    id: "square5",
    icon: "²",
    grad: ["#FFC93C", "#FF9F1C"],
    illus: "squaregrid",
    title: "Squaring 5‑Ending Numbers",
    sutraSa: "Ekadhikena Pūrvena",
    sutraEn: "one more than the one before",
    blurb: 'n5² is always "n times (n+1), then 25" — no long multiplication needed.',
    steps: [
      "Drop the 5 — call the front part n.",
      "Multiply n by (n + 1).",
      "Write 25 right after that result.",
      "That's the whole square.",
    ],
    example: () => ({ n: 7 }),
    exSteps: (ex) => {
      const n = ex.n as number;
      return [
        ["front part", `${n}`],
        [`${n} × ${n + 1}`, `= ${n * (n + 1)}`],
        ["append 25", `${n * (n + 1)}25  →  ${n * (n + 1) * 100 + 25}`],
      ];
    },
    gen: (diff) => {
      const n = diff === "easy" ? ri(1, 9) : diff === "medium" ? ri(1, 19) : ri(1, 49);
      const num = n * 10 + 5;
      return { prompt: `${num}²`, answer: num * num };
    },
  },
  {
    id: "subFromPower10",
    icon: "−",
    grad: ["#5865F2", "#8E7BFF"],
    illus: "ladder",
    title: "Subtracting from 1,000s",
    sutraSa: "Nikhilam Navatáścaramam Daśataḥ",
    sutraEn: "all from 9, the last from 10",
    blurb: "Subtracting from a clean power of 10? Skip the borrowing entirely.",
    steps: [
      "Line the number up against all-9s (one less than the power of 10).",
      "Subtract every digit from 9 — except the last.",
      "Subtract the last digit from 10 instead.",
      "Read the digits together — done, no borrowing.",
    ],
    example: () => ({ base: 1000, x: 457 }),
    exSteps: (ex) => {
      const base = ex.base as number, x = ex.x as number;
      const s = String(x).padStart(String(base - 1).length, "0");
      const out = s.split("").map((c, i) => (i === s.length - 1 ? 10 - +c : 9 - +c));
      return [
        [`digits of ${x}`, s.split("").join(" ")],
        ["9,9,…,10 minus each digit", out.join(" ")],
        ["read together", `${out.join("")}  →  ${base - x}`],
      ];
    },
    gen: (diff) => {
      const base = diff === "easy" ? 1000 : diff === "medium" ? 10000 : 100000;
      const x = ri(Math.floor(base / 10) + 1, base - 1);
      return { prompt: `${fmt(base)} − ${fmt(x)}`, answer: base - x };
    },
  },
  {
    id: "div9",
    icon: "÷",
    grad: ["#16A085", "#52D68A"],
    illus: "loop",
    title: "Dividing 2-Digit Numbers by 9",
    sutraSa: "Corollary · Nikhilam",
    sutraEn: "the digits nearly give the answer",
    blurb: "For a 2-digit number ÷ 9, the first digit is (almost) your quotient.",
    steps: [
      "Split the number into its tens and units digit.",
      "The tens digit is your starting quotient.",
      "Add the units digit to the tens digit for the remainder.",
      "If that remainder reaches 9 or more, bump the quotient up by 1 and subtract 9 from the remainder.",
    ],
    example: () => ({ n: 23 }),
    exSteps: (ex) => {
      const n = ex.n as number;
      const t = Math.floor(n / 10), u = n % 10;
      let q = t, r = t + u;
      if (r >= 9) {
        q++;
        r -= 9;
      }
      return [
        ["digits", `${t} and ${u}`],
        [`remainder = ${t}+${u}`, `= ${t + u}`],
        ["quotient / remainder", `${q} remainder ${r}  (${n} ÷ 9)`],
      ];
    },
    gen: () => {
      const n = ri(11, 99);
      return { prompt: `${n} ÷ 9  (quotient, rounded down)`, answer: Math.floor(n / 9) };
    },
  },
  {
    id: "digitsum",
    icon: "Σ",
    grad: ["#FF4E9E", "#B14EFF"],
    illus: "loop",
    title: "Digit-Sum Check",
    sutraSa: "Chapter · Digit Sum (DS)",
    sutraEn: "cast out nines to check your work",
    blurb: "Add a number's digits down to a single digit — Vedic teachers use this to verify big calculations fast.",
    steps: [
      "Add up all the digits of the number.",
      "If the total is more than one digit, add its digits again.",
      "Keep going until one digit remains — that's the digit sum.",
    ],
    example: () => ({ n: 4859 }),
    exSteps: (ex) => {
      const n = ex.n as number;
      const s = String(n)
        .split("")
        .reduce((a, c) => a + +c, 0);
      return [
        [`digits of ${n}`, `${String(n).split("").join(" + ")} = ${s}`],
        [
          "single digit?",
          s > 9 ? `${String(s).split("").join("+")} = ${1 + ((s - 1) % 9)}` : `yes → ${s}`,
        ],
      ];
    },
    gen: (diff) => {
      const n = diff === "easy" ? ri(10, 99) : diff === "medium" ? ri(100, 9999) : ri(1000, 999999);
      const ds = n === 0 ? 0 : 1 + ((n - 1) % 9);
      return { prompt: `Digit sum of ${fmt(n)}`, answer: ds };
    },
  },
];

export const TOPIC_BY_ID: Record<string, Topic> = Object.fromEntries(
  TOPICS.map((t) => [t.id, t])
);

export function gradCss(g: [string, string]) {
  return `linear-gradient(135deg,${g[0]},${g[1]})`;
}

/* ---- distractor generator (shared by all tap-based question modes) ---- */
export function makeDistractors(correct: number, howMany: number): number[] {
  const pool = new Set<number>();
  let tries = 0;
  while (pool.size < howMany && tries < 60) {
    tries++;
    const strategy = ri(0, 3);
    let d: number;
    if (strategy === 0) d = correct + ri(1, 9) * (Math.random() < 0.5 ? 1 : -1);
    else if (strategy === 1) d = correct + ri(1, 3) * 10 * (Math.random() < 0.5 ? 1 : -1);
    else if (strategy === 2) {
      const s = String(Math.abs(correct));
      if (s.length >= 2) {
        const arr = s.split("");
        const i = ri(0, arr.length - 2);
        [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
        d = parseInt(arr.join(""), 10) * (correct < 0 ? -1 : 1);
      } else d = correct + ri(1, 5);
    } else d = correct + ri(-20, 20);
    if (d !== correct && !pool.has(d)) pool.add(d);
  }
  let offset = 1;
  while (pool.size < howMany) {
    if (correct + offset !== correct && !pool.has(correct + offset)) pool.add(correct + offset);
    offset++;
  }
  return Array.from(pool).slice(0, howMany);
}

export const STAGE_COUNT = 5;
export const STAGE_DIFF: Difficulty[] = ["easy", "easy", "medium", "medium", "hard"];
export const QUESTIONS_PER_STAGE = 5;
export const PASS_THRESHOLD = 3;

export const RANKS: [number, string][] = [
  [1, "Newcomer"],
  [3, "Apprentice"],
  [5, "Ganitin"],
  [8, "Sutra Sādhaka"],
  [12, "Vedic Scholar"],
  [999, "Grandmaster"],
];
export function rankFor(level: number) {
  for (let i = 0; i < RANKS.length; i++) {
    if (level < RANKS[i][0]) return RANKS[Math.max(0, i - 1)][1];
  }
  return RANKS[RANKS.length - 1][1];
}
