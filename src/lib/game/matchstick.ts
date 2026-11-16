export type GlyphType = "digit" | "op";
export type Glyph = { type: GlyphType; active: Record<string, boolean> };

export const DIGIT_SEGS: Record<string, string[]> = {
  "0": ["top", "ul", "ur", "ll", "lr", "bot"],
  "1": ["ur", "lr"],
  "2": ["top", "ur", "mid", "ll", "bot"],
  "3": ["top", "ur", "mid", "lr", "bot"],
  "4": ["ul", "ur", "mid", "lr"],
  "5": ["top", "ul", "mid", "lr", "bot"],
  "6": ["top", "ul", "mid", "ll", "lr", "bot"],
  "7": ["top", "ur", "lr"],
  "8": ["top", "ul", "ur", "mid", "ll", "lr", "bot"],
  "9": ["top", "ul", "ur", "mid", "lr", "bot"],
};

export function segSetKeyToDigit(setArr: string[]): string | null {
  const key = [...setArr].sort().join(",");
  for (const d in DIGIT_SEGS) {
    if ([...DIGIT_SEGS[d]].sort().join(",") === key) return d;
  }
  return null;
}

/* Three horizontal slots used to be drawn in every operator cell: a centred one
   for minus and plus, and a separate pair for equals. The pair's upper bar was
   redundant -- equals can reuse the centre bar as its top -- so the cell now
   offers two horizontals instead of three, and a minus becomes an equals by
   gaining a single stick, which is how the move works on a table. */
export const OP_ALL_SLOTS = ["h", "v", "h2"];
export const SYMBOL_SLOTS: Record<string, string[]> = {
  "-": ["h"],
  "+": ["h", "v"],
  "=": ["h", "h2"],
};
export function segSetKeyToOp(setArr: string[]): string | null {
  const key = [...setArr].sort().join(",");
  const map: Record<string, string> = { h: "-", "h,v": "+", "h,h2": "=" };
  return map[key] || null;
}

export function glyphDigit(d: string): Glyph {
  const g: Glyph = { type: "digit", active: {} };
  DIGIT_SEGS[d].forEach((s) => (g.active[s] = true));
  return g;
}
export function glyphOp(sym: string): Glyph {
  const g: Glyph = { type: "op", active: {} };
  SYMBOL_SLOTS[sym].forEach((s) => (g.active[s] = true));
  return g;
}

/* "15-16=8" → its glyphs, one per character */
const eq = (s: string): Glyph[] => [...s].map((c) => (c >= "0" && c <= "9" ? glyphDigit(c) : glyphOp(c)));

export type Puzzle = {
  id: string;
  par: number;
  start: () => Glyph[];
  hint: () => Glyph[];
  story: string;
  /* Japanese story; the first sentence (up to 。) is what is wrong, the rest is the answer */
  storyJa: string;
};

export const PUZZLES: Puzzle[] = [
  {
    id: "p1",
    par: 1,
    start: () => [glyphDigit("8"), glyphOp("-"), glyphDigit("3"), glyphOp("="), glyphDigit("1"), glyphDigit("2")],
    hint: () => [glyphDigit("9"), glyphOp("+"), glyphDigit("3"), glyphOp("="), glyphDigit("1"), glyphDigit("2")],
    story: "8 − 3 = 12 is wrong. One stick turns the 8 into a 9 and the − into a +.",
    storyJa: "8 − 3 = 12 はまちがい。1本動かすと、8が9に、−が＋に変わる。",
  },
  {
    id: "p2",
    par: 1,
    start: () => [glyphDigit("6"), glyphOp("+"), glyphDigit("4"), glyphOp("="), glyphDigit("4")],
    hint: () => [glyphDigit("0"), glyphOp("+"), glyphDigit("4"), glyphOp("="), glyphDigit("4")],
    story: "6 + 4 = 4 is wrong. One stick move turns the 6 into a 0.",
    storyJa: "6 + 4 = 4 はまちがい。1本動かすと、6が0に変わる。",
  },
  {
    id: "p3",
    par: 1,
    start: () => [glyphDigit("1"), glyphOp("-"), glyphDigit("6"), glyphOp("="), glyphDigit("7")],
    hint: () => [glyphDigit("7"), glyphOp("-"), glyphDigit("6"), glyphOp("="), glyphDigit("1")],
    story: "1 − 6 = 7 is wrong. Move the top stick from the last digit over to the first.",
    storyJa: "1 − 6 = 7 はまちがい。最後の数字の上の1本を、最初の数字へ動かそう。",
  },
  {
    id: "p4",
    par: 1,
    start: () => [glyphDigit("6"), glyphOp("-"), glyphDigit("4"), glyphOp("="), glyphDigit("3")],
    hint: () => [glyphDigit("6"), glyphOp("-"), glyphDigit("4"), glyphOp("="), glyphDigit("2")],
    story: "6 − 4 = 3 is wrong. Slide the last digit's lower-right stick over to lower-left.",
    storyJa: "6 − 4 = 3 はまちがい。最後の数字の右下の1本を、左下へ動かそう。",
  },
  {
    id: "p5",
    par: 1,
    start: () => [glyphDigit("2"), glyphOp("+"), glyphDigit("2"), glyphOp("="), glyphDigit("5")],
    hint: () => [glyphDigit("3"), glyphOp("+"), glyphDigit("2"), glyphOp("="), glyphDigit("5")],
    story: "2 + 2 = 5 is wrong. One stick move turns the first 2 into a 3.",
    storyJa: "2 + 2 = 5 はまちがい。1本動かすと、最初の2が3に変わる。",
  },
  {
    id: "p6",
    par: 1,
    start: () => [glyphDigit("5"), glyphOp("+"), glyphDigit("5"), glyphOp("="), glyphDigit("8")],
    hint: () => [glyphDigit("3"), glyphOp("+"), glyphDigit("5"), glyphOp("="), glyphDigit("8")],
    story: "5 + 5 = 8 is wrong. One stick move turns the first 5 into a 3.",
    storyJa: "5 + 5 = 8 はまちがい。1本動かすと、最初の5が3に変わる。",
  },
  {
    id: "p7",
    par: 1,
    start: () => [glyphDigit("0"), glyphOp("+"), glyphDigit("3"), glyphOp("="), glyphDigit("1"), glyphDigit("2")],
    hint: () => [glyphDigit("9"), glyphOp("+"), glyphDigit("3"), glyphOp("="), glyphDigit("1"), glyphDigit("2")],
    story: "0 + 3 = 12 is wrong. One stick move turns the 0 into a 9.",
    storyJa: "0 + 3 = 12 はまちがい。1本動かすと、0が9に変わる。",
  },
  {
    id: "p8",
    par: 1,
    start: () => [glyphDigit("9"), glyphOp("+"), glyphDigit("3"), glyphOp("="), glyphDigit("9")],
    hint: () => [glyphDigit("6"), glyphOp("+"), glyphDigit("3"), glyphOp("="), glyphDigit("9")],
    story: "9 + 3 = 9 is wrong. One stick move turns the 9 into a 6.",
    storyJa: "9 + 3 = 9 はまちがい。1本動かすと、9が6に変わる。",
  },
  /* from "Matchsticks Puzzle for App" (Nov 2026) */
  {
    id: "p9",
    par: 1,
    start: () => eq("9+5=9"),
    hint: () => eq("3+6=9"),
    story: "9 + 5 = 9 is wrong. Move one stick from the first 9 to the 5: 3 + 6 = 9. (3 + 5 = 8 works too!)",
    storyJa: "9 + 5 = 9 はまちがい。最初の9から1本を5に動かすと 3 + 6 = 9。（3 + 5 = 8 でもOK！）",
  },
  {
    id: "p10",
    par: 1,
    start: () => eq("0+7=1"),
    hint: () => eq("8-7=1"),
    story: "0 + 7 = 1 is wrong. Move the upright stick of the + into the middle of the 0: 8 − 7 = 1.",
    storyJa: "0 + 7 = 1 はまちがい。＋のたての1本を0のまん中に動かすと 8 − 7 = 1。",
  },
  {
    id: "p11",
    par: 1,
    start: () => eq("1+7=0"),
    hint: () => eq("7-7=0"),
    story: "1 + 7 = 0 is wrong. Move the upright stick of the + to the top of the 1: 7 − 7 = 0.",
    storyJa: "1 + 7 = 0 はまちがい。＋のたての1本を1の上に動かすと 7 − 7 = 0。",
  },
  {
    id: "p12",
    par: 1,
    start: () => eq("7-5=6"),
    hint: () => eq("1+5=6"),
    story: "7 − 5 = 6 is wrong. Move the top stick of the 7 onto the − to make a +: 1 + 5 = 6.",
    storyJa: "7 − 5 = 6 はまちがい。7の上の1本を−にたてて＋にすると 1 + 5 = 6。",
  },
  {
    id: "p13",
    par: 1,
    start: () => eq("15+0=7"),
    hint: () => eq("15-8=7"),
    story: "15 + 0 = 7 is wrong. Move the upright stick of the + into the middle of the 0: 15 − 8 = 7.",
    storyJa: "15 + 0 = 7 はまちがい。＋のたての1本を0のまん中に動かすと 15 − 8 = 7。",
  },
  {
    id: "p14",
    par: 1,
    start: () => eq("7-0=1"),
    hint: () => eq("7-6=1"),
    story: "7 − 0 = 1 is wrong. Move the top-right stick of the 0 to its middle: 7 − 6 = 1. (1 + 0 = 1 works too!)",
    storyJa: "7 − 0 = 1 はまちがい。0の右上の1本をまん中に動かすと 7 − 6 = 1。（1 + 0 = 1 でもOK！）",
  },
  {
    id: "p15",
    par: 1,
    start: () => eq("9-5=9"),
    hint: () => eq("9-6=3"),
    story: "9 − 5 = 9 is wrong. Move one stick from the last 9 to the 5: 9 − 6 = 3. (8 − 5 = 3 works too!)",
    storyJa: "9 − 5 = 9 はまちがい。最後の9から1本を5に動かすと 9 − 6 = 3。（8 − 5 = 3 でもOK！）",
  },
  {
    id: "p16",
    par: 1,
    start: () => eq("15-16=8"),
    hint: () => eq("16-16=0"),
    story: "15 − 16 = 8 is wrong. Move the middle stick of the 8 to the 5: 16 − 16 = 0.",
    storyJa: "15 − 16 = 8 はまちがい。8のまん中の1本を5に動かすと 16 − 16 = 0。",
  },
  {
    id: "p17",
    par: 1,
    start: () => eq("3+6=14"),
    hint: () => eq("9+5=14"),
    story: "3 + 6 = 14 is wrong. Move the bottom-left stick of the 6 to the 3: 9 + 5 = 14.",
    storyJa: "3 + 6 = 14 はまちがい。6の左下の1本を3に動かすと 9 + 5 = 14。",
  },
  {
    id: "p18",
    par: 1,
    start: () => eq("10-5=14"),
    hint: () => eq("19-5=14"),
    story: "10 − 5 = 14 is wrong. Move the bottom-left stick of the 0 to its middle: 19 − 5 = 14.",
    storyJa: "10 − 5 = 14 はまちがい。0の左下の1本をまん中に動かすと 19 − 5 = 14。",
  },
  {
    id: "p19",
    par: 1,
    start: () => eq("3-8=3"),
    hint: () => eq("3+0=3"),
    story: "3 − 8 = 3 is wrong. Move the middle stick of the 8 onto the − to make a +: 3 + 0 = 3. (9 − 6 = 3 works too!)",
    storyJa: "3 − 8 = 3 はまちがい。8のまん中の1本を−にたてて＋にすると 3 + 0 = 3。（9 − 6 = 3 でもOK！）",
  },
  {
    id: "p20",
    par: 1,
    start: () => eq("6-7=7"),
    hint: () => eq("6+1=7"),
    story: "6 − 7 = 7 is wrong. Move the top stick of the first 7 onto the − to make a +: 6 + 1 = 7. (8 − 1 = 7 works too!)",
    storyJa: "6 − 7 = 7 はまちがい。最初の7の上の1本を−にたてて＋にすると 6 + 1 = 7。（8 − 1 = 7 でもOK！）",
  },
  {
    id: "p21",
    par: 1,
    start: () => eq("12-6=7"),
    hint: () => eq("13-6=7"),
    story: "12 − 6 = 7 is wrong. Move the bottom-left stick of the 2 to the bottom-right: 13 − 6 = 7.",
    storyJa: "12 − 6 = 7 はまちがい。2の左下の1本を右下に動かすと 13 − 6 = 7。",
  },
  {
    id: "p22",
    par: 1,
    start: () => eq("5+18=19"),
    hint: () => eq("9+10=19"),
    story: "5 + 18 = 19 is wrong. Move the middle stick of the 8 to the 5: 9 + 10 = 19.",
    storyJa: "5 + 18 = 19 はまちがい。8のまん中の1本を5に動かすと 9 + 10 = 19。",
  },
  {
    id: "p23",
    par: 1,
    start: () => eq("1-9=2"),
    hint: () => eq("7-5=2"),
    story: "1 − 9 = 2 is wrong. Move the top-right stick of the 9 to the top of the 1: 7 − 5 = 2.",
    storyJa: "1 − 9 = 2 はまちがい。9の右上の1本を1の上に動かすと 7 − 5 = 2。",
  },
  {
    id: "p24",
    par: 1,
    start: () => eq("3+19=10"),
    hint: () => eq("3+15=18"),
    story: "3 + 19 = 10 is wrong. Move the top-right stick of the 9 into the middle of the 0: 3 + 15 = 18.",
    storyJa: "3 + 19 = 10 はまちがい。9の右上の1本を0のまん中に動かすと 3 + 15 = 18。",
  },
];
export const TRAY_SIZE = 2;

export const SEG_LINE: Record<string, [number, number, number, number]> = {
  top: [6, 4, 40, 4],
  ul: [4, 6, 4, 44],
  ur: [42, 6, 42, 44],
  mid: [6, 46, 40, 46],
  ll: [4, 48, 4, 86],
  lr: [42, 48, 42, 86],
  bot: [6, 88, 40, 88],
};
export const SEG_TIP: Record<string, "start" | "end"> = {
  top: "end",
  ul: "start",
  ur: "end",
  mid: "start",
  ll: "start",
  lr: "end",
  bot: "start",
};
/* Longer than the old 36 so the operators read at the same weight as the digits
   beside them; the vertical is centred on the horizontal so a plus crosses true. */
export const OP_GEO: Record<string, [number, number, number, number]> = {
  h: [2, 40, 42, 40],
  v: [22, 20, 22, 60],
  h2: [2, 60, 42, 60],
};
export const OP_TIP: Record<string, "start" | "end"> = {
  h: "end",
  v: "start",
  h2: "start",
};

export function slotsFor(g: Glyph): string[] {
  return g.type === "digit" ? Object.keys(SEG_LINE) : OP_ALL_SLOTS;
}

export function cloneGlyphs(gs: Glyph[]): Glyph[] {
  return gs.map((g) => ({ type: g.type, active: { ...g.active } }));
}

export function currentEquationText(glyphs: Glyph[]): { text: string; valid: boolean; parts: string[] } {
  const parts: string[] = [];
  let num = "";
  let valid = true;
  for (const g of glyphs) {
    if (g.type === "digit") {
      const d = segSetKeyToDigit(Object.keys(g.active).filter((k) => g.active[k]));
      if (d === null) {
        valid = false;
        num += "?";
      } else {
        num += d;
      }
    } else {
      if (num !== "") {
        parts.push(num);
        num = "";
      }
      const sym = segSetKeyToOp(Object.keys(g.active).filter((k) => g.active[k]));
      if (sym === null) {
        valid = false;
        parts.push("?");
      } else {
        parts.push(sym);
      }
    }
  }
  if (num !== "") parts.push(num);
  return { text: parts.join(" "), valid, parts };
}

export function evalEquation(parts: string[]): boolean {
  const eqIdx = parts.indexOf("=");
  if (eqIdx < 0) return false;
  const lhs = parts.slice(0, eqIdx).join("");
  const rhs = parts.slice(eqIdx + 1).join("");
  if (!/^[0-9+-]+$/.test(lhs) || !/^[0-9]+$/.test(rhs)) return false;
  try {
    const val = new Function(`"use strict";return (${lhs})`)();
    return val === Number(rhs);
  } catch {
    return false;
  }
}
