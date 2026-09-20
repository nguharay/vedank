import { TOPICS, makeDistractors } from "../src/lib/game/topics";
import {
  PUZZLES,
  cloneGlyphs,
  currentEquationText,
  evalEquation,
  slotsFor,
} from "../src/lib/game/matchstick";

function digitSumFn(n: number) {
  return n === 0 ? 0 : 1 + ((n - 1) % 9);
}

let trials = 0;
const fails: string[] = [];

for (const t of TOPICS) {
  for (const diff of ["easy", "medium", "hard"] as const) {
    for (let i = 0; i < 300; i++) {
      trials++;
      try {
        const r = t.gen(diff);
        if (typeof r.answer !== "number" || Number.isNaN(r.answer)) {
          fails.push(`${t.id}/${diff}: bad ${JSON.stringify(r)}`);
        }
        if (t.id === "digitsum") {
          const m = r.prompt.match(/of ([\d,]+)/);
          const n = Number(m![1].replace(/,/g, ""));
          if (digitSumFn(n) !== r.answer) fails.push(`digitsum mismatch ${n}`);
        }
        const d3 = makeDistractors(r.answer, 3);
        const d5 = makeDistractors(r.answer, 5);
        if (new Set(d3).size !== 3 || d3.includes(r.answer)) fails.push(`${t.id} bad d3 ${JSON.stringify(d3)}`);
        if (new Set(d5).size !== 5 || d5.includes(r.answer)) fails.push(`${t.id} bad d5 ${JSON.stringify(d5)}`);
      } catch (e) {
        fails.push(`${t.id}/${diff} threw: ${(e as Error).message}`);
      }
    }
  }
}
console.log("gen trials", trials, "fails", fails.length);
fails.slice(0, 10).forEach((f) => console.log(" -", f));

// matchstick puzzles: simulate the single-move solve
for (const pz of PUZZLES) {
  const start = pz.start();
  const target = pz.hint();
  const glyphs = cloneGlyphs(start);
  let from: { gi: number; slot: string } | null = null;
  let to: { gi: number; slot: string } | null = null;
  for (let gi = 0; gi < glyphs.length; gi++) {
    for (const slot of slotsFor(glyphs[gi])) {
      const cur = !!glyphs[gi].active[slot];
      const want = !!target[gi].active[slot];
      if (cur && !want && !from) from = { gi, slot };
      if (!cur && want && !to) to = { gi, slot };
    }
  }
  if (!from || !to) {
    console.log(pz.id, "NO SINGLE MOVE FOUND (bug!)");
    continue;
  }
  glyphs[from.gi].active[from.slot] = false;
  glyphs[to.gi].active[to.slot] = true;
  const eq = currentEquationText(glyphs);
  console.log(pz.id, eq.text, "valid=" + eq.valid, "true=" + (eq.valid && evalEquation(eq.parts)));
}
