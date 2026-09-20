export type Difficulty = "easy" | "medium" | "hard";
export type Lang = "en" | "ja";

export type Problem = { prompt: string; answer: number };

export type ExStep = [string, string];

export type Topic = {
  id: string;
  icon: string;
  grad: [string, string];
  illus: "numberline" | "grid" | "ladder" | "squaregrid" | "loop";
  title: string;
  titleJa: string;
  sutraSa: string;
  sutraEn: string;
  sutraEnJa: string;
  blurb: string;
  blurbJa: string;
  steps: string[];
  stepsJa: string[];
  example: () => Record<string, number | string>;
  exSteps: (ex: Record<string, number | string>, lang: Lang) => ExStep[];
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
    titleJa: "9で終わる数の足し算",
    sutraSa: "Ekadhikena Pūrvena",
    sutraEn: "one more than the one before",
    sutraEnJa: "一つ前より1多い",
    blurb: "Round the 9-ending number up to the next ten, add, then step back by one.",
    blurbJa: "9で終わる数を次の10の位に切り上げて足し、最後に1を戻します。",
    steps: [
      "Spot the number ending in 9.",
      "Round it up to the next multiple of 10 (add 1).",
      "Add the rounded number to the other one.",
      "Subtract 1 from that total to undo the rounding.",
    ],
    stepsJa: [
      "9で終わる数を見つける。",
      "次の10の倍数に切り上げる（1を足す）。",
      "切り上げた数をもう一方の数に足す。",
      "切り上げた分の1を引いて戻す。",
    ],
    example: () => ({ a: 47, b: 29 }),
    exSteps: (ex, lang) => {
      const a = ex.a as number, b = ex.b as number;
      if (lang === "ja")
        return [
          [`${a} + ${b}`, "="],
          [`${b} を ${b + 1} に切り上げ`, `${a} + ${b + 1} = ${a + b + 1}`],
          ["1戻す", `${a + b + 1} − 1 = ${a + b}`],
        ];
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
    titleJa: "9で終わる数の引き算",
    sutraSa: "Ekanyūnena Pūrvena",
    sutraEn: "one less than the one before",
    sutraEnJa: "一つ前より1少ない",
    blurb: "Round the 9-ending number up to the next ten, subtract, then give one back.",
    blurbJa: "引く数（9で終わる）を次の10の位に切り上げて引き、最後に1を足し戻します。",
    steps: [
      "Spot the number being subtracted, ending in 9.",
      "Round it up to the next multiple of 10 (add 1).",
      "Subtract that rounder number instead.",
      "Add 1 back to the result to correct it.",
    ],
    stepsJa: [
      "引かれる数の中で9で終わる数を見つける。",
      "次の10の倍数に切り上げる（1を足す）。",
      "その切り上げた数で代わりに引く。",
      "結果に1を足し戻して修正する。",
    ],
    example: () => ({ a: 84, b: 39 }),
    exSteps: (ex, lang) => {
      const a = ex.a as number, b = ex.b as number;
      if (lang === "ja")
        return [
          [`${a} − ${b}`, "="],
          [`${b} を ${b + 1} に切り上げ`, `${a} − ${b + 1} = ${a - b - 1}`],
          ["1を足し戻す", `${a - b - 1} + 1 = ${a - b}`],
        ];
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
    titleJa: "±8で終わる数",
    sutraSa: "Ekadhikena, extended",
    sutraEn: "round by two, not one",
    sutraEnJa: "1ではなく2で切り上げる",
    blurb: "Numbers ending in 8 work the same way — just round by 2 instead of 1.",
    blurbJa: "8で終わる数も同じ方法で――ただし2ずつ切り上げます。",
    steps: [
      "Spot the number ending in 8.",
      "Round it up to the next multiple of 10 (add 2).",
      "Add or subtract using the rounder number.",
      "Undo the rounding: subtract 2 (if adding) or add 2 back (if subtracting).",
    ],
    stepsJa: [
      "8で終わる数を見つける。",
      "次の10の倍数に切り上げる（2を足す）。",
      "切り上げた数で足し算・引き算をする。",
      "切り上げを戻す：足し算なら2を引き、引き算なら2を足し戻す。",
    ],
    example: () => ({ a: 56, b: 48, op: "+" }),
    exSteps: (ex, lang) => {
      const a = ex.a as number, b = ex.b as number, op = ex.op as string;
      if (lang === "ja") {
        if (op === "+")
          return [
            [`${a} + ${b}`, "="],
            [`${b} を ${b + 2} に切り上げ`, `${a} + ${b + 2} = ${a + b + 2}`],
            ["2戻す", `${a + b + 2} − 2 = ${a + b}`],
          ];
        return [
          [`${a} − ${b}`, "="],
          [`${b} を ${b + 2} に切り上げ`, `${a} − ${b + 2} = ${a - b - 2}`],
          ["2を足し戻す", `${a - b - 2} + 2 = ${a - b}`],
        ];
      }
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
    titleJa: "11をかける",
    sutraSa: "Corollary · Ekadhikena",
    sutraEn: "slot the digit-sum in the middle",
    sutraEnJa: "数字の合計を真ん中に入れる",
    blurb: "Keep the outer digits, drop their sum in between — carry if it overflows.",
    blurbJa: "外側の数字はそのまま、その合計を真ん中に入れます――10以上になったら繰り上げます。",
    steps: [
      "Write the first digit of the number.",
      "Write the sum of the two digits next to it (this is the middle digit).",
      "Write the last digit.",
      "If the middle sum is 10 or more, carry the 1 into the first digit.",
    ],
    stepsJa: [
      "数の最初の桁を書く。",
      "2つの桁の合計を隣に書く（これが真ん中の桁）。",
      "最後の桁を書く。",
      "真ん中の合計が10以上なら、1を最初の桁に繰り上げる。",
    ],
    example: () => ({ n: 24 }),
    exSteps: (ex, lang) => {
      const n = ex.n as number, a = Math.floor(n / 10), b = n % 10;
      if (lang === "ja")
        return [
          [`${n} の各桁`, `${a} と ${b}`],
          [`合計 ${a}+${b}`, `= ${a + b}`],
          ["真ん中に入れる", `${a} ${a + b} ${b}  →  ${n * 11}`],
        ];
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
    titleJa: "十の位が同じ、一の位の合計が10",
    sutraSa: "Corollary · Ůrdhva-Tiryagbhyām",
    sutraEn: "multiply the units, bump the tens",
    sutraEnJa: "一の位をかけて、十の位を1つ増やす",
    blurb: "When both numbers share a tens digit and their units add to 10 — e.g. 23×27 — multiply in two clean chunks.",
    blurbJa: "2つの数の十の位が同じで、一の位の合計が10のとき（例 23×27）は、2つの計算だけで求められます。",
    steps: [
      "Check: same tens digit, and units add to 10.",
      "Multiply the tens digit by (itself + 1).",
      "Multiply the two units digits (pad to 2 digits if needed).",
      "Place the second result right after the first — that's your answer.",
    ],
    stepsJa: [
      "確認：十の位が同じで、一の位の合計が10であること。",
      "十の位の数に（自分＋1）をかける。",
      "2つの一の位をかける（2桁になるよう0を足す）。",
      "2つの結果を並べる――それが答え。",
    ],
    example: () => ({ t: 2, u1: 3, u2: 7 }),
    exSteps: (ex, lang) => {
      const t = ex.t as number, u1 = ex.u1 as number, u2 = ex.u2 as number;
      if (lang === "ja")
        return [
          [`十の位 ${t} × (${t}+1)`, `= ${t * (t + 1)}`],
          [`一の位 ${u1} × ${u2}`, `= ${pad2(u1 * u2)}`],
          ["組み合わせる", `${t * (t + 1)}${pad2(u1 * u2)}  →  ${t * (t + 1) * 100 + u1 * u2}`],
        ];
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
    titleJa: "一の位が同じ、十の位の合計が10",
    sutraSa: "Corollary · Ůrdhva-Tiryagbhyām",
    sutraEn: "cross-multiply the tens",
    sutraEnJa: "十の位を交差してかける",
    blurb: "When both numbers share a units digit and their tens add to 10 — e.g. 23×83 — another two-chunk shortcut.",
    blurbJa: "2つの数の一の位が同じで、十の位の合計が10のとき（例 23×83）――もう一つの2ステップの近道です。",
    steps: [
      "Check: same units digit, and tens add to 10.",
      "Multiply the two tens digits and add the shared unit.",
      "Square the shared units digit (pad to 2 digits if needed).",
      "Place the second result right after the first.",
    ],
    stepsJa: [
      "確認：一の位が同じで、十の位の合計が10であること。",
      "2つの十の位をかけて、共通の一の位を足す。",
      "共通の一の位を2乗する（2桁になるよう0を足す）。",
      "2つの結果を並べる。",
    ],
    example: () => ({ t1: 2, t2: 8, u: 3 }),
    exSteps: (ex, lang) => {
      const t1 = ex.t1 as number, t2 = ex.t2 as number, u = ex.u as number;
      if (lang === "ja")
        return [
          [`十の位 ${t1}×${t2} + ${u}`, `= ${t1 * t2 + u}`],
          [`一の位 ${u}×${u}`, `= ${pad2(u * u)}`],
          ["組み合わせる", `${t1 * t2 + u}${pad2(u * u)}  →  ${(t1 * t2 + u) * 100 + u * u}`],
        ];
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
    titleJa: "どちらも1◯（11〜19）で始まる数",
    sutraSa: "Corollary · Ůrdhva-Tiryagbhyām",
    sutraEn: "cross-add, then multiply the tails",
    sutraEnJa: "一の位を足してからかける",
    blurb: "For any 11–19 × 11–19: add the units crosswise, then multiply the units.",
    blurbJa: "11〜19 × 11〜19 なら：一の位を足し合わせてから、一の位どうしをかけます。",
    steps: [
      'Take the two "extra" digits past 10 (e.g. 14 → 4).',
      "Add 100 (10×10) as the base.",
      "Add 10 × (sum of the two extra digits).",
      "Add the product of the two extra digits.",
    ],
    stepsJa: [
      "10を超えた「余りの数字」を取り出す（例 14 → 4）。",
      "基準の100（10×10）を足す。",
      "10 ×（2つの余りの合計）を足す。",
      "2つの余りの積を足す。",
    ],
    example: () => ({ x: 4, y: 3 }),
    exSteps: (ex, lang) => {
      const x = ex.x as number, y = ex.y as number;
      if (lang === "ja")
        return [
          ["基準 10×10", "= 100"],
          [`10 × (${x}+${y})`, `= ${10 * (x + y)}`],
          [`余り ${x}×${y}`, `= ${x * y}`],
          ["合計", `100 + ${10 * (x + y)} + ${x * y} = ${100 + 10 * (x + y) + x * y}`],
        ];
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
    titleJa: "12〜19をかける",
    sutraSa: "Corollary · Ůrdhva-Tiryagbhyām",
    sutraEn: "split into tens and the extra",
    sutraEnJa: "10とあまりに分ける",
    blurb: "Multiplying by a teen number? Split it into ×10 plus ×(the extra digit).",
    blurbJa: "10代の数をかけるときは、×10 と ×（あまりの数字）に分けます。",
    steps: [
      "Write the multiplier as 10 + d.",
      "Multiply the number by 10.",
      "Multiply the number by d.",
      "Add the two together.",
    ],
    stepsJa: [
      "かける数を 10 + d と書く。",
      "元の数に10をかける。",
      "元の数にdをかける。",
      "2つの結果を足す。",
    ],
    example: () => ({ n: 34, d: 4 }),
    exSteps: (ex, lang) => {
      const n = ex.n as number, d = ex.d as number;
      if (lang === "ja")
        return [
          [`${n} × 10`, `= ${n * 10}`],
          [`${n} × ${d}`, `= ${n * d}`],
          ["足す", `${n * 10} + ${n * d} = ${n * 10 + n * d}`],
        ];
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
    titleJa: "基準数法 — 10未満",
    sutraSa: "Nikhilam Navatáścaramam Daśataḥ",
    sutraEn: "all from 9, the last from 10",
    sutraEnJa: "9からすべて引き、最後は10から引く",
    blurb: "For numbers just under 10, work with how far short of 10 they are.",
    blurbJa: "10に近い数字は、10からどれだけ不足しているかで計算します。",
    steps: [
      "Find each number's deficiency from 10 (10 minus the number).",
      "Cross-subtract: number − other's deficiency, ×10.",
      "Multiply the two deficiencies together.",
      "Add the two parts for the answer.",
    ],
    stepsJa: [
      "それぞれの数の10からの不足数を求める（10−その数）。",
      "交差減算：数 −（相手の不足数）、それを×10する。",
      "2つの不足数をかける。",
      "2つの部分を足して答えにする。",
    ],
    example: () => ({ a: 7, b: 8 }),
    exSteps: (ex, lang) => {
      const a = ex.a as number, b = ex.b as number, x = 10 - a, y = 10 - b;
      if (lang === "ja")
        return [
          ["不足数", `10−${a}=${x}、  10−${b}=${y}`],
          ["交差減算 ×10", `(${a}−${y})×10 = ${(a - y) * 10}`],
          ["不足数どうしをかける", `${x}×${y} = ${x * y}`],
          ["足す", `${(a - y) * 10} + ${x * y} = ${a * b}`],
        ];
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
    titleJa: "基準数法 — 10より大きい",
    sutraSa: "Nikhilam Navatáścaramam Daśataḥ",
    sutraEn: "work with the excess, not the number",
    sutraEnJa: "数そのものではなく超過数で計算する",
    blurb: "For numbers just over 10, work with how far past 10 they are.",
    blurbJa: "10をわずかに超える数は、10からどれだけ超えているかで計算します。",
    steps: [
      "Find each number's excess over 10 (the number minus 10).",
      "Cross-add: number + other's excess, ×10.",
      "Multiply the two excesses together.",
      "Add the two parts for the answer.",
    ],
    stepsJa: [
      "それぞれの数の10からの超過数を求める（その数−10）。",
      "交差加算：数 ＋（相手の超過数）、それを×10する。",
      "2つの超過数をかける。",
      "2つの部分を足して答えにする。",
    ],
    example: () => ({ a: 12, b: 13 }),
    exSteps: (ex, lang) => {
      const a = ex.a as number, b = ex.b as number, x = a - 10, y = b - 10;
      if (lang === "ja")
        return [
          ["超過数", `${a}−10=${x}、  ${b}−10=${y}`],
          ["交差加算 ×10", `(${a}+${y})×10 = ${(a + y) * 10}`],
          ["超過数どうしをかける", `${x}×${y} = ${x * y}`],
          ["足す", `${(a + y) * 10} + ${x * y} = ${a * b}`],
        ];
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
    titleJa: "5で終わる数の2乗",
    sutraSa: "Ekadhikena Pūrvena",
    sutraEn: "one more than the one before",
    sutraEnJa: "一つ前より1多い",
    blurb: 'n5² is always "n times (n+1), then 25" — no long multiplication needed.',
    blurbJa: "n5²は必ず「n×(n+1)のあとに25」を書くだけ――筆算のかけ算は不要です。",
    steps: [
      "Drop the 5 — call the front part n.",
      "Multiply n by (n + 1).",
      "Write 25 right after that result.",
      "That's the whole square.",
    ],
    stepsJa: [
      "5を外し、残りの数をnとする。",
      "n×(n+1)を計算する。",
      "その結果の後ろに25を書く。",
      "それで2乗の答え全体になる。",
    ],
    example: () => ({ n: 7 }),
    exSteps: (ex, lang) => {
      const n = ex.n as number;
      if (lang === "ja")
        return [
          ["前の部分", `${n}`],
          [`${n} × ${n + 1}`, `= ${n * (n + 1)}`],
          ["25を付ける", `${n * (n + 1)}25  →  ${n * (n + 1) * 100 + 25}`],
        ];
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
    titleJa: "1000などのべき乗数からの引き算",
    sutraSa: "Nikhilam Navatáścaramam Daśataḥ",
    sutraEn: "all from 9, the last from 10",
    sutraEnJa: "9からすべて引き、最後は10から引く",
    blurb: "Subtracting from a clean power of 10? Skip the borrowing entirely.",
    blurbJa: "きれいな10のべき乗から引くときは、繰り下がりを一切使いません。",
    steps: [
      "Line the number up against all-9s (one less than the power of 10).",
      "Subtract every digit from 9 — except the last.",
      "Subtract the last digit from 10 instead.",
      "Read the digits together — done, no borrowing.",
    ],
    stepsJa: [
      "すべて9の数（べき乗より1小さい数）と桁をそろえる。",
      "最後の桁以外は、それぞれ9から引く。",
      "最後の桁だけは10から引く。",
      "桁を並べて読む――繰り下がりなしで完成。",
    ],
    example: () => ({ base: 1000, x: 457 }),
    exSteps: (ex, lang) => {
      const base = ex.base as number, x = ex.x as number;
      const s = String(x).padStart(String(base - 1).length, "0");
      const out = s.split("").map((c, i) => (i === s.length - 1 ? 10 - +c : 9 - +c));
      if (lang === "ja")
        return [
          [`${x} の各桁`, s.split("").join(" ")],
          ["9,9,…,10 から各桁を引く", out.join(" ")],
          ["並べて読む", `${out.join("")}  →  ${base - x}`],
        ];
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
    titleJa: "2桁の数を9で割る",
    sutraSa: "Corollary · Nikhilam",
    sutraEn: "the digits nearly give the answer",
    sutraEnJa: "桁の数字がほぼ答えになる",
    blurb: "For a 2-digit number ÷ 9, the first digit is (almost) your quotient.",
    blurbJa: "2桁の数÷9では、最初の桁がほぼそのまま商になります。",
    steps: [
      "Split the number into its tens and units digit.",
      "The tens digit is your starting quotient.",
      "Add the units digit to the tens digit for the remainder.",
      "If that remainder reaches 9 or more, bump the quotient up by 1 and subtract 9 from the remainder.",
    ],
    stepsJa: [
      "数を十の位と一の位に分ける。",
      "十の位の数字が商のはじめの値になる。",
      "一の位を十の位に足して余りを求める。",
      "余りが9以上になったら、商を1増やし、余りから9を引く。",
    ],
    example: () => ({ n: 23 }),
    exSteps: (ex, lang) => {
      const n = ex.n as number;
      const t = Math.floor(n / 10), u = n % 10;
      let q = t, r = t + u;
      if (r >= 9) {
        q++;
        r -= 9;
      }
      if (lang === "ja")
        return [
          ["各桁", `${t} と ${u}`],
          [`余り = ${t}+${u}`, `= ${t + u}`],
          ["商・余り", `商 ${q}、余り ${r}（${n} ÷ 9）`],
        ];
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
    titleJa: "各桁の合計チェック",
    sutraSa: "Chapter · Digit Sum (DS)",
    sutraEn: "cast out nines to check your work",
    sutraEnJa: "9を除いて計算を確認する",
    blurb: "Add a number's digits down to a single digit — Vedic teachers use this to verify big calculations fast.",
    blurbJa: "数字のすべての桁を1桁になるまで足していく方法――ヴェーダ数学では計算の確認に使います。",
    steps: [
      "Add up all the digits of the number.",
      "If the total is more than one digit, add its digits again.",
      "Keep going until one digit remains — that's the digit sum.",
    ],
    stepsJa: [
      "数のすべての桁を足す。",
      "合計が2桁以上なら、その桁をもう一度足す。",
      "1桁になるまで続ける――それが各桁の合計。",
    ],
    example: () => ({ n: 4859 }),
    exSteps: (ex, lang) => {
      const n = ex.n as number;
      const s = String(n)
        .split("")
        .reduce((a, c) => a + +c, 0);
      if (lang === "ja")
        return [
          [`${n} の各桁`, `${String(n).split("").join(" + ")} = ${s}`],
          [
            "1桁？",
            s > 9 ? `${String(s).split("").join("+")} = ${1 + ((s - 1) % 9)}` : `はい → ${s}`,
          ],
        ];
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
    id: "mult9",
    icon: "✕",
    grad: ["#F4511E", "#FFB74D"],
    illus: "loop",
    title: "Multiplying by 9",
    titleJa: "9をかける",
    sutraSa: "Corollary · Ekanyūnena Pūrvena",
    sutraEn: "ten times, then one less",
    sutraEnJa: "10倍してから1回引く",
    blurb: "×9 is just ×10 with the original number taken back off once.",
    blurbJa: "×9は×10をしてから、元の数を1回引くだけです。",
    steps: ["Multiply the number by 10.", "Subtract the original number once.", "That's the answer — no long multiplication needed."],
    stepsJa: ["元の数に10をかける。", "元の数を1回引く。", "それが答え――筆算のかけ算は不要。"],
    example: () => ({ n: 23 }),
    exSteps: (ex, lang) => {
      const n = ex.n as number;
      if (lang === "ja") return [[`${n} × 10`, `= ${n * 10}`], [`${n * 10} − ${n}`, `= ${n * 9}`]];
      return [[`${n} × 10`, `= ${n * 10}`], [`${n * 10} − ${n}`, `= ${n * 9}`]];
    },
    gen: (diff) => {
      const n = diff === "easy" ? ri(2, 9) : diff === "medium" ? ri(10, 99) : ri(100, 999);
      return { prompt: `${n} × 9`, answer: n * 9 };
    },
  },
  {
    id: "mult111",
    icon: "✕",
    grad: ["#00897B", "#4DD0C4"],
    illus: "grid",
    title: "Multiplying by 111",
    titleJa: "111をかける",
    sutraSa: "Corollary · Ekadhikena",
    sutraEn: "spread the digit-sum twice",
    sutraEnJa: "各桁の合計を2回並べる",
    blurb: "For a 2-digit number, ×111 slots the digit-sum into both middle spots.",
    blurbJa: "2桁の数×111は、各桁の合計を真ん中の2か所に入れます。",
    steps: ["Write the first digit.", "Write the digit-sum twice in the middle.", "Write the last digit.", "Carry into the neighbour if a middle sum reaches 10."],
    stepsJa: ["最初の桁を書く。", "真ん中に各桁の合計を2回書く。", "最後の桁を書く。", "真ん中の合計が10以上なら隣に繰り上げる。"],
    example: () => ({ n: 12 }),
    exSteps: (ex, lang) => {
      const n = ex.n as number, a = Math.floor(n / 10), b = n % 10, s = a + b;
      if (lang === "ja")
        return [[`${n} の各桁`, `${a} と ${b}`], [`合計 ${a}+${b}`, `= ${s}`], ["2回入れる", `${a} ${s} ${s} ${b}  →  ${n * 111}`]];
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
    id: "balancing",
    icon: "⚖",
    grad: ["#6D4C41", "#BCAAA4"],
    illus: "ladder",
    title: "The Balancing Method",
    titleJa: "バランス法",
    sutraSa: "Corollary · Yavadunam",
    sutraEn: "balance two numbers around their middle",
    sutraEnJa: "2つの数を中央でバランスさせる",
    blurb: "When two numbers sit the same distance above and below a round middle, their product is just a difference of squares.",
    blurbJa: "2つの数がちょうど真ん中の数から同じ距離にあるとき、その積は2乗の差だけで求まります。",
    steps: ["Find the round number exactly between the two.", "Find how far each one is from that middle — the same distance both ways.", "Square the middle number.", "Subtract the distance squared."],
    stepsJa: ["2つの数のちょうど真ん中にある丸い数を見つける。", "それぞれが真ん中からどれだけ離れているか求める（両方向とも同じ距離）。", "真ん中の数を2乗する。", "その距離の2乗を引く。"],
    example: () => ({ base: 50, d: 4 }),
    exSteps: (ex, lang) => {
      const base = ex.base as number, d = ex.d as number;
      if (lang === "ja")
        return [
          [`${base - d} と ${base + d} の真ん中`, `${base}`],
          [`${base}²`, `= ${base * base}`],
          [`${d}²`, `= ${d * d}`],
          ["引く", `${base * base} − ${d * d} = ${base * base - d * d}`],
        ];
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
    id: "baseBelow100",
    icon: "↘",
    grad: ["#C2185B", "#F06292"],
    illus: "ladder",
    title: "Base Method — Below 100",
    titleJa: "基準数法 — 100未満",
    sutraSa: "Nikhilam Navatáścaramam Daśataḥ",
    sutraEn: "all from 9, the last from 10 — base 100",
    sutraEnJa: "9からすべて引き、最後は10から引く（基準100）",
    blurb: "The same deficiency trick as base 10, just measured against 100.",
    blurbJa: "基準10と同じ不足数のテクニックを、100を基準に使います。",
    steps: ["Find each number's deficiency from 100.", "Cross-subtract: number − other's deficiency, ×100.", "Multiply the two deficiencies together.", "Add the two parts for the answer."],
    stepsJa: ["それぞれの数の100からの不足数を求める。", "交差減算：数 −（相手の不足数）、それを×100する。", "2つの不足数をかける。", "2つの部分を足して答えにする。"],
    example: () => ({ a: 96, b: 98 }),
    exSteps: (ex, lang) => {
      const a = ex.a as number, b = ex.b as number, x = 100 - a, y = 100 - b;
      if (lang === "ja")
        return [
          ["不足数", `100−${a}=${x}、  100−${b}=${y}`],
          ["交差減算 ×100", `(${a}−${y})×100 = ${(a - y) * 100}`],
          ["不足数どうしをかける", `${x}×${y} = ${x * y}`],
          ["足す", `${(a - y) * 100} + ${x * y} = ${a * b}`],
        ];
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
    id: "baseAbove100",
    icon: "↗",
    grad: ["#5E35B1", "#9575CD"],
    illus: "ladder",
    title: "Base Method — Above 100",
    titleJa: "基準数法 — 100より大きい",
    sutraSa: "Nikhilam Navatáścaramam Daśataḥ",
    sutraEn: "work with the excess over 100",
    sutraEnJa: "100を超えた分で計算する",
    blurb: "For numbers just over 100, work with how far past 100 they are.",
    blurbJa: "100をわずかに超える数は、100からどれだけ超えているかで計算します。",
    steps: ["Find each number's excess over 100.", "Cross-add: number + other's excess, ×100.", "Multiply the two excesses together.", "Add the two parts for the answer."],
    stepsJa: ["それぞれの数の100からの超過数を求める。", "交差加算：数 ＋（相手の超過数）、それを×100する。", "2つの超過数をかける。", "2つの部分を足して答えにする。"],
    example: () => ({ a: 102, b: 104 }),
    exSteps: (ex, lang) => {
      const a = ex.a as number, b = ex.b as number, x = a - 100, y = b - 100;
      if (lang === "ja")
        return [
          ["超過数", `${a}−100=${x}、  ${b}−100=${y}`],
          ["交差加算 ×100", `(${a}+${y})×100 = ${(a + y) * 100}`],
          ["超過数どうしをかける", `${x}×${y} = ${x * y}`],
          ["足す", `${(a + y) * 100} + ${x * y} = ${a * b}`],
        ];
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
    id: "generalMult2d",
    icon: "⊞",
    grad: ["#1976D2", "#64B5F6"],
    illus: "grid",
    title: "General Multiplication (2D×2D)",
    titleJa: "一般的なかけ算（2桁×2桁）",
    sutraSa: "Ūrdhva-Tiryagbhyām",
    sutraEn: "vertically and crosswise, for any two numbers",
    sutraEnJa: "縦横――どんな2つの数にも使える",
    blurb: "The universal cross-multiplication method — works for any two numbers, special pattern or not.",
    blurbJa: "どんな2つの数にも使える万能の交差かけ算法――特別な形でなくても使えます。",
    steps: ["Multiply the units digits — that's the last part.", "Cross-multiply and add: (tens₁×units₂) + (units₁×tens₂) — the middle part.", "Multiply the tens digits — the first part.", "Add the three parts, shifting each one a place to the left."],
    stepsJa: ["一の位どうしをかける――これが最後の部分。", "交差してかけて足す：（十の位1×一の位2）＋（一の位1×十の位2）――真ん中の部分。", "十の位どうしをかける――最初の部分。", "3つの部分を、それぞれ桁をずらして足す。"],
    example: () => ({ a: 34, b: 52 }),
    exSteps: (ex, lang) => {
      const a = ex.a as number, b = ex.b as number;
      const a1 = Math.floor(a / 10), a0 = a % 10, b1 = Math.floor(b / 10), b0 = b % 10;
      const units = a0 * b0, cross = a1 * b0 + a0 * b1, tens = a1 * b1;
      if (lang === "ja")
        return [
          [`一の位 ${a0}×${b0}`, `= ${units}`],
          [`交差 ${a1}×${b0} + ${a0}×${b1}`, `= ${cross}`],
          [`十の位 ${a1}×${b1}`, `= ${tens}`],
          ["組み合わせる", `${tens}00 + ${cross}0 + ${units} = ${a * b}`],
        ];
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
    id: "additionGeneral",
    icon: "➕",
    grad: ["#43A047", "#A5D6A7"],
    illus: "numberline",
    title: "Mental Addition — General Method",
    titleJa: "暗算での足し算 — 一般法",
    sutraSa: "Sankalana-Vyavakalanabhyām",
    sutraEn: "add from the left, running total as you go",
    sutraEnJa: "左から足して、途中の合計を作っていく",
    blurb: "Add left to right, keeping a running total — no carrying columns from the right.",
    blurbJa: "左から右へ、途中の合計を保ちながら足していきます――右からの繰り上がり計算は不要。",
    steps: ["Start with the leftmost place values.", "Add them and fold the result into a running total.", "Bring in the next place value and add again.", "Keep going until every digit has been added in."],
    stepsJa: ["一番左の桁の値から始める。", "それらを足して、途中の合計に組み込む。", "次の桁の値を取り入れて、また足す。", "すべての桁を足し終えるまで続ける。"],
    example: () => ({ a: 342, b: 256 }),
    exSteps: (ex, lang) => {
      const a = ex.a as number, b = ex.b as number;
      const sa = String(a), sb = String(b), len = Math.max(sa.length, sb.length);
      const pa = sa.padStart(len, "0"), pb = sb.padStart(len, "0");
      let running = 0;
      const rows: ExStep[] = [];
      for (let i = 0; i < len; i++) {
        const place = Math.pow(10, len - 1 - i);
        const da = +pa[i], db = +pb[i];
        running += (da + db) * place;
        const left =
          lang === "ja"
            ? `+${da * place || da} と +${db * place || db}`
            : `+${da * place || da} and +${db * place || db}`;
        const right = lang === "ja" ? `途中の合計 = ${running}` : `running total = ${running}`;
        rows.push([left, right]);
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
    id: "subtractionGeneral",
    icon: "➖",
    grad: ["#EF6C00", "#FFB74D"],
    illus: "numberline",
    title: "Mental Subtraction — General Method",
    titleJa: "暗算での引き算 — 一般法",
    sutraSa: "Sankalana-Vyavakalanabhyām",
    sutraEn: "subtract from the left, place by place",
    sutraEnJa: "左から、桁ごとに引いていく",
    blurb: "Subtract left to right the same way — take each place value off a running total.",
    blurbJa: "同じように左から右へ引きます――途中の合計から桁の値を1つずつ取り除きます。",
    steps: ["Start the running total at the first number.", "Take off the leftmost place value of the second number.", "Take off the next place value.", "Keep going until every digit has been subtracted."],
    stepsJa: ["最初の数を途中の合計として始める。", "2番目の数の一番左の桁の値を取り除く。", "次の桁の値を取り除く。", "すべての桁を引き終えるまで続ける。"],
    example: () => ({ a: 583, b: 241 }),
    exSteps: (ex, lang) => {
      const a = ex.a as number, b = ex.b as number;
      const sb = String(b), len = sb.length;
      const pb = sb.padStart(len, "0");
      let running = a;
      const rows: ExStep[] = [
        lang === "ja" ? [`${a} から始める`, `途中の合計 = ${a}`] : [`start at ${a}`, `running total = ${a}`],
      ];
      for (let i = 0; i < len; i++) {
        const place = Math.pow(10, len - 1 - i);
        const db = +pb[i];
        running -= db * place;
        const right = lang === "ja" ? `途中の合計 = ${running}` : `running total = ${running}`;
        rows.push([`−${db * place || db}`, right]);
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
    id: "subOtherThan10s",
    icon: "−",
    grad: ["#455A64", "#90A4AE"],
    illus: "ladder",
    title: "Subtraction — Beyond Round Numbers",
    titleJa: "引き算 — きれいな数を超えて",
    sutraSa: "Corollary · Nikhilam",
    sutraEn: "add the complement, then remove the base",
    sutraEnJa: "補数を足してから基準数を引く",
    blurb: "To subtract any number, add its complement to the next power of ten, then take that power of ten back off.",
    blurbJa: "どんな数を引くときも、その補数（次のべき乗までの差）を足してから、そのべき乗数を引きます。",
    steps: ["Find the complement of the number being subtracted — what completes it to the next power of ten.", "Add that complement to the first number.", "Subtract that same power of ten from the result.", "That's the answer — no borrowing needed."],
    stepsJa: ["引く数の補数を求める――次のべき乗数を完成させる数。", "その補数を最初の数に足す。", "結果からそのべき乗数を引く。", "それが答え――繰り下がり不要。"],
    example: () => ({ a: 523, b: 278 }),
    exSteps: (ex, lang) => {
      const a = ex.a as number, b = ex.b as number;
      const k = String(b).length, base = Math.pow(10, k), comp = base - b;
      if (lang === "ja")
        return [
          [`${b} の補数`, `${base} − ${b} = ${comp}`],
          [`${a} に足す`, `${a} + ${comp} = ${a + comp}`],
          [`${base} を引く`, `${a + comp} − ${base} = ${a + comp - base}`],
        ];
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
    id: "div8",
    icon: "÷",
    grad: ["#00838F", "#4DD0E1"],
    illus: "loop",
    title: "Dividing by 8",
    titleJa: "8で割る",
    sutraSa: "Corollary · Nikhilam",
    sutraEn: "halve it three times",
    sutraEnJa: "3回半分にする",
    blurb: "Dividing by 8 is just halving a number three times in a row.",
    blurbJa: "8で割るのは、数を3回連続で半分にするだけです。",
    steps: ["Halve the number.", "Halve it again.", "Halve it a third time — that's n ÷ 8.", "If it doesn't divide evenly, work from the nearest multiple of 8 below it and note the remainder."],
    stepsJa: ["数を半分にする。", "もう一度半分にする。", "3回目の半分にする――それがn÷8。", "割り切れないときは、その下にある8の倍数から計算し、余りを記録する。"],
    example: () => ({ n: 96 }),
    exSteps: (ex, lang) => {
      const n = ex.n as number, h1 = n / 2, h2 = h1 / 2, h3 = h2 / 2;
      return [[`${n} ÷ 2`, `= ${h1}`], [`${h1} ÷ 2`, `= ${h2}`], [`${h2} ÷ 2`, `= ${h3}`]];
    },
    gen: (diff) => {
      const n = diff === "easy" ? ri(16, 199) : diff === "medium" ? ri(100, 999) : ri(1000, 9999);
      return { prompt: `${n} ÷ 8  (quotient, rounded down)`, answer: Math.floor(n / 8) };
    },
  },
  {
    id: "squareStart5",
    icon: "²",
    grad: ["#D81B60", "#F48FB1"],
    illus: "squaregrid",
    title: "Squaring Numbers Starting with 5",
    titleJa: "5から始まる数の2乗",
    sutraSa: "Corollary · (a+b)² identity",
    sutraEn: "25, then double, then the tail squared",
    sutraEnJa: "25、それから2倍、そして残りの2乗",
    blurb: "Any number that starts with a 5 squares the same clean way, no matter how many digits follow.",
    blurbJa: "5から始まる数は、桁数が何桁でも同じきれいな方法で2乗できます。",
    steps: ["Split the number into the leading 5 (times a power of ten) and the rest, x.", "\"25\" followed by the right number of zeros is the first part.", "x times the next power of ten up is the middle part.", "x² is the last part — add all three together."],
    stepsJa: ["数を、先頭の5（10のべき乗倍）と残りのxに分ける。", "「25」の後ろに適切な数のゼロをつけたものが最初の部分。", "xに次のべき乗の10をかけたものが真ん中の部分。", "x²が最後の部分――3つを合計する。"],
    example: () => ({ k: 1, x: 2 }),
    exSteps: (ex, lang) => {
      const k = ex.k as number, x = ex.x as number;
      const num = 5 * Math.pow(10, k) + x;
      const first = 25 * Math.pow(10, 2 * k), mid = x * Math.pow(10, k + 1), last = x * x;
      if (lang === "ja")
        return [
          [`25 の後ろに ${2 * k} 個の0`, `${first}`],
          [`${x} × 10^${k + 1}`, `= ${mid}`],
          [`${x}²`, `= ${last}`],
          ["3つを合計", `${num * num}`],
        ];
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

export const RANKS_JA: Record<string, string> = {
  Newcomer: "初心者",
  Apprentice: "見習い",
  Ganitin: "ガニティン",
  "Sutra Sādhaka": "スートラ修行者",
  "Vedic Scholar": "ヴェーダ学者",
  Grandmaster: "グランドマスター",
};
