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
  {
    id: "mult9", icon: "✕", grad: ["#F4511E", "#FFB74D"], illus: "loop",
    title: "Multiplying by 9",
    sutraSa: "Corollary · Ekanyūnena Pūrvena",
    sutraEn: "ten times, then one less",
    blurb: "×9 is just ×10 with the original number taken back off once.",
    steps: ["Multiply the number by 10.", "Subtract the original number once.", "That's the answer — no long multiplication needed."],
    example: () => ({ n: 23 }),
    exSteps: (ex) => {
      const n = ex.n as number;
      return [[`${n} × 10`, `= ${n * 10}`], [`${n * 10} − ${n}`, `= ${n * 9}`]];
    },
    gen: (diff) => {
      const n = diff === "easy" ? ri(2, 9) : diff === "medium" ? ri(10, 99) : ri(100, 999);
      return { prompt: `${n} × 9`, answer: n * 9 };
    },
  },
  {
    id: "mult111", icon: "✕", grad: ["#00897B", "#4DD0C4"], illus: "grid",
    title: "Multiplying by 111",
    sutraSa: "Corollary · Ekadhikena",
    sutraEn: "spread the digit-sum twice",
    blurb: "For a 2-digit number, ×111 slots the digit-sum into both middle spots.",
    steps: ["Write the first digit.", "Write the digit-sum twice in the middle.", "Write the last digit.", "Carry into the neighbour if a middle sum reaches 10."],
    example: () => ({ n: 12 }),
    exSteps: (ex) => {
      const n = ex.n as number, a = Math.floor(n / 10), b = n % 10, s = a + b;
      return [[`digits of ${n}`, `${a} and ${b}`], [`sum ${a}+${b}`, `= ${s}`], ["slot it twice", `${a} ${s} ${s} ${b}  →  ${n * 111}`]];
    },
    gen: (diff) => {
      let n: number;
      if (diff === "easy") { do { n = ri(10, 89); } while (Math.floor(n / 10) + (n % 10) >= 10); }
      else if (diff === "medium") { n = ri(10, 99); }
      else { n = ri(100, 999); }
      return { prompt: `${n} × 111`, answer: n * 111 };
    },
  },
  {
    id: "balancing", icon: "⚖", grad: ["#6D4C41", "#BCAAA4"], illus: "ladder",
    title: "The Balancing Method",
    sutraSa: "Corollary · Yavadunam",
    sutraEn: "balance two numbers around their middle",
    blurb: "When two numbers sit the same distance above and below a round middle, their product is just a difference of squares.",
    steps: ["Find the round number exactly between the two.", "Find how far each one is from that middle — the same distance both ways.", "Square the middle number.", "Subtract the distance squared."],
    example: () => ({ base: 50, d: 4 }),
    exSteps: (ex) => {
      const base = ex.base as number, d = ex.d as number;
      return [
        [`middle of ${base - d} and ${base + d}`, `${base}`],
        [`${base}²`, `= ${base * base}`],
        [`${d}²`, `= ${d * d}`],
        ["subtract", `${base * base} − ${d * d} = ${base * base - d * d}`],
      ];
    },
    gen: (diff) => {
      const base = 10 * (diff === "easy" ? ri(3, 9) : diff === "medium" ? ri(10, 60) : ri(20, 90));
      const d = diff === "easy" ? ri(1, 4) : diff === "medium" ? ri(1, 9) : ri(1, Math.min(20, base - 1));
      const a = base - d, b = base + d;
      return { prompt: `${a} × ${b}`, answer: base * base - d * d };
    },
  },
  {
    id: "baseBelow100", icon: "↘", grad: ["#C2185B", "#F06292"], illus: "ladder",
    title: "Base Method — Below 100",
    sutraSa: "Nikhilam Navatáścaramam Daśataḥ",
    sutraEn: "all from 9, the last from 10 — base 100",
    blurb: "The same deficiency trick as base 10, just measured against 100.",
    steps: ["Find each number's deficiency from 100.", "Cross-subtract: number − other's deficiency, ×100.", "Multiply the two deficiencies together.", "Add the two parts for the answer."],
    example: () => ({ a: 96, b: 98 }),
    exSteps: (ex) => {
      const a = ex.a as number, b = ex.b as number, x = 100 - a, y = 100 - b;
      return [
        ["deficiencies", `100−${a}=${x},  100−${b}=${y}`],
        ["cross-subtract ×100", `(${a}−${y})×100 = ${(a - y) * 100}`],
        ["deficiencies × each other", `${x}×${y} = ${x * y}`],
        ["add", `${(a - y) * 100} + ${x * y} = ${a * b}`],
      ];
    },
    gen: (diff) => {
      const lo = diff === "easy" ? 96 : diff === "medium" ? 90 : 80;
      const a = ri(lo, 99), b = ri(lo, 99);
      return { prompt: `${a} × ${b}`, answer: a * b };
    },
  },
  {
    id: "baseAbove100", icon: "↗", grad: ["#5E35B1", "#9575CD"], illus: "ladder",
    title: "Base Method — Above 100",
    sutraSa: "Nikhilam Navatáścaramam Daśataḥ",
    sutraEn: "work with the excess over 100",
    blurb: "For numbers just over 100, work with how far past 100 they are.",
    steps: ["Find each number's excess over 100.", "Cross-add: number + other's excess, ×100.", "Multiply the two excesses together.", "Add the two parts for the answer."],
    example: () => ({ a: 102, b: 104 }),
    exSteps: (ex) => {
      const a = ex.a as number, b = ex.b as number, x = a - 100, y = b - 100;
      return [
        ["excesses", `${a}−100=${x},  ${b}−100=${y}`],
        ["cross-add ×100", `(${a}+${y})×100 = ${(a + y) * 100}`],
        ["excesses × each other", `${x}×${y} = ${x * y}`],
        ["add", `${(a + y) * 100} + ${x * y} = ${a * b}`],
      ];
    },
    gen: (diff) => {
      const hi = diff === "easy" ? 104 : diff === "medium" ? 112 : 130;
      const a = ri(101, hi), b = ri(101, hi);
      return { prompt: `${a} × ${b}`, answer: a * b };
    },
  },
  {
    id: "generalMult2d", icon: "⊞", grad: ["#1976D2", "#64B5F6"], illus: "grid",
    title: "General Multiplication (2D×2D)",
    sutraSa: "Ūrdhva-Tiryagbhyām",
    sutraEn: "vertically and crosswise, for any two numbers",
    blurb: "The universal cross-multiplication method — works for any two numbers, special pattern or not.",
    steps: ["Multiply the units digits — that's the last part.", "Cross-multiply and add: (tens₁×units₂) + (units₁×tens₂) — the middle part.", "Multiply the tens digits — the first part.", "Add the three parts, shifting each one a place to the left."],
    example: () => ({ a: 34, b: 52 }),
    exSteps: (ex) => {
      const a = ex.a as number, b = ex.b as number;
      const a1 = Math.floor(a / 10), a0 = a % 10, b1 = Math.floor(b / 10), b0 = b % 10;
      const units = a0 * b0, cross = a1 * b0 + a0 * b1, tens = a1 * b1;
      return [
        [`units ${a0}×${b0}`, `= ${units}`],
        [`cross ${a1}×${b0} + ${a0}×${b1}`, `= ${cross}`],
        [`tens ${a1}×${b1}`, `= ${tens}`],
        ["combine", `${tens}00 + ${cross}0 + ${units} = ${a * b}`],
      ];
    },
    gen: (diff) => {
      const lo = diff === "easy" ? 10 : diff === "medium" ? 10 : 40;
      const hi = diff === "easy" ? 30 : diff === "medium" ? 99 : 99;
      const a = ri(lo, hi), b = ri(lo, hi);
      return { prompt: `${a} × ${b}`, answer: a * b };
    },
  },
  {
    id: "additionGeneral", icon: "➕", grad: ["#43A047", "#A5D6A7"], illus: "numberline",
    title: "Mental Addition — General Method",
    sutraSa: "Sankalana-Vyavakalanabhyām",
    sutraEn: "add from the left, running total as you go",
    blurb: "Add left to right, keeping a running total — no carrying columns from the right.",
    steps: ["Start with the leftmost place values.", "Add them and fold the result into a running total.", "Bring in the next place value and add again.", "Keep going until every digit has been added in."],
    example: () => ({ a: 342, b: 256 }),
    exSteps: (ex) => {
      const a = ex.a as number, b = ex.b as number;
      const sa = String(a), sb = String(b), len = Math.max(sa.length, sb.length);
      const pa = sa.padStart(len, "0"), pb = sb.padStart(len, "0");
      let running = 0;
      const rows: ExStep[] = [];
      for (let i = 0; i < len; i++) {
        const place = Math.pow(10, len - 1 - i);
        const da = +pa[i], db = +pb[i];
        running += (da + db) * place;
        rows.push([`+${da * place || da} and +${db * place || db}`, `running total = ${running}`]);
      }
      return rows;
    },
    gen: (diff) => {
      const digits = diff === "easy" ? 2 : diff === "medium" ? 3 : 4;
      const lo = Math.pow(10, digits - 1), hi = Math.pow(10, digits) - 1;
      const a = ri(lo, hi), b = ri(lo, hi);
      return { prompt: `${a} + ${b}`, answer: a + b };
    },
  },
  {
    id: "subtractionGeneral", icon: "➖", grad: ["#EF6C00", "#FFB74D"], illus: "numberline",
    title: "Mental Subtraction — General Method",
    sutraSa: "Sankalana-Vyavakalanabhyām",
    sutraEn: "subtract from the left, place by place",
    blurb: "Subtract left to right the same way — take each place value off a running total.",
    steps: ["Start the running total at the first number.", "Take off the leftmost place value of the second number.", "Take off the next place value.", "Keep going until every digit has been subtracted."],
    example: () => ({ a: 583, b: 241 }),
    exSteps: (ex) => {
      const a = ex.a as number, b = ex.b as number;
      const sb = String(b), len = sb.length;
      const pb = sb.padStart(len, "0");
      let running = a;
      const rows: ExStep[] = [[`start at ${a}`, `running total = ${a}`]];
      for (let i = 0; i < len; i++) {
        const place = Math.pow(10, len - 1 - i);
        const db = +pb[i];
        running -= db * place;
        rows.push([`−${db * place || db}`, `running total = ${running}`]);
      }
      return rows;
    },
    gen: (diff) => {
      const digits = diff === "easy" ? 2 : diff === "medium" ? 3 : 4;
      const lo = Math.pow(10, digits - 1), hi = Math.pow(10, digits) - 1;
      const b = ri(lo, hi), a = ri(b + 1, hi + Math.floor(hi / 2));
      return { prompt: `${a} − ${b}`, answer: a - b };
    },
  },
  {
    id: "subOtherThan10s", icon: "−", grad: ["#455A64", "#90A4AE"], illus: "ladder",
    title: "Subtraction — Beyond Round Numbers",
    sutraSa: "Corollary · Nikhilam",
    sutraEn: "add the complement, then remove the base",
    blurb: "To subtract any number, add its complement to the next power of ten, then take that power of ten back off.",
    steps: ["Find the complement of the number being subtracted — what completes it to the next power of ten.", "Add that complement to the first number.", "Subtract that same power of ten from the result.", "That's the answer — no borrowing needed."],
    example: () => ({ a: 523, b: 278 }),
    exSteps: (ex) => {
      const a = ex.a as number, b = ex.b as number;
      const k = String(b).length, base = Math.pow(10, k), comp = base - b;
      return [
        [`complement of ${b}`, `${base} − ${b} = ${comp}`],
        [`add to ${a}`, `${a} + ${comp} = ${a + comp}`],
        [`subtract ${base}`, `${a + comp} − ${base} = ${a + comp - base}`],
      ];
    },
    gen: (diff) => {
      const k = diff === "easy" ? 2 : diff === "medium" ? 3 : 4;
      const base = Math.pow(10, k);
      const b = ri(Math.floor(base / 10) + 1, base - 1);
      const a = ri(b + 1, b + base * 2);
      return { prompt: `${a} − ${b}`, answer: a - b };
    },
  },
  {
    id: "div8", icon: "÷", grad: ["#00838F", "#4DD0E1"], illus: "loop",
    title: "Dividing by 8",
    sutraSa: "Corollary · Nikhilam",
    sutraEn: "halve it three times",
    blurb: "Dividing by 8 is just halving a number three times in a row.",
    steps: ["Halve the number.", "Halve it again.", "Halve it a third time — that's n ÷ 8.", "If it doesn't divide evenly, work from the nearest multiple of 8 below it and note the remainder."],
    example: () => ({ n: 96 }),
    exSteps: (ex) => {
      const n = ex.n as number, h1 = n / 2, h2 = h1 / 2, h3 = h2 / 2;
      return [[`${n} ÷ 2`, `= ${h1}`], [`${h1} ÷ 2`, `= ${h2}`], [`${h2} ÷ 2`, `= ${h3}`]];
    },
    gen: (diff) => {
      const n = diff === "easy" ? ri(16, 199) : diff === "medium" ? ri(100, 999) : ri(1000, 9999);
      return { prompt: `${n} ÷ 8  (quotient, rounded down)`, answer: Math.floor(n / 8) };
    },
  },
  {
    id: "squareStart5", icon: "²", grad: ["#D81B60", "#F48FB1"], illus: "squaregrid",
    title: "Squaring Numbers Starting with 5",
    sutraSa: "Corollary · (a+b)² identity",
    sutraEn: "25, then double, then the tail squared",
    blurb: "Any number that starts with a 5 squares the same clean way, no matter how many digits follow.",
    steps: ["Split the number into the leading 5 (times a power of ten) and the rest, x.", "\"25\" followed by the right number of zeros is the first part.", "x times the next power of ten up is the middle part.", "x² is the last part — add all three together."],
    example: () => ({ k: 1, x: 2 }),
    exSteps: (ex) => {
      const k = ex.k as number, x = ex.x as number;
      const num = 5 * Math.pow(10, k) + x;
      const first = 25 * Math.pow(10, 2 * k), mid = x * Math.pow(10, k + 1), last = x * x;
      return [
        [`25 followed by ${2 * k} zeros`, `${first}`],
        [`${x} × 10^${k + 1}`, `= ${mid}`],
        [`${x}²`, `= ${last}`],
        ["add all three", `${num * num}`],
      ];
    },
    gen: (diff) => {
      const k = diff === "easy" ? 1 : diff === "medium" ? 2 : 3;
      const x = ri(0, Math.pow(10, k) - 1);
      const num = 5 * Math.pow(10, k) + x;
      return { prompt: `${num}²`, answer: num * num };
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
