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
    sutraEn: "One More than the One Before",
    sutraEnJa: "前の数より1つ多く",
    blurb: "One More than the One Before → tens place. One Less than the One Before → units place.",
    blurbJa: "一つ前より1多い → 十の位。一つ前より1少ない → 一の位。",
    steps: [
      "A number ending in 9 is one less than the next multiple of ten.",
      "One More than the One Before → add 1 extra to the tens place of the other number.",
      "One Less than the One Before → subtract 1 from the units place of the other number.",
      "Put the new tens and units together — that's the answer.",
    ],
    stepsJa: [
      "9で終わる数は、次の10の倍数より1小さい数です。",
      "「一つ前より1多い」――もう一方の数の十の位に1を足します。",
      "「一つ前より1少ない」――もう一方の数の一の位から1を引きます。",
      "新しい十の位と一の位を組み合わせると答えになります。",
    ],
    example: () => ({ a: 47, b: 39 }),
    exSteps: (ex, lang) => {
      const a = ex.a as number, b = ex.b as number;
      const aT = Math.floor(a / 10), bT = Math.floor(b / 10), aU = a % 10;
      if (lang === "ja")
        return [
          [`${a} + ${b}`, "="],
          [`十の位: ${aT} + ${bT} + 1`, `= ${aT + bT + 1}`],
          [`一の位: ${aU} − 1`, `= ${aU - 1}  →  ${a + b}`],
        ];
      return [
        [`${a} + ${b}`, "="],
        [`tens: ${aT} + ${bT} + 1`, `= ${aT + bT + 1}`],
        [`units: ${aU} − 1`, `= ${aU - 1}  →  ${a + b}`],
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
    sutraEn: "One More than the One Before",
    sutraEnJa: "前の数より1つ多く",
    blurb: "One Less than the One Before → tens place. One More than the One Before → units place.",
    blurbJa: "一つ前より1少ない → 十の位。一つ前より1多い → 一の位。",
    steps: [
      "A number ending in 9 is one less than the next multiple of ten.",
      "One Less than the One Before → subtract 1 extra from the tens place of the number you're subtracting from.",
      "One More than the One Before → add 1 to the units place of that number.",
      "Put the new tens and units together — that's the answer.",
    ],
    stepsJa: [
      "9で終わる数は、次の10の倍数より1小さい数です。",
      "「一つ前より1少ない」――引かれる数の十の位から1を引きます。",
      "「一つ前より1多い」――引かれる数の一の位に1を足します。",
      "新しい十の位と一の位を組み合わせると答えになります。",
    ],
    example: () => ({ a: 68, b: 29 }),
    exSteps: (ex, lang) => {
      const a = ex.a as number, b = ex.b as number;
      const aT = Math.floor(a / 10), bT = Math.floor(b / 10), aU = a % 10;
      if (lang === "ja")
        return [
          [`${a} − ${b}`, "="],
          [`十の位: ${aT} − ${bT} − 1`, `= ${aT - bT - 1}`],
          [`一の位: ${aU} + 1`, `= ${aU + 1}  →  ${a - b}`],
        ];
      return [
        [`${a} − ${b}`, "="],
        [`tens: ${aT} − ${bT} − 1`, `= ${aT - bT - 1}`],
        [`units: ${aU} + 1`, `= ${aU + 1}  →  ${a - b}`],
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
    sutraEn: "1 More · 2 Less",
    sutraEnJa: "1つ多く・2つ少なく",
    blurb: "1 More, 2 Less when adding; 1 Less, 2 More when subtracting — the shortcut for numbers ending in 8.",
    blurbJa: "足すときは十の位+1・一の位−2、引くときは十の位−1・一の位+2――8で終わる数の近道。",
    steps: [
      "A number ending in 8 is two less than the next ten.",
      "Adding: 1 More in the tens place, 2 Less in the units place.",
      "Subtracting: 1 Less in the tens place, 2 More in the units place.",
      "Put the new tens and units together — that's the answer.",
    ],
    stepsJa: [
      "8で終わる数は、次の10より2小さい数です。",
      "足し算：十の位に1多く、一の位に2少なく。",
      "引き算：十の位に1少なく、一の位に2多く。",
      "新しい十の位と一の位を組み合わせると答えになります。",
    ],
    example: () => ({ a: 57, b: 28, op: "+" }),
    exSteps: (ex, lang) => {
      const a = ex.a as number, b = ex.b as number, op = ex.op as string;
      const aT = Math.floor(a / 10), bT = Math.floor(b / 10), aU = a % 10;
      if (op === "+") {
        if (lang === "ja")
          return [
            [`${a} + ${b}`, "="],
            [`十の位: ${aT} + ${bT} + 1`, `= ${aT + bT + 1}`],
            [`一の位: ${aU} − 2`, `= ${aU - 2}  →  ${a + b}`],
          ];
        return [
          [`${a} + ${b}`, "="],
          [`tens: ${aT} + ${bT} + 1`, `= ${aT + bT + 1}`],
          [`units: ${aU} − 2`, `= ${aU - 2}  →  ${a + b}`],
        ];
      }
      if (lang === "ja")
        return [
          [`${a} − ${b}`, "="],
          [`十の位: ${aT} − ${bT} − 1`, `= ${aT - bT - 1}`],
          [`一の位: ${aU} + 2`, `= ${aU + 2}  →  ${a - b}`],
        ];
      return [
        [`${a} − ${b}`, "="],
        [`tens: ${aT} − ${bT} − 1`, `= ${aT - bT - 1}`],
        [`units: ${aU} + 2`, `= ${aU + 2}  →  ${a - b}`],
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
    sutraEn: "The Method (Proportionately)",
    sutraEnJa: "比例のきまり",
    blurb: "Write the outer digits; insert the sum of adjacent digits between them. If a sum is 10 or more, carry 1 to the digit on its left.",
    blurbJa: "外側の数字を書き、隣り合う数字の合計を間に入れます。合計が10以上なら、左の桁に1繰り上げます。",
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
          [`${n} × 11`, "="],
          [`各桁: ${a} と ${b}`, `合計 = ${a + b}`],
          ["真ん中に入れる", `${a} ${a + b} ${b}  →  ${n * 11}`],
        ];
      return [
        [`${n} × 11`, "="],
        [`digits: ${a} and ${b}`, `sum = ${a + b}`],
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
    sutraEn: "Units sum 10 and Tens is same",
    sutraEnJa: "単位の和が10・十の位は同じ",
    blurb: "Step 1: 10's digit × the next number → first part. Step 2: units × units → second part (2 digits).",
    blurbJa: "手順1：十の位 ×（次の数）→ 最初の部分。手順2：一の位 × 一の位 → 2番目の部分（2桁）。",
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
      const a = 10 * t + u1, b = 10 * t + u2;
      if (lang === "ja")
        return [
          [`${a} × ${b}`, "="],
          [`十の位 ${t} × (${t}+1)`, `= ${t * (t + 1)}`],
          [`一の位 ${u1} × ${u2}`, `= ${pad2(u1 * u2)}`],
          ["組み合わせる", `${t * (t + 1)}${pad2(u1 * u2)}  →  ${a * b}`],
        ];
      return [
        [`${a} × ${b}`, "="],
        [`tens ${t} × (${t}+1)`, `= ${t * (t + 1)}`],
        [`units ${u1} × ${u2}`, `= ${pad2(u1 * u2)}`],
        ["combine", `${t * (t + 1)}${pad2(u1 * u2)}  →  ${a * b}`],
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
    sutraEn: "Tens sum 10 and Units is same",
    sutraEnJa: "十の位の和が10・単位は同じ",
    blurb: "Step 1: (10's × 10's) + the shared units digit → first part. Step 2: units × units → second part (2 digits).",
    blurbJa: "手順1：（十の位×十の位）＋共通の一の位 → 最初の部分。手順2：一の位×一の位 → 2番目の部分（2桁）。",
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
      const a = 10 * t1 + u, b = 10 * t2 + u;
      if (lang === "ja")
        return [
          [`${a} × ${b}`, "="],
          [`十の位 ${t1}×${t2} + ${u}`, `= ${t1 * t2 + u}`],
          [`一の位 ${u}×${u}`, `= ${pad2(u * u)}`],
          ["組み合わせる", `${t1 * t2 + u}${pad2(u * u)}  →  ${a * b}`],
        ];
      return [
        [`${a} × ${b}`, "="],
        [`tens ${t1}×${t2} + ${u}`, `= ${t1 * t2 + u}`],
        [`units ${u}×${u}`, `= ${pad2(u * u)}`],
        ["combine", `${t1 * t2 + u}${pad2(u * u)}  →  ${a * b}`],
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
    sutraEn: "12 to 19 – both start with 1",
    sutraEnJa: "12〜19・どちらも1で始まる",
    blurb: "Step 1: units × units — write the last digit, carry the rest. Step 2: (first number + units of the second) + carry → the rest.",
    blurbJa: "手順1：一の位×一の位――最後の桁を書き、残りを繰り上げる。手順2：（最初の数＋2番目の数の一の位）＋繰り上げ → 残りの部分。",
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
    example: () => ({ x: 9, y: 6 }),
    exSteps: (ex, lang) => {
      const x = ex.x as number, y = ex.y as number;
      const a = 10 + x, b = 10 + y;
      const unitsProd = x * y;
      const lastDigit = unitsProd % 10;
      const carry = Math.floor(unitsProd / 10);
      const rest = a + y + carry;
      if (lang === "ja")
        return [
          [`${a} × ${b}`, "="],
          [`一の位 ${x} × ${y}`, `= ${unitsProd}（${lastDigit}を書き${carry}を繰り上げ）`],
          [`${a} + ${y} + 繰り上げ${carry}`, `= ${rest}`],
          ["組み合わせる", `${rest}${lastDigit}  →  ${a * b}`],
        ];
      return [
        [`${a} × ${b}`, "="],
        [`units ${x} × ${y}`, `= ${unitsProd} (write ${lastDigit}, carry ${carry})`],
        [`${a} + ${y} + carry ${carry}`, `= ${rest}`],
        ["combine", `${rest}${lastDigit}  →  ${a * b}`],
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
    sutraSa: "Ūrdhva-Tiryagbhyām · flag digit",
    sutraEn: "Ultimate & Twice the Penultimate",
    sutraEnJa: "末尾と、その手前の2倍",
    blurb: "The flag digit is the units of 12–19 (the 2…9). Sandwich the number with a 0; working right to left, each digit = itself + (flag × the digit beside it), carrying as you go.",
    blurbJa: "旗の数字は12〜19の一の位（2〜9）。数の前後を0ではさみ、右から左へ、各桁＝その桁＋（旗×となりの桁）。繰り上がりも足します。",
    steps: [
      "The flag digit is the units digit of the 12–19 multiplier.",
      "Write a 0 before and after the number.",
      "From the right, each digit = itself + (flag × the digit beside it), plus any carry.",
      "Keep the units of each result and carry the rest, until the leading 0 is reached.",
    ],
    stepsJa: [
      "旗の数字は、12〜19の一の位。",
      "数の前と後ろに0を書く。",
      "右から、各桁＝その桁＋（旗×となりの桁）＋繰り上がり。",
      "各結果の一の位を残し、残りを繰り上げ、先頭の0に達するまで続ける。",
    ],
    example: () => ({ n: 243, d: 4 }),
    exSteps: (ex, lang) => {
      const n = ex.n as number, d = ex.d as number;
      const s = `0${n}0`.split("").map(Number);
      const rows: ExStep[] = [[`${n} × ${10 + d}`, "="]];
      let carry = 0;
      const out: number[] = [];
      for (let i = s.length - 1; i >= 1; i--) {
        const v = s[i] + d * s[i - 1] + carry;
        out.unshift(v % 10);
        const expr = `${s[i]} + ${d}×${s[i - 1]}${carry ? ` + ${carry}` : ""}`;
        rows.push([expr, `= ${v} → ${lang === "ja" ? "書く" : "write"} ${v % 10}${v >= 10 ? `, ${lang === "ja" ? "繰り上げ" : "carry"} ${Math.floor(v / 10)}` : ""}`]);
        carry = Math.floor(v / 10);
      }
      rows.push([lang === "ja" ? "答え" : "answer", `${out.join("")}`]);
      return rows;
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
    sutraEn: "Nikhilam · base = 10",
    sutraEnJa: "ニキラム・基準は10",
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
          [`${a} × ${b}`, "="],
          ["不足数", `10−${a}=${x}、  10−${b}=${y}`],
          ["交差減算 ×10", `(${a}−${y})×10 = ${(a - y) * 10}`],
          ["不足数どうしをかける", `${x}×${y} = ${x * y}`],
          ["足す", `${(a - y) * 10} + ${x * y} = ${a * b}`],
        ];
      return [
        [`${a} × ${b}`, "="],
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
    sutraEn: "surplus over 10",
    sutraEnJa: "10からの余り",
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
          [`${a} × ${b}`, "="],
          ["超過数", `${a}−10=${x}、  ${b}−10=${y}`],
          ["交差加算 ×10", `(${a}+${y})×10 = ${(a + y) * 10}`],
          ["超過数どうしをかける", `${x}×${y} = ${x * y}`],
          ["足す", `${(a + y) * 10} + ${x * y} = ${a * b}`],
        ];
      return [
        [`${a} × ${b}`, "="],
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
    sutraEn: "10's part × its next number, then 25",
    sutraEnJa: "十の位×次の数、そして25",
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
          [`${n * 10 + 5}²`, "="],
          ["前の部分", `${n}`],
          [`${n} × ${n + 1}`, `= ${n * (n + 1)}`],
          ["25を付ける", `${n * (n + 1)}25  →  ${n * (n + 1) * 100 + 25}`],
        ];
      return [
        [`${n * 10 + 5}²`, "="],
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
    sutraEn: "All from 9 and the Last from 10 (Nikhilam)",
    sutraEnJa: "すべて9から、最後は10から（ニキラム）",
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
          [`${fmt(base)} − ${fmt(x)}`, "="],
          [`${x} の各桁`, s.split("").join(" ")],
          ["9,9,…,10 から各桁を引く", out.join(" ")],
          ["並べて読む", `${out.join("")}  →  ${base - x}`],
        ];
      return [
        [`${fmt(base)} − ${fmt(x)}`, "="],
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
    sutraEn: "No 9 times-table needed",
    sutraEnJa: "9の段はいりません",
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
          [`${n} ÷ 9`, "="],
          ["各桁", `${t} と ${u}`],
          [`余り = ${t}+${u}`, `= ${t + u}`],
          ["商・余り", `商 ${q}、余り ${r}（${n} ÷ 9）`],
        ];
      return [
        [`${n} ÷ 9`, "="],
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
    sutraEn: "Casting out 9",
    sutraEnJa: "9を取りのぞく",
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
          [`${n} の各桁の合計`, "="],
          [`${n} の各桁`, `${String(n).split("").join(" + ")} = ${s}`],
          [
            "1桁？",
            s > 9 ? `${String(s).split("").join("+")} = ${1 + ((s - 1) % 9)}` : `はい → ${s}`,
          ],
        ];
      return [
        [`digit sum of ${n}`, "="],
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
    sutraEn: "add & subtract method",
    sutraEnJa: "たして引く方法",
    blurb: "Answer in two parts, no multiplication! Left: (Number − 1) − all the digits except the units. Right: the 10's complement of the units digit.",
    blurbJa: "かけ算なしで、答えを2つの部分に分けます。左：（数 − 1）−（一の位を除いた部分）。右：一の位の10の補数。",
    steps: [
      "Take the number and subtract 1.",
      "From that, subtract all the digits except the units — this is the left part.",
      "Take the 10's complement of the units digit — this is the right part.",
      "Write the two parts side by side.",
    ],
    stepsJa: [
      "数から1を引く。",
      "そこから一の位を除いた部分を引く――これが左の部分。",
      "一の位の10の補数を求める――これが右の部分。",
      "2つの部分を並べて書く。",
    ],
    example: () => ({ n: 32 }),
    exSteps: (ex, lang) => {
      const n = ex.n as number;
      const rest = Math.floor(n / 10), u = n % 10;
      const left = n - 1 - rest, right = 10 - u;
      if (lang === "ja")
        return [
          [`${n} × 9`, "="],
          ["左の部分", `(${n} − 1) − ${rest} = ${left}`],
          ["右の部分", `${u} の補数 = ${right}`],
          ["並べる", `${left} | ${right}  →  ${n * 9}`],
        ];
      return [
        [`${n} × 9`, "="],
        ["left part", `(${n} − 1) − ${rest} = ${left}`],
        ["right part", `complement of ${u} = ${right}`],
        ["put together", `${left} | ${right}  →  ${n * 9}`],
      ];
    },
    gen: (diff) => {
      // a units digit of 0 has no single-digit 10's complement, so the book's rule needs one
      let n: number;
      do {
        n = diff === "easy" ? ri(2, 9) : diff === "medium" ? ri(10, 99) : ri(100, 999);
      } while (n % 10 === 0);
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
    sutraEn: "Double-Naught Sandwich",
    sutraEnJa: "ゼロ2つのサンドイッチ",
    blurb: "For a 2-digit number, ×111 slots the digit-sum into both middle spots.",
    blurbJa: "2桁の数×111は、各桁の合計を真ん中の2か所に入れます。",
    steps: ["Write the first digit.", "Write the digit-sum twice in the middle.", "Write the last digit.", "Carry into the neighbour if a middle sum reaches 10."],
    stepsJa: ["最初の桁を書く。", "真ん中に各桁の合計を2回書く。", "最後の桁を書く。", "真ん中の合計が10以上なら隣に繰り上げる。"],
    example: () => ({ n: 12 }),
    exSteps: (ex, lang) => {
      const n = ex.n as number, a = Math.floor(n / 10), b = n % 10, s = a + b;
      if (lang === "ja")
        return [[`${n} × 111`, "="], [`${n} の各桁`, `${a} と ${b}`], [`合計 ${a}+${b}`, `= ${s}`], ["2回入れる", `${a} ${s} ${s} ${b}  →  ${n * 111}`]];
      return [[`${n} × 111`, "="], [`digits of ${n}`, `${a} and ${b}`], [`sum ${a}+${b}`, `= ${s}`], ["slot it twice", `${a} ${s} ${s} ${b}  →  ${n * 111}`]];
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
    sutraEn: "Balancing Method – Thumb Rule",
    sutraEnJa: "バランス法",
    blurb: "When two numbers sit the same distance above and below a round middle, their product is just a difference of squares.",
    blurbJa: "2つの数がちょうど真ん中の数から同じ距離にあるとき、その積は2乗の差だけで求まります。",
    steps: ["Find the round number exactly between the two.", "Find how far each one is from that middle — the same distance both ways.", "Square the middle number.", "Subtract the distance squared."],
    stepsJa: ["2つの数のちょうど真ん中にある丸い数を見つける。", "それぞれが真ん中からどれだけ離れているか求める（両方向とも同じ距離）。", "真ん中の数を2乗する。", "その距離の2乗を引く。"],
    example: () => ({ base: 50, d: 4 }),
    exSteps: (ex, lang) => {
      const base = ex.base as number, d = ex.d as number;
      if (lang === "ja")
        return [
          [`${base - d} × ${base + d}`, "="],
          [`${base - d} と ${base + d} の真ん中`, `${base}`],
          [`${base}²`, `= ${base * base}`],
          [`${d}²`, `= ${d * d}`],
          ["引く", `${base * base} − ${d * d} = ${base * base - d * d}`],
        ];
      return [
        [`${base - d} × ${base + d}`, "="],
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
    sutraEn: "deficiency from base 100",
    sutraEnJa: "基準100からの不足",
    blurb: "The same deficiency trick as base 10, just measured against 100.",
    blurbJa: "基準10と同じ不足数のテクニックを、100を基準に使います。",
    steps: ["Find each number's deficiency from 100.", "Cross-subtract: number − other's deficiency, ×100.", "Multiply the two deficiencies together.", "Add the two parts for the answer."],
    stepsJa: ["それぞれの数の100からの不足数を求める。", "交差減算：数 −（相手の不足数）、それを×100する。", "2つの不足数をかける。", "2つの部分を足して答えにする。"],
    example: () => ({ a: 96, b: 98 }),
    exSteps: (ex, lang) => {
      const a = ex.a as number, b = ex.b as number, x = 100 - a, y = 100 - b;
      if (lang === "ja")
        return [
          [`${a} × ${b}`, "="],
          ["不足数", `100−${a}=${x}、  100−${b}=${y}`],
          ["交差減算 ×100", `(${a}−${y})×100 = ${(a - y) * 100}`],
          ["不足数どうしをかける", `${x}×${y} = ${x * y}`],
          ["足す", `${(a - y) * 100} + ${x * y} = ${a * b}`],
        ];
      return [
        [`${a} × ${b}`, "="],
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
    sutraEn: "surplus over base 100",
    sutraEnJa: "基準100からの余り",
    blurb: "For numbers just over 100, work with how far past 100 they are.",
    blurbJa: "100をわずかに超える数は、100からどれだけ超えているかで計算します。",
    steps: ["Find each number's excess over 100.", "Cross-add: number + other's excess, ×100.", "Multiply the two excesses together.", "Add the two parts for the answer."],
    stepsJa: ["それぞれの数の100からの超過数を求める。", "交差加算：数 ＋（相手の超過数）、それを×100する。", "2つの超過数をかける。", "2つの部分を足して答えにする。"],
    example: () => ({ a: 102, b: 104 }),
    exSteps: (ex, lang) => {
      const a = ex.a as number, b = ex.b as number, x = a - 100, y = b - 100;
      if (lang === "ja")
        return [
          [`${a} × ${b}`, "="],
          ["超過数", `${a}−100=${x}、  ${b}−100=${y}`],
          ["交差加算 ×100", `(${a}+${y})×100 = ${(a + y) * 100}`],
          ["超過数どうしをかける", `${x}×${y} = ${x * y}`],
          ["足す", `${(a + y) * 100} + ${x * y} = ${a * b}`],
        ];
      return [
        [`${a} × ${b}`, "="],
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
    sutraEn: "The I X I pattern",
    sutraEnJa: "I X I のかたち",
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
          [`${a} × ${b}`, "="],
          [`一の位 ${a0}×${b0}`, `= ${units}`],
          [`交差 ${a1}×${b0} + ${a0}×${b1}`, `= ${cross}`],
          [`十の位 ${a1}×${b1}`, `= ${tens}`],
          ["組み合わせる", `${tens}00 + ${cross}0 + ${units} = ${a * b}`],
        ];
      return [
        [`${a} × ${b}`, "="],
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
    sutraEn: "The Bar Method",
    sutraEnJa: "バー（棒）法",
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
      const rows: ExStep[] = [[`${a} + ${b}`, "="]];
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
    sutraEn: "All from 9, Last from 10",
    sutraEnJa: "すべて9から、最後は10から",
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
        [`${a} − ${b}`, "="],
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
    sutraEn: "reduce the leading digit by 1",
    sutraEnJa: "先頭の桁を1減らす",
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
          [`${a} − ${b}`, "="],
          [`${b} の補数`, `${base} − ${b} = ${comp}`],
          [`${a} に足す`, `${a} + ${comp} = ${a + comp}`],
          [`${base} を引く`, `${a + comp} − ${base} = ${a + comp - base}`],
        ];
      return [
        [`${a} − ${b}`, "="],
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
    sutraEn: "deficiency from base 10 = 2",
    sutraEnJa: "基準10からの不足は2",
    blurb: "8 = 10 − 2. Mark off the last digit as the remainder zone. Each quotient digit = its own digit + 2×(quotient digit to its left). Fix up the remainder at the end.",
    blurbJa: "8 = 10−2。最後の桁を余りの部分として区切る。各商の桁 = その桁の数字 ＋ 2×（左隣の商の桁）。最後に余りを調整する。",
    steps: [
      "Mark off the last digit — that's the remainder zone.",
      "The first digit becomes the first quotient digit.",
      "Each next digit = itself + 2 × (the quotient digit just found).",
      "In the remainder zone, if the total is 8 or more, add 1 to the quotient and subtract 8.",
    ],
    stepsJa: [
      "最後の桁を余りの部分として区切る。",
      "最初の桁がそのまま商の最初の桁になる。",
      "次の桁 = その桁の数字 ＋ 2×（直前に求めた商の桁）。",
      "余りの部分が8以上になったら、商に1を足し、8を引く。",
    ],
    example: () => ({ n: 243 }),
    exSteps: (ex, lang) => {
      const n = ex.n as number;
      const digits = String(n).split("").map(Number);
      const m = digits.length;
      const q = digits.slice(0, m - 1);
      const rows: ExStep[] = [[`${n} ÷ 8`, "="]];
      for (let i = 1; i < m - 1; i++) {
        q[i] = digits[i] + 2 * q[i - 1];
        rows.push([`${digits[i]} + 2×${q[i - 1]}`, `= ${q[i]}`]);
      }
      let rem = digits[m - 1] + 2 * q[m - 2];
      rows.push([
        lang === "ja" ? `余り部分：${digits[m - 1]} + 2×${q[m - 2]}` : `remainder zone: ${digits[m - 1]} + 2×${q[m - 2]}`,
        `= ${rem}`,
      ]);
      const carry = Math.floor(rem / 8);
      rem = rem - carry * 8;
      q[m - 2] += carry;
      for (let i = m - 2; i > 0; i--) {
        if (q[i] >= 10) {
          q[i - 1] += Math.floor(q[i] / 10);
          q[i] = q[i] % 10;
        }
      }
      const quotient = Number(q.join(""));
      rows.push([
        lang === "ja" ? "商・余り" : "quotient / remainder",
        lang === "ja" ? `商 ${quotient}、余り ${rem}` : `${quotient} remainder ${rem}`,
      ]);
      return rows;
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
    sutraEn: "25 + units, then units squared",
    sutraEnJa: "25＋単位、そして単位の2乗",
    blurb: "5 × 5 = 25, then add the units digit once → first part. Units × units → second part (always 2 digits).",
    blurbJa: "5×5=25に残りを足したものが最初の部分。残りの2乗（常に2桁）が2番目の部分。",
    steps: [
      "Split the number into the leading 5 and the rest, X.",
      "5 × 5 = 25, then add X once — that's the first part.",
      "X × X is the second part — it fills the last two digits.",
      "If X² spills past two digits, carry the extra into the first part.",
    ],
    stepsJa: [
      "数を、先頭の5と残りのXに分ける。",
      "5×5=25に、Xを1回足す――それが最初の部分。",
      "X×Xが2番目の部分――最後の2桁を埋める。",
      "X²が2桁を超えたら、あふれた分を最初の部分に繰り上げる。",
    ],
    example: () => ({ k: 1, x: 4 }),
    exSteps: (ex, lang) => {
      const k = ex.k as number, x = ex.x as number;
      const num = 5 * Math.pow(10, k) + x;
      const firstPart = 25 * Math.pow(10, k - 1) + x;
      const secondPart = String(x * x).padStart(2, "0");
      if (lang === "ja")
        return [
          [`${num}²`, "="],
          [`十: (5×5) + ${x}`, `= ${firstPart}`],
          [`一: ${x} × ${x}`, `= ${secondPart}  →  ${num * num}`],
        ];
      return [
        [`${num}²`, "="],
        [`tens: (5×5) + ${x}`, `= ${firstPart}`],
        [`units: ${x} × ${x}`, `= ${secondPart}  →  ${num * num}`],
      ];
    },
    gen: (diff) => {
      const k = diff === "easy" ? 1 : diff === "medium" ? 2 : 3;
      const x = ri(0, Math.pow(10, k) - 1);
      const num = 5 * Math.pow(10, k) + x;
      return { prompt: `${num}²`, answer: num * num };
    },
  },
  /* ---------- World 4 · sub-base multiples of 10 (p79, p89) ---------- */
  {
    id: "baseBelow20to90",
    icon: "✕",
    grad: ["#1FA8C9", "#2F6BE0"],
    illus: "grid",
    title: "Base Method — Below Base 20–90",
    titleJa: "基準法 — 20〜90より下",
    sutraSa: "Nikhilam · sub-base",
    sutraEn: "Sub-base multiples of 10",
    sutraEnJa: "10の倍数のサブベース",
    blurb:
      "Sub-base = the tens digit × 10 (e.g. 20, 30 … 90). Cross-subtract, then multiply by the sub-base tens → left part. Multiply the deficiencies → right part.",
    blurbJa:
      "サブベース＝十の位×10（20、30…90）。斜めに引いてからサブベースの十の位をかける→左。不足どうしをかける→右。",
    steps: [
      "Pick the sub-base: the tens digit × 10.",
      "Find each number's deficiency from the sub-base.",
      "Cross-subtract, then multiply by the sub-base's tens digit → left part.",
      "Multiply the two deficiencies → right part.",
    ],
    stepsJa: [
      "サブベースを決める：十の位×10。",
      "サブベースからの不足を求める。",
      "斜めに引き、サブベースの十の位をかける→左の部分。",
      "2つの不足をかける→右の部分。",
    ],
    example: () => ({ b: 20, a: 19, c: 16 }),
    exSteps: (ex, lang) => {
      const b = ex.b as number, a = ex.a as number, c = ex.c as number;
      const t = b / 10, da = a - b, dc = c - b;
      const left = (a + dc) * t;
      if (lang === "ja")
        return [
          [`${a} × ${c}`, `基準 ${b}`],
          [`不足: ${da} と ${dc}`, `斜め: ${a} ${dc} = ${a + dc}`],
          [`左: ${a + dc} × ${t}`, `= ${left}`],
          [`右: ${da} × ${dc}`, `= ${da * dc}  →  ${a * c}`],
        ];
      return [
        [`${a} × ${c}`, `base ${b}`],
        [`deficiencies: ${da} and ${dc}`, `cross: ${a} ${dc} = ${a + dc}`],
        [`left: ${a + dc} × ${t}`, `= ${left}`],
        [`right: ${da} × ${dc}`, `= ${da * dc}  →  ${a * c}`],
      ];
    },
    gen: (diff) => {
      const t = diff === "easy" ? 2 : ri(2, diff === "medium" ? 5 : 9);
      const b = t * 10;
      const a = b - ri(1, 4), c = b - ri(1, 4);
      return { prompt: `${a} × ${c}`, answer: a * c };
    },
  },
  {
    id: "baseAbove20to90",
    icon: "✕",
    grad: ["#2FA8E0", "#5A4BFF"],
    illus: "grid",
    title: "Base Method — Above Base 20–90",
    titleJa: "基準法 — 20〜90より上",
    sutraSa: "Nikhilam · sub-base",
    sutraEn: "Sub-base multiples of 10",
    sutraEnJa: "10の倍数のサブベース",
    blurb:
      "Sub-base = the tens digit × 10. Find each surplus over it. Cross-add, then multiply by the sub-base tens → left part. Multiply the surpluses → right part.",
    blurbJa:
      "サブベース＝十の位×10。それぞれの余りを求める。斜めに足してからサブベースの十の位をかける→左。余りどうしをかける→右。",
    steps: [
      "Pick the sub-base: the tens digit × 10.",
      "Find each number's surplus over the sub-base.",
      "Cross-add, then multiply by the sub-base's tens digit → left part.",
      "Multiply the two surpluses → right part.",
    ],
    stepsJa: [
      "サブベースを決める：十の位×10。",
      "サブベースからの余りを求める。",
      "斜めに足し、サブベースの十の位をかける→左の部分。",
      "2つの余りをかける→右の部分。",
    ],
    example: () => ({ b: 20, a: 23, c: 24 }),
    exSteps: (ex, lang) => {
      const b = ex.b as number, a = ex.a as number, c = ex.c as number;
      const t = b / 10, sa = a - b, sc = c - b;
      const left = (a + sc) * t;
      if (lang === "ja")
        return [
          [`${a} × ${c}`, `基準 ${b}`],
          [`余り: +${sa} と +${sc}`, `斜め: ${a} + ${sc} = ${a + sc}`],
          [`左: ${a + sc} × ${t}`, `= ${left}`],
          [`右: ${sa} × ${sc}`, `= ${sa * sc}  →  ${a * c}`],
        ];
      return [
        [`${a} × ${c}`, `base ${b}`],
        [`surpluses: +${sa} and +${sc}`, `cross: ${a} + ${sc} = ${a + sc}`],
        [`left: ${a + sc} × ${t}`, `= ${left}`],
        [`right: ${sa} × ${sc}`, `= ${sa * sc}  →  ${a * c}`],
      ];
    },
    gen: (diff) => {
      const t = diff === "easy" ? 2 : ri(2, diff === "medium" ? 5 : 9);
      const b = t * 10;
      const a = b + ri(1, 4), c = b + ri(1, 4);
      return { prompt: `${a} × ${c}`, answer: a * c };
    },
  },
  /* ---------- World 6 · division by 9 with carry (p144) ---------- */
  {
    id: "div9carry",
    icon: "÷",
    grad: ["#0FA857", "#12B981"],
    illus: "ladder",
    title: "Dividing by 9 — with carry",
    titleJa: "9でわる — 繰り上がりあり",
    sutraSa: "Nikhilam · carry",
    sutraEn: "when the running sum reaches 9",
    sutraEnJa: "合計が9以上になるとき",
    blurb:
      "Same sweep as dividing by 9, but when a quotient digit plus the next dividend digit reaches 9 or more, divide that sum by 9: its quotient carries into the running quotient and its remainder continues the sweep.",
    blurbJa:
      "9でわるのと同じ流れですが、商の桁と次の桁の合計が9以上になったら、その合計を9でわります。商は繰り上げ、余りをそのまま次へ送ります。",
    steps: [
      "Bring the first digit down as the first quotient digit.",
      "Add each quotient digit to the next dividend digit.",
      "If that sum is 9 or more, divide it by 9 — carry its quotient left, keep its remainder.",
      "The final running value is the remainder.",
    ],
    stepsJa: [
      "最初の桁をそのまま商の最初の桁にする。",
      "商の桁を次の桁に足す。",
      "合計が9以上なら9でわり、商は左へ繰り上げ、余りを残す。",
      "最後に残った値が余り。",
    ],
    example: () => ({ n: 3794 }),
    exSteps: (ex, lang) => {
      const n = ex.n as number;
      const q = Math.floor(n / 9), r = n % 9;
      if (lang === "ja")
        return [
          [`${fmt(n)} ÷ 9`, ""],
          ["左から流していく", "合計が9以上なら9でわる"],
          ["商", `${fmt(q)}`],
          ["余り", `${r}`],
        ];
      return [
        [`${fmt(n)} ÷ 9`, ""],
        ["sweep from the left", "sum ≥ 9 → divide it by 9"],
        ["quotient", `${fmt(q)}`],
        ["remainder", `${r}`],
      ];
    },
    gen: (diff) => {
      const lo = diff === "easy" ? 200 : diff === "medium" ? 1000 : 3000;
      const hi = diff === "easy" ? 999 : diff === "medium" ? 5999 : 9999;
      const n = ri(lo, hi);
      return { prompt: `${fmt(n)} ÷ 9  (quotient, rounded down)`, answer: Math.floor(n / 9) };
    },
  },
  /* ---------- World 7 · vinculum (p164, p170, p175) ---------- */
  {
    id: "vinculum",
    icon: "‾",
    grad: ["#8B5CF6", "#C026D3"],
    illus: "numberline",
    title: "Vinculum — the bar digit",
    titleJa: "ヴィンキュラム — バーの数字",
    sutraSa: "Vinculum",
    sutraEn: "a bar turns a digit negative",
    sutraEnJa: "バーは数字をマイナスにする",
    blurb:
      "A bar over a digit means it is negative, so a number can be written with small digits instead of big ones. To vinculate the units: subtract them from 10 and add 1 to the digit on its left — 47 becomes 5 3̄, because 47 = 50 − 3.",
    blurbJa:
      "数字の上のバーはマイナスを表し、大きい数字を小さい数字で書けます。一の位をバーにするには、10から引いて左の桁に1を足します。47 は 5 3̄（47 = 50 − 3）。",
    steps: [
      "Look at the units digit you want to make small.",
      "Subtract it from 10 — that is the bar digit.",
      "Add 1 to the digit on its left.",
      "Check it: 47 = 50 − 3.",
    ],
    stepsJa: [
      "小さくしたい一の位を見る。",
      "10から引く——それがバーの数字。",
      "左の桁に1を足す。",
      "確かめ：47 = 50 − 3。",
    ],
    example: () => ({ n: 47 }),
    exSteps: (ex, lang) => {
      const n = ex.n as number, u = n % 10, up = Math.floor(n / 10) + 1;
      if (lang === "ja")
        return [
          [`${n} をバーにする`, ""],
          [`一の位 ${u} → ${10 - u}`, "バーをつける"],
          ["左を1つ増やす", `${up}`],
          ["確かめ", `${up * 10} − ${10 - u} = ${n}`],
        ];
      return [
        [`vinculate ${n}`, ""],
        [`units ${u} → ${10 - u}`, "with a bar"],
        ["one more on the left", `${up}`],
        ["check", `${up * 10} − ${10 - u} = ${n}`],
      ];
    },
    gen: (diff) => {
      const lo = diff === "easy" ? 6 : 5, hi = 9;
      const tens = diff === "easy" ? ri(1, 4) : diff === "medium" ? ri(1, 8) : ri(1, 9);
      const u = ri(lo, hi);
      const n = tens * 10 + u;
      return { prompt: `${n} = ${(tens + 1) * 10} − ?`, answer: 10 - u };
    },
  },
  {
    id: "devinculum",
    icon: "‾",
    grad: ["#6A15C4", "#9B30FF"],
    illus: "numberline",
    title: "Devinculum — taking the bars off",
    titleJa: "デヴィンキュラム — バーをはずす",
    sutraSa: "Devinculum",
    sutraEn: "removing the bars",
    sutraEnJa: "バーをはずす",
    blurb:
      "Apply All from 9 and the Last from 10 to the barred group, then reduce the digit to the left of that group by one. 7 2̄ becomes 68: the 2 turns into 8, and the 7 drops to 6.",
    blurbJa:
      "バーのついた並びに「すべて9から、最後は10から」を使い、その左の桁を1減らします。7 2̄ は 68：2 は 8 に、7 は 6 に。",
    steps: [
      "Find the barred group.",
      "All from 9 and the last from 10, across that group.",
      "Reduce the digit to its left by one.",
      "Read the ordinary number that is left.",
    ],
    stepsJa: [
      "バーのついた並びを見つける。",
      "その並びに「すべて9から、最後は10から」を使う。",
      "左の桁を1減らす。",
      "残ったふつうの数を読む。",
    ],
    example: () => ({ t: 7, u: 2 }),
    exSteps: (ex, lang) => {
      const t = ex.t as number, u = ex.u as number;
      const val = t * 10 - u;
      if (lang === "ja")
        return [
          [`${t} ${u}̄ をもどす`, ""],
          [`${u} → ${10 - u}`, "10から引く"],
          [`${t} → ${t - 1}`, "1つ少なく"],
          ["答え", `${val}`],
        ];
      return [
        [`devinculate ${t} ${u}̄`, ""],
        [`${u} → ${10 - u}`, "from 10"],
        [`${t} → ${t - 1}`, "one less"],
        ["answer", `${val}`],
      ];
    },
    gen: (diff) => {
      const t = diff === "easy" ? ri(2, 5) : diff === "medium" ? ri(2, 9) : ri(3, 9);
      const u = ri(1, 9);
      return { prompt: `${t} ${u}̄  (bar number)`, answer: t * 10 - u };
    },
  },
  {
    id: "subVinculum",
    icon: "−",
    grad: ["#C4001F", "#FF1E3C"],
    illus: "numberline",
    title: "Subtraction using Vinculum",
    titleJa: "ヴィンキュラムで引き算",
    sutraSa: "Vinculum · subtraction",
    sutraEn: "no borrowing needed!",
    sutraEnJa: "くり下がりなし！",
    blurb:
      "Subtract each column straight down. Where the top digit is smaller, write a bar-digit instead of borrowing. Then devinculate the barred answer to get the ordinary number.",
    blurbJa:
      "各けたをそのまま上から下へ引きます。上が小さいときは、くり下がらずにバーの数字を書きます。最後にバーをはずせば答えです。",
    steps: [
      "Subtract column by column, top minus bottom.",
      "Where the top is smaller, write the difference as a bar-digit.",
      "Devinculate the barred result.",
      "That is the answer — no borrowing anywhere.",
    ],
    stepsJa: [
      "けたごとに、上から下を引く。",
      "上が小さいところは、差をバーの数字で書く。",
      "バーをはずす。",
      "それが答え——くり下がりは一度もなし。",
    ],
    example: () => ({ a: 8324, b: 2348 }),
    exSteps: (ex, lang) => {
      const a = ex.a as number, b = ex.b as number;
      if (lang === "ja")
        return [
          [`${fmt(a)} − ${fmt(b)}`, ""],
          ["けたごとに引く", "上が小さければバー"],
          ["バーをはずす", `${fmt(a - b)}`],
        ];
      return [
        [`${fmt(a)} − ${fmt(b)}`, ""],
        ["column by column", "top smaller → bar it"],
        ["devinculate", `${fmt(a - b)}`],
      ];
    },
    gen: (diff) => {
      const digits = diff === "easy" ? 3 : diff === "medium" ? 4 : 5;
      const lo = Math.pow(10, digits - 1), hi = Math.pow(10, digits) - 1;
      const a = ri(Math.floor(hi / 2), hi);
      const b = ri(lo, a - 1);
      return { prompt: `${fmt(a)} − ${fmt(b)}`, answer: a - b };
    },
  },
  {
    id: "duplexSquare",
    icon: "²",
    grad: ["#D89B00", "#FFCC00"],
    illus: "squaregrid",
    title: "Square by the Duplex Method",
    titleJa: "デュープレックス法の2乗",
    sutraSa: "Dvandva Yoga · duplex",
    sutraEn: "(ab)² = D(a) | D(ab) | D(b)",
    sutraEnJa: "(ab)² = D(a) | D(ab) | D(b)",
    blurb:
      "The duplex of one digit is its square, of two digits is twice their product, and of three is 2ac + b². Lay the duplexes side by side and balance any part with two or more digits.",
    blurbJa:
      "デュープレックスは、1桁ならその2乗、2桁なら積の2倍、3桁なら 2ac + b²。それらを並べ、2桁以上になった部分は繰り上げて整えます。",
    steps: [
      "D(a) = a², D(ab) = 2ab, D(abc) = 2ac + b².",
      "For a 2-digit number: D(a) | D(ab) | D(b).",
      "For a 3-digit number: D(a) | D(ab) | D(abc) | D(bc) | D(c).",
      "Balance: keep one digit per part, carrying the rest left.",
    ],
    stepsJa: [
      "D(a) = a²、D(ab) = 2ab、D(abc) = 2ac + b²。",
      "2桁の数：D(a) | D(ab) | D(b)。",
      "3桁の数：D(a) | D(ab) | D(abc) | D(bc) | D(c)。",
      "各部分が1桁になるように繰り上げる。",
    ],
    example: () => ({ a: 4, b: 3 }),
    exSteps: (ex, lang) => {
      const a = ex.a as number, b = ex.b as number;
      const n = a * 10 + b;
      if (lang === "ja")
        return [
          [`${n}²`, ""],
          [`D(${a}) = ${a * a}`, `D(${a}${b}) = 2×${a}×${b} = ${2 * a * b}`],
          [`D(${b}) = ${b * b}`, "並べる"],
          ["整える", `${n * n}`],
        ];
      return [
        [`${n}²`, ""],
        [`D(${a}) = ${a * a}`, `D(${a}${b}) = 2×${a}×${b} = ${2 * a * b}`],
        [`D(${b}) = ${b * b}`, "lay side by side"],
        ["balance", `${n * n}`],
      ];
    },
    gen: (diff) => {
      const n = diff === "easy" ? ri(11, 49) : diff === "medium" ? ri(21, 99) : ri(101, 399);
      return { prompt: `${n}²`, answer: n * n };
    },
  },
  /* ---------- World 8 · division masters (p188, p195, p196, p199) ---------- */
  {
    id: "div99",
    icon: "÷",
    grad: ["#0A7A3F", "#1FE07A"],
    illus: "ladder",
    title: "Dividing by 99, 98, 97",
    titleJa: "99・98・97でわる",
    sutraSa: "Nikhilam · base 100",
    sutraEn: "All from 9, the Last from 10",
    sutraEnJa: "すべて9から、最後は10から",
    blurb:
      "Base 100, so the last two digits are the remainder zone. The multiplier is the divisor's deficiency from 100: 99 → 01, 98 → 02, 97 → 03. Cross-add it with the dividend's digits.",
    blurbJa:
      "基準は100なので、下2桁が余りの場所です。かける数は100からの不足：99→01、98→02、97→03。それを割られる数の桁と斜めに足していきます。",
    steps: [
      "Split off the last two digits — that is the remainder zone.",
      "Multiplier = 100 − divisor (99 → 1, 98 → 2, 97 → 3).",
      "Bring the first digit down, then cross-add the multiplier as you sweep right.",
      "If the remainder is at least the divisor, divide again and add to the quotient.",
    ],
    stepsJa: [
      "下2桁を分ける——そこが余りの場所。",
      "かける数＝100−わる数（99→1、98→2、97→3）。",
      "最初の桁をおろし、右へ流しながら斜めに足す。",
      "余りがわる数以上なら、もう一度わって商に足す。",
    ],
    example: () => ({ n: 123123, d: 99 }),
    exSteps: (ex, lang) => {
      const n = ex.n as number, d = ex.d as number;
      const q = Math.floor(n / d), r = n % d;
      if (lang === "ja")
        return [
          [`${fmt(n)} ÷ ${d}`, `かける数 ${100 - d}`],
          ["下2桁は余りの場所", "斜めに足していく"],
          ["商", `${fmt(q)}`],
          ["余り", `${r}`],
        ];
      return [
        [`${fmt(n)} ÷ ${d}`, `multiplier ${100 - d}`],
        ["last two digits are the remainder zone", "cross-add as you sweep"],
        ["quotient", `${fmt(q)}`],
        ["remainder", `${r}`],
      ];
    },
    gen: (diff) => {
      const d = [99, 98, 97][ri(0, diff === "easy" ? 0 : 2)];
      const lo = diff === "easy" ? 1000 : diff === "medium" ? 10000 : 100000;
      const hi = diff === "easy" ? 9999 : diff === "medium" ? 99999 : 999999;
      const n = ri(lo, hi);
      return { prompt: `${fmt(n)} ÷ ${d}  (quotient, rounded down)`, answer: Math.floor(n / d) };
    },
  },
  {
    id: "flagDivision",
    icon: "÷",
    grad: ["#1450C4", "#2979FF"],
    illus: "ladder",
    title: "General Division — Flag Method",
    titleJa: "一般の割り算 — フラッグ法",
    sutraSa: "Dhvajāṅka · the crowning gem",
    sutraEn: "The Crowning Gem · Dhvajanka",
    sutraEnJa: "ドゥヴァジャンカ（頂きの宝石）",
    blurb:
      "The tens digit of the divisor is the main divisor; the units digit is the flag, raised on top. Then repeat: divide, multiply the flag by that quotient digit, subtract, bring down.",
    blurbJa:
      "わる数の十の位が本体、一の位が「旗」として上に立ちます。あとはくり返し：わる→旗×商をかける→引く→next をおろす。",
    steps: [
      "Split the divisor: tens = main divisor, units = the flag.",
      "Divide the leading part by the main divisor → first quotient digit.",
      "Multiply the flag by that quotient digit and subtract from the next figure.",
      "Bring down and repeat; what is left at the end is the remainder.",
    ],
    stepsJa: [
      "わる数を分ける：十の位が本体、一の位が旗。",
      "先頭を本体でわる→商の最初の桁。",
      "旗×その商を、次の数から引く。",
      "次をおろしてくり返す。最後に残るのが余り。",
    ],
    example: () => ({ n: 3425, d: 43 }),
    exSteps: (ex, lang) => {
      const n = ex.n as number, d = ex.d as number;
      const q = Math.floor(n / d), r = n % d;
      if (lang === "ja")
        return [
          [`${fmt(n)} ÷ ${d}`, `本体 ${Math.floor(d / 10)}・旗 ${d % 10}`],
          ["わる → 旗×商 → 引く", "をくり返す"],
          ["商", `${fmt(q)}`],
          ["余り", `${r}`],
        ];
      return [
        [`${fmt(n)} ÷ ${d}`, `divisor ${Math.floor(d / 10)}, flag ${d % 10}`],
        ["divide → flag × quotient → subtract", "and repeat"],
        ["quotient", `${fmt(q)}`],
        ["remainder", `${r}`],
      ];
    },
    gen: (diff) => {
      const d = diff === "easy" ? ri(21, 49) : diff === "medium" ? ri(21, 89) : ri(31, 97);
      const q = diff === "easy" ? ri(11, 60) : diff === "medium" ? ri(20, 150) : ri(50, 400);
      const n = d * q + ri(0, d - 1);
      return { prompt: `${fmt(n)} ÷ ${d}  (quotient, rounded down)`, answer: Math.floor(n / d) };
    },
  },
  {
    id: "flagAboveBase",
    icon: "÷",
    grad: ["#0068A8", "#00C2FF"],
    illus: "ladder",
    title: "Flag Method — divisors above the base",
    titleJa: "フラッグ法 — 基準より上のわる数",
    sutraSa: "Dhvajāṅka · above base",
    sutraEn: "handling the remainder",
    sutraEnJa: "余りの直し方",
    blurb:
      "For a divisor just above its base — 32, 43, 72, 73 — use the tens digit as the divisor and the units as the flag. If a remainder comes out negative, add the divisor back and drop the quotient by one.",
    blurbJa:
      "32・43・72・73 のように基準より少し上のわる数では、十の位を本体、一の位を旗にします。余りがマイナスになったら、わる数を足して商を1減らします。",
    steps: [
      "Divisor just above its base: tens = divisor, units = flag.",
      "Run the flag method as usual.",
      "If a remainder turns negative, add the divisor to it.",
      "For each time you add, reduce the quotient by one.",
    ],
    stepsJa: [
      "基準より少し上のわる数：十の位が本体、一の位が旗。",
      "いつも通りフラッグ法を進める。",
      "余りがマイナスになったら、わる数を足す。",
      "足した回数だけ商を1ずつ減らす。",
    ],
    example: () => ({ n: 3425, d: 73 }),
    exSteps: (ex, lang) => {
      const n = ex.n as number, d = ex.d as number;
      const q = Math.floor(n / d), r = n % d;
      if (lang === "ja")
        return [
          [`${fmt(n)} ÷ ${d}`, `本体 ${Math.floor(d / 10)}・旗 ${d % 10}`],
          ["余りがマイナスなら", `+${d}、商は −1`],
          ["商", `${fmt(q)}`],
          ["余り", `${r}`],
        ];
      return [
        [`${fmt(n)} ÷ ${d}`, `divisor ${Math.floor(d / 10)}, flag ${d % 10}`],
        ["remainder negative?", `add ${d}, quotient −1`],
        ["quotient", `${fmt(q)}`],
        ["remainder", `${r}`],
      ];
    },
    gen: (diff) => {
      const tens = diff === "easy" ? ri(3, 5) : ri(3, 9);
      const d = tens * 10 + ri(1, 3);
      const q = diff === "easy" ? ri(11, 60) : diff === "medium" ? ri(20, 150) : ri(50, 400);
      const n = d * q + ri(0, d - 1);
      return { prompt: `${fmt(n)} ÷ ${d}  (quotient, rounded down)`, answer: Math.floor(n / d) };
    },
  },
  {
    id: "flagBelowBase",
    icon: "÷",
    grad: ["#6A15C4", "#8B5CF6"],
    illus: "ladder",
    title: "Flag Method — divisors below the base",
    titleJa: "フラッグ法 — 基準より下のわる数",
    sutraSa: "Dhvajāṅka · bar flag",
    sutraEn: "flag becomes a bar-digit",
    sutraEnJa: "旗がバーの数字になる",
    blurb:
      "For a divisor just below its base — 39, 49, 58, 67, 88 — round the tens up and let the flag be a bar digit: 49 becomes 5 with flag 1̄, 58 becomes 6 with flag 2̄. If the remainder ends up bigger than the divisor, divide once more.",
    blurbJa:
      "39・49・58・67・88 のように基準より少し下のわる数では、十の位を1つ上げ、旗をバーの数字にします。49 は 5 と旗 1̄、58 は 6 と旗 2̄。余りがわる数より大きければ、もう一度わります。",
    steps: [
      "Round the tens digit up by one.",
      "The flag is the bar digit: 10 minus the units.",
      "Run the flag method with that bar flag.",
      "If the remainder exceeds the divisor, subtract it and add one to the quotient.",
    ],
    stepsJa: [
      "十の位を1つ上げる。",
      "旗はバーの数字：10から一の位を引く。",
      "そのバーの旗でフラッグ法を進める。",
      "余りがわる数より大きければ、引いて商に1を足す。",
    ],
    example: () => ({ n: 3425, d: 58 }),
    exSteps: (ex, lang) => {
      const n = ex.n as number, d = ex.d as number;
      const q = Math.floor(n / d), r = n % d;
      const up = Math.floor(d / 10) + 1, bar = 10 - (d % 10);
      if (lang === "ja")
        return [
          [`${fmt(n)} ÷ ${d}`, `本体 ${up}・旗 ${bar}̄`],
          ["余りが大きすぎたら", `−${d}、商は +1`],
          ["商", `${fmt(q)}`],
          ["余り", `${r}`],
        ];
      return [
        [`${fmt(n)} ÷ ${d}`, `divisor ${up}, flag ${bar}̄`],
        ["remainder too big?", `subtract ${d}, quotient +1`],
        ["quotient", `${fmt(q)}`],
        ["remainder", `${r}`],
      ];
    },
    gen: (diff) => {
      const tens = diff === "easy" ? ri(3, 5) : ri(3, 8);
      const d = tens * 10 + ri(7, 9);
      const q = diff === "easy" ? ri(11, 60) : diff === "medium" ? ri(20, 150) : ri(50, 400);
      const n = d * q + ri(0, d - 1);
      return { prompt: `${fmt(n)} ÷ ${d}  (quotient, rounded down)`, answer: Math.floor(n / d) };
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

/* ---------- Number Blitz eligibility ----------
   Blitz is mental arithmetic against a clock with four options to compare, so a
   question has to be answerable in a few seconds and its answer small enough to
   hold in your head. Measured across 40 samples per difficulty:

     mult12to19, mult111, generalMult2d  — excluded by request
     balancing        348084  at medium — several steps, not mental
     squareStart5     357604  at medium — 3-digit squares
     baseAbove100      12320  at medium — one step, but 5-digit answers to compare

   Two are capped rather than dropped, because their easy form is the classic
   mental trick and only the larger variants run away:

     square5           95² = 9025   mental  |  115² = 13225   not
     specialMult1      96×94 = 9024 mental  |  238×232 = 55216 not

   A topic absent from this map is allowed at every difficulty. */
export const BLITZ_MAX_DIFF: Record<string, Difficulty | null> = {
  mult12to19: null,
  mult111: null,
  generalMult2d: null,
  balancing: null,
  squareStart5: null,
  baseAbove100: null,
  square5: "easy",
  specialMult1: "easy",

  /* World 7 and 8 additions. The flag methods and duplex squares are multi-step
     long-division and long-multiplication — real work on paper, not something to
     do against a five-second clock — and div99 runs to six figures. The sub-base
     multiplications stay in at their easy form, where 19 x 16 is a genuine
     one-step sutra, and are capped above that. */
  duplexSquare: null,
  div99: null,
  flagDivision: null,
  flagAboveBase: null,
  flagBelowBase: null,
  baseBelow20to90: "easy",
  baseAbove20to90: "easy",
};

export const BLITZ_TOPICS: Topic[] = TOPICS.filter((t) => BLITZ_MAX_DIFF[t.id] !== null);

const DIFF_ORDER: Difficulty[] = ["easy", "medium", "hard"];

/* Clamps a requested difficulty to what this topic may show in Blitz. */
export function blitzDiff(topicId: string, want: Difficulty): Difficulty {
  const cap = BLITZ_MAX_DIFF[topicId];
  if (cap === undefined || cap === null) return want;
  return DIFF_ORDER.indexOf(want) <= DIFF_ORDER.indexOf(cap) ? want : cap;
}

/* ---------- Blitz levels ----------
   Chosen rather than ramped-into, so a child can practise at a pace that suits
   them instead of having to survive the easy tiers every run. Each level keeps
   its own best score. */
export type BlitzLevel = {
  id: number;
  icon: string;
  name: string;
  nameJa: string;
  blurb: string;
  blurbJa: string;
  /* difficulties this level draws from, cycled as the score climbs */
  ladder: Difficulty[];
  /* answers per step up the ladder; 0 means it never climbs */
  step: number;
  startMs: number;
  minMs: number;
  decayMs: number;
};

export const BLITZ_LEVELS: BlitzLevel[] = [
  {
    id: 1,
    icon: "🌱",
    name: "Warm-up",
    nameJa: "ウォームアップ",
    blurb: "Easy questions, generous clock.",
    blurbJa: "やさしい問題、たっぷり時間。",
    ladder: ["easy"],
    step: 0,
    startMs: 11000,
    minMs: 7000,
    decayMs: 80,
  },
  {
    id: 2,
    icon: "⚡",
    name: "Steady",
    nameJa: "スタンダード",
    blurb: "Easy, then medium once you're going.",
    blurbJa: "やさしい問題から、だんだん中級へ。",
    ladder: ["easy", "easy", "medium"],
    step: 8,
    startMs: 9000,
    minMs: 4500,
    decayMs: 120,
  },
  {
    id: 3,
    icon: "🔥",
    name: "Quick",
    nameJa: "クイック",
    blurb: "Medium from the first question.",
    blurbJa: "最初から中級。",
    ladder: ["medium"],
    step: 0,
    startMs: 7500,
    minMs: 4000,
    decayMs: 140,
  },
  {
    id: 4,
    icon: "👹",
    name: "Sharp",
    nameJa: "エキスパート",
    blurb: "Medium into hard, and a fast clock.",
    blurbJa: "中級から上級へ、時間も短め。",
    ladder: ["medium", "hard"],
    step: 6,
    startMs: 6500,
    minMs: 3500,
    decayMs: 160,
  },
];

export function blitzLevel(id: number): BlitzLevel {
  return BLITZ_LEVELS.find((l) => l.id === id) ?? BLITZ_LEVELS[1];
}
