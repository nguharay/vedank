import { pass, expired, turnSeconds, newGame, play, findWinner, cpuMove, roomCode, normaliseRoomCode, type TTTState, type Mark, type TTTLevel } from "../src/lib/game/ttt";
const fails: string[] = [];
const ok = (l: string, c: boolean) => { if (!c) fails.push(l); };

for (let r = 0; r < 300; r++) {
  const g = newGame("X", 2);
  ok("nine squares", g.cells.length === 9);
  ok("every square has a sum with the answer among 3 options",
    g.cells.every((c) => c.options.length === 3 && c.options.includes(c.answer) && new Set(c.options).size === 3));
  ok("X starts", g.turn === "X" && g.winner === null);

  /* right answer claims; wrong answer passes and redraws the sum */
  const c0 = g.cells[0];
  const right = play(g, 0, c0.answer);
  ok("correct claim is owned by X", right.cells[0].owner === "X" && right.turn === "O");
  const wrongOpt = c0.options.find((o) => o !== c0.answer)!;
  const wrong = play(g, 0, wrongOpt);
  ok("wrong answer leaves the square open", wrong.cells[0].owner === null);
  ok("wrong answer still passes the turn", wrong.turn === "O");
  ok("wrong answer redraws the sum", wrong.cells[0].prompt !== c0.prompt || wrong.cells[0].answer !== c0.answer);
  ok("illegal: claiming an owned square is a no-op", play(right, 0, right.cells[0].answer) === right);
}

/* level 1 is plain: any tap claims, no options */
for (let r = 0; r < 100; r++) {
  const g = newGame("X", 1);
  ok("level 1 has no sums", g.cells.every((c) => c.prompt === "" && c.options.length === 0));
  const s1 = play(g, 4, -999);
  ok("level 1 claims on any answer", s1.cells[4].owner === "X" && s1.turn === "O");
}
/* level 3 sums are the book's tricks and still have one right option */
for (let r = 0; r < 200; r++) {
  const g = newGame("X", 3);
  ok("level 3 squares carry answerable sums", g.cells.every((c) => c.options.length === 3 && c.options.includes(c.answer)));
  ok("level 3 prompts are the harder kind", g.cells.every((c) => /²|× 11|\+ [123]9$|^100 −/.test(c.prompt)));
}

/* winner detection on all eight lines */
const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
for (const L of LINES) {
  const cells = newGame().cells.map((c, i) => ({ ...c, owner: (L.includes(i) ? "O" : null) as Mark | null }));
  const w = findWinner(cells);
  ok(`line ${L} wins`, w.winner === "O" && JSON.stringify(w.line) === JSON.stringify(L));
}
ok("full board with no line is a draw",
  findWinner(newGame().cells.map((c, i) => ({ ...c, owner: (["X","O","X","X","O","O","O","X","X"][i]) as Mark }))).winner === "draw");

/* the CPU never loses when it plays perfectly (it answers its own sums) */
let cpuLosses = 0;
for (let r = 0; r < 200; r++) {
  let s: TTTState = newGame("X");
  while (!s.winner) {
    if (s.turn === "X") {              /* random human */
      const open = s.cells.map((c, i) => (c.owner ? -1 : i)).filter((i) => i >= 0);
      const i = open[Math.floor(Math.random() * open.length)];
      s = play(s, i, s.cells[i].answer);
    } else {
      const i = cpuMove(s.cells, "O");
      s = play(s, i, s.cells[i].answer);
    }
  }
  if (s.winner === "X") cpuLosses++;
}
ok(`perfect CPU never loses (lost ${cpuLosses})`, cpuLosses === 0);
ok("cpu returns -1 on a full board", cpuMove(newGame().cells.map((c) => ({ ...c, owner: "X" as Mark })), "O") === -1);
ok("cpu takes an immediate win", (() => {
  const cells = newGame().cells.map((c, i) => ({ ...c, owner: ([ "O","O",null, "X","X",null, null,null,null][i]) as Mark | null }));
  return cpuMove(cells, "O") === 2;
})());
ok("cpu blocks an immediate loss", (() => {
  const cells = newGame().cells.map((c, i) => ({ ...c, owner: ([ "X","X",null, "O",null,null, null,null,null][i]) as Mark | null }));
  return cpuMove(cells, "O") === 2;
})());

/* room codes */
for (let r = 0; r < 200; r++) { const c = roomCode(); ok("code is 4 unambiguous chars", /^[ACDEFGHJKLMNPQRTUVWXY34679]{4}$/.test(c)); }
ok("code normalises", normaliseRoomCode(" ab-c9 ") === "ABC9");

/* the per-turn clock */
{
  const g = newGame("X", 2, 1000);
  ok("clock starts with the game", g.turnAt === 1000 && !expired(g, 1000 + turnSeconds(2) * 1000));
  ok("overrun is detected", expired(g, 1000 + turnSeconds(2) * 1000 + 2000));
  const p = pass(g, 5000);
  ok("pass flips the turn and restarts the clock", p.turn === "O" && p.turnAt === 5000 && p.cells.every((c) => !c.owner));
  const mv = play(g, 0, g.cells[0].answer, 7000);
  ok("a move restarts the clock", mv.turnAt === 7000);
  ok("level 1 gets the shortest turn", turnSeconds(1) < turnSeconds(2) && turnSeconds(2) < turnSeconds(3));
  /* the easy levels really are easy */
  for (let r = 0; r < 300; r++) {
    ok("level 2 answers stay under 50", newGame("X", 2).cells.every((c) => c.answer <= 50));
    ok("level 3 answers stay under 2100", newGame("X", 3).cells.every((c) => c.answer <= 2100));
  }
}

if (fails.length) { console.error("ttt FAILED:\n  " + [...new Set(fails)].join("\n  ")); process.exit(1); }
console.log("tic-tac-toe holds up (3 levels, 8 lines, 200 CPU games unlost)");
