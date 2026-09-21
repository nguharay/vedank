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

export const OP_ALL_SLOTS = ["h", "v", "h1", "h2"];
export const SYMBOL_SLOTS: Record<string, string[]> = {
  "-": ["h"],
  "+": ["h", "v"],
  "=": ["h1", "h2"],
};
export function segSetKeyToOp(setArr: string[]): string | null {
  const key = [...setArr].sort().join(",");
  const map: Record<string, string> = { h: "-", "h,v": "+", "h1,h2": "=" };
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

export type Puzzle = {
  id: string;
  par: number;
  start: () => Glyph[];
  hint: () => Glyph[];
  story: string;
};

export const PUZZLES: Puzzle[] = [
  {
    id: "p1",
    par: 1,
    start: () => [glyphDigit("8"), glyphOp("-"), glyphDigit("3"), glyphOp("="), glyphDigit("1"), glyphDigit("2")],
    hint: () => [glyphDigit("9"), glyphOp("+"), glyphDigit("3"), glyphOp("="), glyphDigit("1"), glyphDigit("2")],
    story: "8 − 3 = 12 is wrong. One stick turns the 8 into a 9 and the − into a +.",
  },
  {
    id: "p2",
    par: 1,
    start: () => [glyphDigit("6"), glyphOp("+"), glyphDigit("4"), glyphOp("="), glyphDigit("4")],
    hint: () => [glyphDigit("0"), glyphOp("+"), glyphDigit("4"), glyphOp("="), glyphDigit("4")],
    story: "6 + 4 = 4 is wrong. One stick move turns the 6 into a 0.",
  },
  {
    id: "p3",
    par: 1,
    start: () => [glyphDigit("1"), glyphOp("-"), glyphDigit("6"), glyphOp("="), glyphDigit("7")],
    hint: () => [glyphDigit("7"), glyphOp("-"), glyphDigit("6"), glyphOp("="), glyphDigit("1")],
    story: "1 − 6 = 7 is wrong. Move the top stick from the last digit over to the first.",
  },
  {
    id: "p4",
    par: 1,
    start: () => [glyphDigit("6"), glyphOp("-"), glyphDigit("4"), glyphOp("="), glyphDigit("3")],
    hint: () => [glyphDigit("6"), glyphOp("-"), glyphDigit("4"), glyphOp("="), glyphDigit("2")],
    story: "6 − 4 = 3 is wrong. Slide the last digit's lower-right stick over to lower-left.",
  },
  {
    id: "p5",
    par: 1,
    start: () => [glyphDigit("2"), glyphOp("+"), glyphDigit("2"), glyphOp("="), glyphDigit("5")],
    hint: () => [glyphDigit("3"), glyphOp("+"), glyphDigit("2"), glyphOp("="), glyphDigit("5")],
    story: "2 + 2 = 5 is wrong. One stick move turns the first 2 into a 3.",
  },
  {
    id: "p6",
    par: 1,
    start: () => [glyphDigit("5"), glyphOp("+"), glyphDigit("5"), glyphOp("="), glyphDigit("8")],
    hint: () => [glyphDigit("3"), glyphOp("+"), glyphDigit("5"), glyphOp("="), glyphDigit("8")],
    story: "5 + 5 = 8 is wrong. One stick move turns the first 5 into a 3.",
  },
  {
    id: "p7",
    par: 1,
    start: () => [glyphDigit("0"), glyphOp("+"), glyphDigit("3"), glyphOp("="), glyphDigit("1"), glyphDigit("2")],
    hint: () => [glyphDigit("9"), glyphOp("+"), glyphDigit("3"), glyphOp("="), glyphDigit("1"), glyphDigit("2")],
    story: "0 + 3 = 12 is wrong. One stick move turns the 0 into a 9.",
  },
  {
    id: "p8",
    par: 1,
    start: () => [glyphDigit("9"), glyphOp("+"), glyphDigit("3"), glyphOp("="), glyphDigit("9")],
    hint: () => [glyphDigit("6"), glyphOp("+"), glyphDigit("3"), glyphOp("="), glyphDigit("9")],
    story: "9 + 3 = 9 is wrong. One stick move turns the 9 into a 6.",
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
export const OP_GEO: Record<string, [number, number, number, number]> = {
  h: [2, 46, 38, 46],
  v: [20, 20, 20, 72],
  h1: [2, 28, 38, 28],
  h2: [2, 64, 38, 64],
};
export const OP_TIP: Record<string, "start" | "end"> = {
  h: "end",
  v: "start",
  h1: "end",
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
    // eslint-disable-next-line no-new-func
    const val = new Function(`"use strict";return (${lhs})`)();
    return val === Number(rhs);
  } catch {
    return false;
  }
}
