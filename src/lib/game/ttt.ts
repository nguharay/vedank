/* Math Tic-Tac-Toe.
 
   Ordinary tic-tac-toe, except every square carries a small sum and you claim
   it by answering. A wrong answer passes the turn — so the game is decided by
   arithmetic under pressure, not just by who saw the fork first. Pure and
   serialisable, because the same board has to run pass-the-phone, against
   the CPU, and across two phones through a database row. */

export type Mark = "X" | "O";
/* 1 = plain tic-tac-toe, tap to claim. 2 = a quick sum guards each square.
   3 = harder sums. The CPU places perfectly from level 2. */
export type TTTLevel = 1 | 2 | 3;
export type Cell = { owner: Mark | null; prompt: string; answer: number; options: number[] };
export type Board = Cell[];
/* turnAt is when the current turn began (ms). Each side gets turnSeconds()
   per turn; overrun passes the turn. It is plain data so the server can
   settle an online clock lazily, on the next poll, with no timers at all. */
export type TTTState = { cells: Board; turn: Mark; winner: Mark | "draw" | null; line: number[] | null; level: TTTLevel; turnAt: number };

export function turnSeconds(level: TTTLevel): number { return level === 1 ? 8 : level === 2 ? 12 : 15; }
/* A little grace so a move sent at the buzzer is not refused by clock skew. */
export function expired(state: TTTState, now = Date.now()): boolean {
  return !state.winner && now - state.turnAt > turnSeconds(state.level) * 1000 + 1200;
}

const ri = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

/* Small, quick sums: a claim should take a few seconds, not a minute.
   Level 1 has no sum at all — the square is just a square. */
function makeSum(level: TTTLevel): { prompt: string; answer: number; options: number[] } {
  if (level === 1) return { prompt: "", answer: 0, options: [] };
  const kind = ri(0, 3);
  let a: number, b: number, answer: number, prompt: string;
  if (level === 2) {
    /* Mental-arithmetic warm-ups: a child should get these in a breath. */
    if (kind === 0) { a = ri(3, 9); b = ri(3, 9); answer = a + b; prompt = `${a} + ${b}`; }
    else if (kind === 1) { a = ri(11, 19); b = ri(2, 9); answer = a + b; prompt = `${a} + ${b}`; }
    else if (kind === 2) { a = ri(11, 20); b = ri(2, a - 2); answer = a - b; prompt = `${a} − ${b}`; }
    else { a = ri(2, 5); b = ri(2, 9); answer = a * b; prompt = `${a} × ${b}`; }
  } else {
    /* The book's tricks, on the friendliest numbers they work on. */
    if (kind === 0) { a = ri(1, 4) * 10 + 5; answer = a * a; prompt = `${a}²`; }
    else if (kind === 1) { a = ri(12, 45); answer = a * 11; prompt = `${a} × 11`; }
    else if (kind === 2) { a = ri(12, 60); b = ri(1, 3) * 10 + 9; answer = a + b; prompt = `${a} + ${b}`; }
    else { a = ri(11, 89); answer = 100 - a; prompt = `100 − ${a}`; }
  }
  const set = new Set<number>([answer]);
  for (const d of [1, -1, 10, -10, 2, -2, 9, -9, 11, -11]) {
    if (set.size >= 3) break;
    if (answer + d > 0) set.add(answer + d);
  }
  const options = [...set].sort(() => Math.random() - 0.5);
  return { prompt, answer, options };
}

export function newGame(first: Mark = "X", level: TTTLevel = 2, now = Date.now()): TTTState {
  return { cells: Array.from({ length: 9 }, () => ({ owner: null, ...makeSum(level) })), turn: first, winner: null, line: null, level, turnAt: now };
}

const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

export function findWinner(cells: Board): { winner: Mark | "draw" | null; line: number[] | null } {
  for (const L of LINES) {
    const [a, b, c] = L.map((i) => cells[i].owner);
    if (a && a === b && b === c) return { winner: a, line: L };
  }
  return { winner: cells.every((c) => c.owner) ? "draw" : null, line: null };
}

/* One move: the player on turn tries square `i` with `chosen`. Right claims
   it; wrong leaves it open and passes the turn. Either way the turn changes,
   and a fresh sum replaces the one just seen so a wrong guess cannot be
   memorised for next time. Illegal moves return the same state. */
export function play(state: TTTState, i: number, chosen: number, now = Date.now()): TTTState {
  if (state.winner || i < 0 || i > 8 || state.cells[i].owner) return state;
  const cells = state.cells.map((c) => ({ ...c }));
  const correct = state.level === 1 || chosen === cells[i].answer;
  if (correct) cells[i].owner = state.turn;
  else {
    /* A miss deals a fresh sum. Retry a few times so the new one is visibly new. */
    let fresh = makeSum(state.level);
    for (let t = 0; t < 8 && fresh.prompt === cells[i].prompt; t++) fresh = makeSum(state.level);
    Object.assign(cells[i], fresh);
  }
  const { winner, line } = findWinner(cells);
  return { cells, turn: state.turn === "X" ? "O" : "X", winner, line, level: state.level, turnAt: now };
}

/* The clock ran out: the turn passes, nothing is claimed. */
export function pass(state: TTTState, now = Date.now()): TTTState {
  if (state.winner) return state;
  return { ...state, turn: state.turn === "X" ? "O" : "X", turnAt: now };
}

/* ---------- the CPU ----------
   Minimax over ownership only; the CPU always answers its own sums correctly,
   so its difficulty is entirely in the placement. At "easy" it plays a random
   legal square a third of the time, which is what makes it beatable by a
   nine-year-old and still a real opponent. */
export function cpuMove(cells: Board, me: Mark, easy = false): number {
  const open = cells.map((c, i) => (c.owner ? -1 : i)).filter((i) => i >= 0);
  if (!open.length) return -1;
  if (easy && Math.random() < 0.34) return open[ri(0, open.length - 1)];
  const other: Mark = me === "X" ? "O" : "X";
  const score = (b: (Mark | null)[], turn: Mark, depth: number): number => {
    const w = findWinner(b.map((o) => ({ owner: o, prompt: "", answer: 0, options: [] })));
    if (w.winner === me) return 10 - depth;
    if (w.winner === other) return depth - 10;
    if (w.winner === "draw") return 0;
    const moves = b.map((o, i) => (o ? -1 : i)).filter((i) => i >= 0);
    const vals = moves.map((i) => { const nb = [...b]; nb[i] = turn; return score(nb, turn === "X" ? "O" : "X", depth + 1); });
    return turn === me ? Math.max(...vals) : Math.min(...vals);
  };
  const owners = cells.map((c) => c.owner);
  let best = -Infinity, pick: number[] = [];
  for (const i of open) {
    const nb = [...owners]; nb[i] = me;
    const v = score(nb, other, 1);
    if (v > best) { best = v; pick = [i]; } else if (v === best) pick.push(i);
  }
  return pick[ri(0, pick.length - 1)];
}

/* Room codes for online play: short, and without the characters that get
   misread over a shoulder or a chat message. */
const CODE_ALPHABET = "ACDEFGHJKLMNPQRTUVWXY34679";
export function roomCode(): string {
  let s = "";
  for (let i = 0; i < 4; i++) s += CODE_ALPHABET[ri(0, CODE_ALPHABET.length - 1)];
  return s;
}
export function normaliseRoomCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
}
