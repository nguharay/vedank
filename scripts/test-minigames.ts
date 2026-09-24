import { buildMatchRound, isPair, matchScore, buildBiggerPair, biggerScore } from "../src/lib/game/minigames";

const fails: string[] = [];
const ok = (l: string, c: boolean) => { if (!c) fails.push(l); };

for (let r = 0; r < 300; r++) {
  const { tiles, pairs } = buildMatchRound(6);
  ok("a full round is built", pairs === 6);
  ok("two tiles per pair", tiles.length === pairs * 2);

  /* The rule the whole game rests on. */
  const answers = tiles.filter((t) => t.kind === "ans").map((t) => t.value);
  ok("every answer is unique", new Set(answers).size === answers.length);

  /* Each pairId appears exactly once as an expression and once as an answer. */
  for (let p = 0; p < pairs; p++) {
    const of = tiles.filter((t) => t.pairId === p);
    ok("a pair is one expression and one answer",
      of.length === 2 && of.filter((t) => t.kind === "expr").length === 1);
    ok("both halves agree on the value", of[0].value === of[1].value);
    ok("the pair matches itself", isPair(of[0], of[1]) && isPair(of[1], of[0]));
  }

  /* Nothing pairs with itself, or with the wrong problem. */
  ok("a tile never pairs with itself", tiles.every((t) => !isPair(t, t)));
  const [x, y] = [tiles.find((t) => t.pairId === 0 && t.kind === "expr")!,
                  tiles.find((t) => t.pairId === 1 && t.kind === "ans")!];
  ok("different problems do not pair", !isPair(x, y));
  ok("tiles stay readable", tiles.every((t) => t.text.length <= 16));
  /* A tile is shown with no lesson beside it, so the prompt has to stand
     alone — no bar notation, no pipe-separated lists. */
  ok("every prompt stands on its own",
    tiles.filter((t) => t.kind === "expr").every((t) => !/[|\u0304\u0305]/.test(t.text)));
}

/* Scoring: mistakes cost more than seconds, and it never goes negative. */
ok("a clean fast round beats a sloppy one", matchScore(6, 20, 0) > matchScore(6, 20, 4));
ok("faster wins a tie", matchScore(6, 10, 1) > matchScore(6, 40, 1));
ok("score never goes negative", matchScore(1, 9999, 9999) === 0);

/* ---------- Which is Bigger ---------- */
for (let r = 0; r < 400; r++) {
  const { left, right } = buildBiggerPair();
  ok("the two sides never tie", left.answer !== right.answer);
  ok("both sides are real numbers", Number.isFinite(left.answer) && Number.isFinite(right.answer));
  ok("both prompts fit a card", left.prompt.length <= 20 && right.prompt.length <= 20);
  /* A round you win by glancing at the digit count is not arithmetic. */
  const hi = Math.max(Math.abs(left.answer), Math.abs(right.answer));
  const lo = Math.min(Math.abs(left.answer), Math.abs(right.answer));
  ok("the sides stay comparable", hi <= lo * 12 + 10);
  ok("both prompts stand on their own",
    !/[|\u0304\u0305]/.test(left.prompt) && !/[|\u0304\u0305]/.test(right.prompt));
}
ok("a longer streak scores more", biggerScore(7) > biggerScore(3));
ok("no streak scores nothing", biggerScore(0) === 0);

if (fails.length) {
  console.error("mini-games FAILED:\n  " + [...new Set(fails)].join("\n  "));
  process.exit(1);
}
console.log("mini-games hold up (300 match rounds, 400 bigger pairs)");
