import { buildPopRound, popUpMs, popPoints, buildMatchRound, isPair, matchScore, digitSum,
  dailySeed, dailyGameId, QUICK_GAMES } from "../src/lib/game/minigames";
import { seededRandom, withSeededRandom } from "../src/lib/game/daily";

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

/* digitSum drives the Digit Sum quick game, so pin it directly. */
ok("digit sum folds to one figure", digitSum(1192) === 4);
ok("multiples of nine fold to nine", digitSum(99) === 9 && digitSum(81) === 9);
ok("single figures are themselves", digitSum(7) === 7);

/* ---------- Game of the Day ---------- */
{
  /* The same day must give the same board, or comparing scores is nonsense. */
  const boardFor = (key: string) =>
    withSeededRandom(seededRandom(dailySeed(key)), () => buildMatchRound(6))
      .tiles.map((t) => t.text).join("|");
  ok("the same day gives the same board", boardFor("2026-03-09") === boardFor("2026-03-09"));
  ok("a different day gives a different board", boardFor("2026-03-09") !== boardFor("2026-03-10"));
  ok("the seed is stable", dailySeed("2026-03-09") === dailySeed("2026-03-09"));
  ok("different dates seed differently", dailySeed("2026-03-09") !== dailySeed("2026-03-10"));
  /* Over a month it should not stick on one game. */
  const ids = new Set(
    Array.from({ length: 30 }, (_, i) => dailyGameId(`2026-04-${String(i + 1).padStart(2, "0")}`))
  );
  ok("the daily game rotates", ids.size === 2);
}

/* ---------- Quick games: every round must be answerable, once ---------- */
for (const g of QUICK_GAMES) {
  for (let r = 0; r < 200; r++) {
    const q = g.next(r % 12, r % 2 ? "ja" : "en");
    ok(`${g.id}: has options`, q.options.length >= 2 && q.options.length <= 4);
    ok(`${g.id}: answer index in range`, q.answer >= 0 && q.answer < q.options.length);
    ok(`${g.id}: options distinct`, new Set(q.options).size === q.options.length);
    ok(`${g.id}: has a note`, q.noteJa.length > 0 && q.noteEn.length > 0);
    ok(`${g.id}: prompt not empty`, q.prompt.length > 0 && q.prompt.length <= 40);
    /* Where the answer can be recomputed, the marked option must be it. */
    const chosen = q.options[q.answer];
    if (g.id === "x11") { const n = Number(q.prompt.split(" ")[0]); ok("x11 correct", Number(chosen.replace(/,/g, "")) === n * 11); }
    if (g.id === "sq5") { const n = Number(q.prompt.replace("²", "")); ok("sq5 correct", Number(chosen.replace(/,/g, "")) === n * n); }
    if (g.id === "digitsum") { const n = Number(q.prompt.replace(/,/g, "")); ok("digitsum correct", Number(chosen) === digitSum(n)); }
  }
}
ok("three quick games", QUICK_GAMES.length === 3);
ok("quick game ids unique", new Set(QUICK_GAMES.map((g) => g.id)).size === QUICK_GAMES.length);


/* Number Pop */
for (let r = 0; r < 300; r++) {
  const pr = buildPopRound(r % 20);
  const up = pr.holes.filter((h) => h !== null) as number[];
  ok("pop: three balloons, answer among them once", up.length === 3 && up.filter((v) => v === pr.answer).length === 1 && new Set(up).size === 3);
  ok("pop: decoys are positive", up.every((v) => v > 0));
  ok("pop: sums stay small (reflex game)", pr.answer <= 700);
}
ok("pop: balloons stay up less as you go, never under 1.1s", popUpMs(0) > popUpMs(10) && popUpMs(100) === 1100);
ok("pop: combo pays more, capped", popPoints(0) < popPoints(5) && popPoints(10) === popPoints(30));

if (fails.length) {
  console.error("mini-games FAILED:\n  " + [...new Set(fails)].join("\n  "));
  process.exit(1);
}
console.log("mini-games hold up (match, daily, pop, and 3 quick games x200 rounds)");
