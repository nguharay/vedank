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
        // formula-based topics: verify the "trick" answer against direct arithmetic on the prompt
        const mult = r.prompt.match(/^(\d+) × (\d+)$/);
        if (mult && (t.id === "balancing" || t.id === "baseBelow100" || t.id === "baseAbove100")) {
          const [, a, b] = mult;
          if (Number(a) * Number(b) !== r.answer) fails.push(`${t.id} mult mismatch: ${r.prompt} -> ${r.answer}`);
        }
        const times9or111 = r.prompt.match(/^(\d+) × (9|111)$/);
        if (times9or111 && (t.id === "mult9" || t.id === "mult111")) {
          const [, n, factor] = times9or111;
          if (Number(n) * Number(factor) !== r.answer) fails.push(`${t.id} mismatch: ${r.prompt} -> ${r.answer}`);
        }
        const addM = r.prompt.match(/^(\d+) \+ (\d+)$/);
        if (addM && t.id === "additionGeneral") {
          const [, a, b] = addM;
          if (Number(a) + Number(b) !== r.answer) fails.push(`additionGeneral mismatch: ${r.prompt} -> ${r.answer}`);
        }
        const subM = r.prompt.match(/^([\d,]+) − ([\d,]+)$/);
        if (subM && (t.id === "subtractionGeneral" || t.id === "subOtherThan10s")) {
          const a = Number(subM[1].replace(/,/g, "")), b = Number(subM[2].replace(/,/g, ""));
          if (a - b !== r.answer) fails.push(`${t.id} mismatch: ${r.prompt} -> ${r.answer}`);
          if (a <= b) fails.push(`${t.id} non-positive operands: ${r.prompt}`);
        }
        const divM = r.prompt.match(/^(\d+) ÷ 8/);
        const sq5 = r.prompt.match(/^(\d+)²$/);
        if (sq5 && t.id === "squareStart5") {
          const n = Number(sq5[1]);
          if (n * n !== r.answer) fails.push(`squareStart5 mismatch: ${r.prompt} -> ${r.answer}`);
          if (!/^5/.test(sq5[1])) fails.push(`squareStart5 doesn't start with 5: ${sq5[1]}`);
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

/* Report the verdict in the exit code too. This printed "fails N" and then
   exited 0, so a generator regression could not break a chained run. */
if (fails.length) console.log(`\n${fails.length} FAILED`);
else console.log("\nall generator checks passed");
process.exit(fails.length ? 1 : 0);
