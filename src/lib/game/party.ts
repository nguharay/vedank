/* ---------- party games: the rules both the server and the phones use ----------
   Three room games for 2–50 players, built on the Math Race room idea (a
   4-letter code, the host starts, everyone polls once a second):

     🪢 Tug of War   two teams; every right answer pulls the rope. A team's
                     pull is its members' average, so 3 vs 2 is fair. First
                     to drag the rope TUG_WIN answers over wins, else whoever
                     leads when the time runs out.
     🔔 Buzzer Quiz  everyone sees the same sum; the first right answer takes
                     the point. BUZZ_QS questions; a wrong tap locks you out
                     of that question for a moment.
     🎯 Math Bingo   everyone has their own 3×3 card of answers; a sum is
                     called every BINGO_CALL_MS for all. Tap its answer on your
                     card (any sum called so far counts). First full line —
                     across, down or diagonal — wins; if nobody gets one before
                     the calls run out, the most marks wins.
     🚀 Space Blaster everyone gets the same sums; each right answer blasts an
                     asteroid and flies your rocket up. First to the planet
                     (RACE_GOAL.space) wins, else the highest when time is up.
     🐸 River Hop    the same, hopping a frog across the river's lily pads.

   Pure functions only: the server stores the state and checks answers, the
   client draws it. */
import { raceQuestion, type ChoiceRound } from "./minigames";

export type PartyGame = "tug" | "buzz" | "bingo" | "space" | "river" | "tower" | "turf" | "turfteam";
export const PARTY_GAMES: PartyGame[] = ["turf", "turfteam", "tower", "tug", "buzz", "bingo", "space", "river"];

/* 🎨 Turf War: one grid for the whole room, every tile carrying a sum. Answer
   a tile's sum to paint it your colour; a tile someone else holds asks a
   harder sum to steal. A full row or column in one colour locks for
   TURF_LOCK_MS and earns TURF_LINE_BONUS points. Four gold tiles ask the
   hardest sums and splash paint onto their four neighbours. A wrong answer
   shields that tile for its owner for TURF_SHIELD_MS. In the last
   TURF_FINALE_MS every lock dissolves and every capture earns a bonus point.
   Most points (tiles held + line bonuses + finale captures) when the clock
   stops wins. "turfteam" is the same game as red vs white: a teammate's tile
   is already yours, and the team's tiles and lines are scored together. */
export const TURF_MS = 90_000;
export const TURF_FINALE_MS = 15_000;
export const TURF_LOCK_MS = 10_000;
export const TURF_SHIELD_MS = 5_000;
export const TURF_LINE_BONUS = 3;
export const isTurfGame = (g: PartyGame): g is "turf" | "turfteam" => g === "turf" || g === "turfteam";
/* the grid grows with the room: 5×5 for a few players, 9×9 for a class */
export const turfSize = (players: number) => (players <= 4 ? 5 : players <= 9 ? 6 : players <= 16 ? 7 : players <= 30 ? 8 : 9);
/* the four gold tiles sit one in from each corner */
export const turfGoldTiles = (n: number) => [n + 1, 2 * n - 2, (n - 2) * n + 1, (n - 1) * n - 2];

/* 🏯 Sutra Tower: everyone builds their own tower for TOWER_MS. A right
   answer stacks a block; every TOWER_GOLD_EVERY-th right answer in a row is a
   gold block that counts double; a wrong answer hands you a wrecking ball
   to drop on any rival's tower (−1 block); in the last TOWER_BOSS_MS every
   block counts double. Tallest tower when the gong sounds wins. */
export const TOWER_MS = 90_000;
export const TOWER_BOSS_MS = 15_000;
export const TOWER_GOLD_EVERY = 4;
export const PARTY_ROOM_MAX = 50;
export const PARTY_COUNTDOWN_MS = 3500;

export const TUG_MS = 90_000;
export const TUG_WIN = 6;            /* team-average answers ahead */

export const BUZZ_QS = 10;
export const BUZZ_Q_MS = 15_000;     /* a question nobody gets moves on after this */
export const BUZZ_GAP_MS = 2200;     /* "Riko got it!" before the next one */

export const BINGO_CALLS = 20;
export const BINGO_CALL_MS = 5000;   /* a new sum every 5 s — 1 m 40 s at most */
export const BINGO_POOL = 14;

/* the two race games: answers to win, and the time limit */
export type RaceGame = "space" | "river";
export const isRaceGame = (g: PartyGame): g is RaceGame => g === "space" || g === "river";
export const RACE_GOAL: Record<RaceGame, number> = { space: 15, river: 12 };
export const RACE_MS = 120_000;        /* cards are drawn from the first 14 calls, so lines come in time */

/* `done`: answers so far (tug); for bingo, the marked cells as a 9-bit mask */
export type PartyPlayer = { name: string; joinedAt: number; slot: number; team: 0 | 1; done: number };
export type PartyState = {
  game: PartyGame;
  seed: number;
  startAt: number | null;
  round: number;
  players: Record<string, PartyPlayer>;
  /* buzz: the winner of each question; bingo: wins[0] is who called BINGO first */
  q: number;
  qAt: number;
  wins: (string | null)[];
  /* (kept for rooms made before Boss Battle left; unused) */
  waves: Record<string, number>;
};

/* Each player's own sums (tug): seeded by the room and their slot, so
   the server can check an answer without storing the questions. */
export const partyQuestion = (seed: number, slot: number, idx: number): ChoiceRound => raceQuestion((seed + slot * 7919) >>> 0, idx);
/* The race games: everyone gets the same sums in the same order. */
export const raceGameQuestion = (seed: number, idx: number): ChoiceRound => raceQuestion((seed ^ 0x2f1a7c3d) >>> 0, idx);
/* the sum a player answers next in an answer-per-player game */
export const myPartyQuestion = (game: PartyGame, seed: number, slot: number, idx: number): ChoiceRound =>
  isRaceGame(game) ? raceGameQuestion(seed, idx) : partyQuestion(seed, slot, idx);
/* The buzzer's shared sum for question q. */
export const buzzQuestion = (seed: number, q: number): ChoiceRound => raceQuestion(seed, q);

export type PartyStatus = "lobby" | "countdown" | "playing" | "done";

export type TugInfo = { red: number; white: number; redN: number; whiteN: number; pos: number; endsAt: number; winner: 0 | 1 | "draw" | null };
export function tugInfo(st: PartyState, now: number): TugInfo {
  const ps = Object.values(st.players);
  const side = (t: 0 | 1) => ps.filter((p) => p.team === t);
  const sum = (t: 0 | 1) => side(t).reduce((a, p) => a + p.done, 0);
  const avg = (t: 0 | 1) => (side(t).length ? sum(t) / side(t).length : 0);
  const pos = avg(0) - avg(1);                          /* + = red winning */
  const endsAt = (st.startAt ?? now) + TUG_MS;
  let winner: TugInfo["winner"] = null;
  if (pos >= TUG_WIN) winner = 0;
  else if (pos <= -TUG_WIN) winner = 1;
  else if (st.startAt !== null && now >= endsAt) winner = Math.abs(pos) < 0.01 ? "draw" : pos > 0 ? 0 : 1;
  return { red: sum(0), white: sum(1), redN: side(0).length, whiteN: side(1).length, pos, endsAt, winner };
}

/* ---------- bingo ----------
   The calls are the room's seeded sums with every answer different; a card
   is 9 of the first BINGO_POOL answers, shuffled by the player's slot, so no
   two cards are alike but every card can be finished in time. */
export type BingoCall = { prompt: string; answer: number };
const bingoCache = new Map<number, BingoCall[]>();
export function bingoCalls(seed: number): BingoCall[] {
  const hit = bingoCache.get(seed);
  if (hit) return hit;
  const out: BingoCall[] = [], seen = new Set<number>();
  for (let i = 0; out.length < BINGO_CALLS && i < 200; i++) {
    const q = raceQuestion((seed ^ 0x5bd1e995) >>> 0, i);
    if (seen.has(q.answer)) continue;
    seen.add(q.answer); out.push({ prompt: q.prompt, answer: q.answer });
  }
  if (bingoCache.size > 200) bingoCache.delete(bingoCache.keys().next().value!);
  bingoCache.set(seed, out);
  return out;
}
export function bingoCard(seed: number, slot: number): number[] {
  const pool = bingoCalls(seed).slice(0, BINGO_POOL).map((c) => c.answer);
  /* a small seeded shuffle (mulberry32) keyed by the room and the player */
  let s = (seed ^ Math.imul(slot + 1, 2654435761)) >>> 0;
  const rnd = () => { s = (s + 0x6d2b79f5) >>> 0; let x = s; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, 9);
}
export const BINGO_LINES = [0b000000111, 0b000111000, 0b111000000, 0b001001001, 0b010010010, 0b100100100, 0b100010001, 0b001010100];
export const hasBingo = (mask: number) => BINGO_LINES.some((l) => (mask & l) === l);
export const marksOf = (mask: number) => { let n = 0; for (let m = mask; m; m &= m - 1) n++; return n; };
/* how many sums have been called (the one on screen included) */
export function bingoCalled(st: PartyState, now: number): number {
  if (st.startAt === null || now < st.startAt) return 0;
  return Math.min(BINGO_CALLS, Math.floor((now - st.startAt) / BINGO_CALL_MS) + 1);
}
export type BingoInfo = { called: number; callEndsAt: number; winner: string | null; over: boolean };
export function bingoInfo(st: PartyState, now: number): BingoInfo {
  const called = bingoCalled(st, now);
  const winner = st.wins[0] ?? null;
  const timeUp = st.startAt !== null && now >= st.startAt + BINGO_CALLS * BINGO_CALL_MS;
  return { called, callEndsAt: (st.startAt ?? now) + called * BINGO_CALL_MS, winner, over: !!winner || timeUp };
}

/* a race: wins[0] is the first to the goal */
export type RaceInfo = { goal: number; endsAt: number; winner: string | null; over: boolean };
export function raceInfo(st: PartyState, now: number): RaceInfo {
  const g = st.game as RaceGame;
  const endsAt = (st.startAt ?? now) + RACE_MS;
  const winner = st.wins[0] ?? null;
  return { goal: RACE_GOAL[g], endsAt, winner, over: !!winner || (st.startAt !== null && now >= endsAt) };
}

/* ---------- Sutra Tower ----------
   The tower ledger lives in `waves` (a free Record<string, number> the state
   already carries), keyed per player id:
     w:<id>  wrong answers (each one is a wrecking ball earned)
     b:<id>  wrecking balls thrown
     h:<id>  hits taken (each knocks one block off)
     s:<id>  `done` at the last wrong answer, so streak = done − s
     g:<id>  gold blocks earned (every TOWER_GOLD_EVERY-th answer of a streak)
     x:<id>  extra blocks from answers in boss time (the last TOWER_BOSS_MS)
   Height = done + g + x − h. Everything is derivable, so the server only
   ever increments counters. */
export const towerKey = (k: "w" | "b" | "h" | "s" | "g" | "x", id: string) => `${k}:${id}`;
export const towerVal = (st: PartyState, k: "w" | "b" | "h" | "s" | "g" | "x", id: string) => st.waves[towerKey(k, id)] ?? 0;
export type TowerPlayer = { height: number; blocks: number; gold: number; hits: number; balls: number; streak: number; boss: number };
export function towerPlayer(st: PartyState, id: string): TowerPlayer {
  const p = st.players[id];
  const done = p?.done ?? 0;
  const gold = towerVal(st, "g", id), hits = towerVal(st, "h", id), boss = towerVal(st, "x", id);
  return {
    height: Math.max(0, done + gold + boss - hits), blocks: done, gold, hits, boss,
    balls: Math.max(0, towerVal(st, "w", id) - towerVal(st, "b", id)),
    streak: done - towerVal(st, "s", id),
  };
}
export const towerBossOn = (st: PartyState, now: number) => st.startAt !== null && now >= st.startAt + TOWER_MS - TOWER_BOSS_MS && now < st.startAt + TOWER_MS;
/* a right answer: the ledger changes it brings (besides done + 1) */
export function towerGain(st: PartyState, id: string, now: number): { gold: boolean; boss: boolean } {
  const streak = (st.players[id]?.done ?? 0) + 1 - towerVal(st, "s", id);
  return { gold: streak > 0 && streak % TOWER_GOLD_EVERY === 0, boss: towerBossOn(st, now) };
}
export type TowerInfo = { endsAt: number; bossAt: number; over: boolean; winners: string[]; top: number };
export function towerInfo(st: PartyState, now: number): TowerInfo {
  const endsAt = (st.startAt ?? now) + TOWER_MS;
  const over = st.startAt !== null && now >= endsAt;
  const ids = Object.keys(st.players);
  const top = Math.max(0, ...ids.map((id) => towerPlayer(st, id).height));
  const winners = over && top > 0 ? ids.filter((id) => towerPlayer(st, id).height === top) : [];
  return { endsAt, bossAt: endsAt - TOWER_BOSS_MS, over, winners, top };
}

/* ---------- Turf War ----------
   The board lives in `waves`, per tile index i (row-major, n×n):
     o:<i>  owner: the holder's slot + 1 (0 / missing = unpainted)
     v:<i>  version: how many times the tile has changed hands (its sum is
            drawn from the version, so a captured tile shows a fresh sum)
     l:<i>  locked until (ms): a line lock or a shield
   and per player id:
     n:<id> lines scored · f:<id> finale captures · k:<id> steals
   and per line: q:<line>:<holder> = 1 once that holder (a slot, or a team
   in the team game) has scored it, so a line broken and retaken locks again
   but does not pay again
   `done` counts the player's captures. Everything is derivable, so the
   server only ever writes counters, guarded on the tile's version. */
export const turfKey = (k: "o" | "v" | "l", i: number) => `${k}:${i}`;
export const turfPKey = (k: "n" | "f" | "k", id: string) => `${k}:${id}`;
export const turfVal = (st: PartyState, key: string) => st.waves[key] ?? 0;
export const turfN = (st: PartyState) => turfSize(Object.keys(st.players).length);
export const turfOwnerSlot = (st: PartyState, i: number) => turfVal(st, turfKey("o", i)) - 1;   /* −1 = nobody */
export function turfOwnerId(st: PartyState, i: number): string | null {
  const slot = turfOwnerSlot(st, i);
  if (slot < 0) return null;
  return Object.entries(st.players).find(([, p]) => p.slot === slot)?.[0] ?? null;
}
export const turfLocked = (st: PartyState, i: number, now: number) => !turfFinaleOn(st, now) && turfVal(st, turfKey("l", i)) > now;
export const turfFinaleOn = (st: PartyState, now: number) => st.startAt !== null && now >= st.startAt + TURF_MS - TURF_FINALE_MS && now < st.startAt + TURF_MS;
/* in the team game a teammate's tile is as good as mine */
export function turfIsMine(st: PartyState, i: number, id: string): boolean {
  const owner = turfOwnerId(st, i);
  if (!owner) return false;
  if (owner === id) return true;
  return st.game === "turfteam" && st.players[owner]?.team === st.players[id]?.team;
}
/* The sum on tile i at its current version. Unpainted tiles ask the easy
   band; stealing asks the middle band; gold tiles ask the hard one
   (raceQuestion's bands are by index: 0–5, 6–13, 14+). */
export function turfQuestion(st: PartyState, i: number, forId: string): ChoiceRound {
  const v = turfVal(st, turfKey("v", i));
  return turfQuestionFor(st.seed, i, v, turfGoldTiles(turfN(st)).includes(i), turfOwnerSlot(st, i) >= 0 && !turfIsMine(st, i, forId));
}
/* the same, from what a phone's view knows about a tile */
export function turfQuestionFor(seed: number, i: number, v: number, gold: boolean, steal: boolean): ChoiceRound {
  const idx = gold ? 14 + (v % 10) : steal ? 6 + (v % 8) : v % 6;
  return raceQuestion((seed ^ Math.imul(i + 1, 0x9e3779b1)) >>> 0, idx);
}
export const turfNeighbours = (n: number, i: number) => {
  const r = Math.floor(i / n), c = i % n, out: number[] = [];
  if (r > 0) out.push(i - n); if (r < n - 1) out.push(i + n); if (c > 0) out.push(i - 1); if (c < n - 1) out.push(i + 1);
  return out;
};
/* the rows and columns through tile i: rows are lines 0..n−1, columns n..2n−1 */
export type TurfLine = { id: number; tiles: number[] };
export const turfLinesThrough = (n: number, i: number): TurfLine[] => {
  const r = Math.floor(i / n), c = i % n;
  return [{ id: r, tiles: Array.from({ length: n }, (_, k) => r * n + k) }, { id: n + c, tiles: Array.from({ length: n }, (_, k) => k * n + c) }];
};
/* the key that remembers a holder has already scored a line */
export const turfLineKey = (st: PartyState, lineId: number, id: string) =>
  `q:${lineId}:${st.game === "turfteam" ? `t${st.players[id]?.team ?? 0}` : `s${st.players[id]?.slot ?? 0}`}`;
/* does one player (or, in the team game, one team) hold every tile of a line? */
export function turfLineHeld(st: PartyState, line: number[], id: string): boolean {
  return line.every((t) => turfIsMine(st, t, id));
}
export type TurfPlayer = { tiles: number; lines: number; finale: number; steals: number; score: number };
export function turfPlayer(st: PartyState, id: string): TurfPlayer {
  const n = turfN(st);
  let tiles = 0;
  for (let i = 0; i < n * n; i++) if (turfOwnerId(st, i) === id) tiles++;
  const lines = turfVal(st, turfPKey("n", id)), finale = turfVal(st, turfPKey("f", id)), steals = turfVal(st, turfPKey("k", id));
  return { tiles, lines, finale, steals, score: tiles + lines * TURF_LINE_BONUS + finale };
}
export type TurfInfo = { n: number; endsAt: number; finaleAt: number; over: boolean; winners: string[]; top: number; teamScore: [number, number] };
export function turfInfo(st: PartyState, now: number): TurfInfo {
  const n = turfN(st);
  const endsAt = (st.startAt ?? now) + TURF_MS;
  const over = st.startAt !== null && now >= endsAt;
  const ids = Object.keys(st.players);
  const by = new Map(ids.map((id) => [id, turfPlayer(st, id)]));
  const teamScore: [number, number] = [0, 0];
  for (const id of ids) teamScore[st.players[id].team] += by.get(id)!.score;
  let winners: string[] = [], top = 0;
  if (st.game === "turfteam") {
    top = Math.max(teamScore[0], teamScore[1]);
    winners = over && top > 0 ? ids.filter((id) => teamScore[st.players[id].team] === top) : [];
  } else {
    top = Math.max(0, ...ids.map((id) => by.get(id)!.score));
    winners = over && top > 0 ? ids.filter((id) => by.get(id)!.score === top) : [];
  }
  return { n, endsAt, finaleAt: endsAt - TURF_FINALE_MS, over, winners, top, teamScore };
}
/* A capture on the phone or the bots' side: paint tile i for `id`, bump its
   version, then settle lines, gold splash and the finale bonus. The server
   does the same in SQL, one guarded write per tile. */
export function turfCapture(st: PartyState, id: string, i: number, now: number): PartyState {
  const n = turfN(st);
  const p = st.players[id];
  if (!p || i < 0 || i >= n * n || turfIsMine(st, i, id) || turfLocked(st, i, now)) return st;
  const wasOwned = turfOwnerSlot(st, i) >= 0;
  const waves = { ...st.waves, [turfKey("o", i)]: p.slot + 1, [turfKey("v", i)]: turfVal(st, turfKey("v", i)) + 1 };
  if (wasOwned) waves[turfPKey("k", id)] = turfVal(st, turfPKey("k", id)) + 1;
  if (turfFinaleOn(st, now)) waves[turfPKey("f", id)] = turfVal(st, turfPKey("f", id)) + 1;
  let next: PartyState = { ...st, waves, players: { ...st.players, [id]: { ...p, done: p.done + 1 } } };
  /* gold: splash onto the four neighbours that are not locked */
  if (turfGoldTiles(n).includes(i)) {
    for (const t of turfNeighbours(n, i)) {
      if (turfIsMine(next, t, id) || turfLocked(next, t, now)) continue;
      next = { ...next, waves: { ...next.waves, [turfKey("o", t)]: p.slot + 1, [turfKey("v", t)]: turfVal(next, turfKey("v", t)) + 1 } };
    }
  }
  /* a line just completed (through the tile, or a splashed neighbour) locks,
     and scores the first time this holder completes it */
  const touched = turfGoldTiles(n).includes(i) ? [i, ...turfNeighbours(n, i)] : [i];
  const seen = new Set<number>();
  for (const t of touched) for (const line of turfLinesThrough(n, t)) {
    if (seen.has(line.id)) continue;
    seen.add(line.id);
    if (!turfLineHeld(next, line.tiles, id) || turfLineHeld(st, line.tiles, id)) continue;
    const w = { ...next.waves };
    for (const t2 of line.tiles) w[turfKey("l", t2)] = now + TURF_LOCK_MS;
    const q = turfLineKey(next, line.id, id);
    if (!w[q]) { w[q] = 1; w[turfPKey("n", id)] = turfVal(next, turfPKey("n", id)) + 1; }
    next = { ...next, waves: w };
  }
  return next;
}
/* a wrong answer on tile i: it is shielded for its holder for a moment */
export function turfMiss(st: PartyState, i: number, now: number): PartyState {
  if (turfOwnerSlot(st, i) < 0) return st;
  return { ...st, waves: { ...st.waves, [turfKey("l", i)]: Math.max(turfVal(st, turfKey("l", i)), now + TURF_SHIELD_MS) } };
}

export function partyStatus(st: PartyState, now: number): PartyStatus {
  if (st.startAt === null) return "lobby";
  if (now < st.startAt) return "countdown";
  if (st.game === "tower") return towerInfo(st, now).over ? "done" : "playing";
  if (isTurfGame(st.game)) return turfInfo(st, now).over ? "done" : "playing";
  if (st.game === "tug") return tugInfo(st, now).winner !== null ? "done" : "playing";
  if (st.game === "bingo") return bingoInfo(st, now).over ? "done" : "playing";
  if (isRaceGame(st.game)) return raceInfo(st, now).over ? "done" : "playing";
  return st.q >= BUZZ_QS ? "done" : "playing";
}

export const PARTY_NAMES: Record<PartyGame, [string, string, string]> = {
  tug: ["🪢", "Tug of War", "つなひき"],
  buzz: ["🔔", "Buzzer Quiz", "早押しクイズ"],
  bingo: ["🎯", "Math Bingo", "計算ビンゴ"],
  space: ["🚀", "Space Blaster", "スペースシューター"],
  river: ["🐸", "River Hop", "かえるジャンプ"],
  tower: ["🏯", "Sutra Tower", "スートラタワー"],
  turf: ["🎨", "Turf War", "計算ナワバリ"],
  turfteam: ["🟥", "Turf War: Teams", "ナワバリ チーム戦"],
};

/* ---------- what a phone draws ----------
   Built the same way for an online room (server) and a solo game (on the
   phone), so one screen draws both. Player ids stay private: the view uses
   p0, p1… keys in join order. */
export type PartyView = {
  code: string;
  game: PartyGame;
  status: PartyStatus;
  isHost: boolean;
  inRoom: boolean;
  now: number;
  startAt: number | null;
  seed: number;
  round: number;
  mySlot: number;
  players: { key: string; name: string; team: 0 | 1; done: number; me: boolean; host: boolean; score: number; cpu?: boolean }[];
  tug: TugInfo | null;
  bingo: (BingoInfo & { card: number[]; winnerKey: string | null }) | null;
  buzz: { q: number; qAt: number; wins: (string | null)[] } | null;   /* wins hold player keys */
  race: (RaceInfo & { winnerKey: string | null }) | null;
  /* tower: every player's ledger by view key, and who is tallest at the gong */
  tower: (TowerInfo & { winnerKeys: string[]; by: Record<string, TowerPlayer>; bossOn: boolean }) | null;
  /* turf: the board (owner by view key, lock, version, gold), every player's
     tally, and who holds the most when the clock stops */
  turf: (TurfInfo & { tiles: { owner: string | null; team: 0 | 1 | null; lock: number; v: number; gold: boolean }[]; winnerKeys: string[]; by: Record<string, TurfPlayer>; finaleOn: boolean }) | null;
};

export function buildPartyView(st: PartyState, o: { code: string; hostId: string; viewerId: string; now: number }): PartyView {
  const entries = Object.entries(st.players).sort((a, b) => a[1].joinedAt - b[1].joinedAt);
  const keyOf = new Map(entries.map(([id], i) => [id, `p${i}`]));
  const buzzScore = (id: string) => st.wins.filter((w) => w === id).length;
  return {
    code: o.code, game: st.game, status: partyStatus(st, o.now), isHost: o.hostId === o.viewerId, inRoom: o.viewerId in st.players,
    now: o.now, startAt: st.startAt, seed: st.seed, round: st.round, mySlot: st.players[o.viewerId]?.slot ?? 0,
    players: entries.map(([id, p]) => ({
      key: keyOf.get(id)!, name: p.name, team: p.team, done: p.done, me: id === o.viewerId, host: id === o.hostId,
      score: st.game === "buzz" ? buzzScore(id) : st.game === "bingo" ? marksOf(p.done) : st.game === "tower" ? towerPlayer(st, id).height : isTurfGame(st.game) ? turfPlayer(st, id).score : p.done, cpu: id.startsWith("cpu:") || undefined,
    })),
    tower: st.game === "tower" && st.startAt !== null ? (() => {
      const info = towerInfo(st, o.now);
      const by: Record<string, TowerPlayer> = {};
      for (const [id] of entries) by[keyOf.get(id)!] = towerPlayer(st, id);
      return { ...info, winnerKeys: info.winners.map((id) => keyOf.get(id)!).filter(Boolean), by, bossOn: towerBossOn(st, o.now) };
    })() : null,
    turf: isTurfGame(st.game) && st.startAt !== null ? (() => {
      const info = turfInfo(st, o.now);
      const by: Record<string, TurfPlayer> = {};
      for (const [id] of entries) by[keyOf.get(id)!] = turfPlayer(st, id);
      const gold = new Set(turfGoldTiles(info.n));
      const tiles = Array.from({ length: info.n * info.n }, (_, i) => {
        const owner = turfOwnerId(st, i);
        return { owner: owner ? keyOf.get(owner) ?? null : null, team: owner ? st.players[owner].team : null, lock: turfVal(st, turfKey("l", i)), v: turfVal(st, turfKey("v", i)), gold: gold.has(i) };
      });
      return { ...info, tiles, winnerKeys: info.winners.map((id) => keyOf.get(id)!).filter(Boolean), by, finaleOn: turfFinaleOn(st, o.now) };
    })() : null,
    tug: st.game === "tug" && st.startAt !== null ? tugInfo(st, o.now) : null,
    bingo: st.game === "bingo" ? (() => {
      const info = bingoInfo(st, o.now);
      return { ...info, card: bingoCard(st.seed, st.players[o.viewerId]?.slot ?? 0), winnerKey: info.winner ? keyOf.get(info.winner) ?? null : null };
    })() : null,
    race: isRaceGame(st.game) && st.startAt !== null ? (() => {
      const info = raceInfo(st, o.now);
      return { ...info, winnerKey: info.winner ? keyOf.get(info.winner) ?? null : null };
    })() : null,
    buzz: st.game === "buzz" ? { q: st.q, qAt: st.qAt, wins: st.wins.map((w) => (w ? keyOf.get(w) ?? null : null)) } : null,
  };
}

/* ---------- joining by code: messages a child can read, and where a code really goes ---------- */
const JOIN_ERR_JA: Record<string, string> = {
  "That code doesn't look right.": "コードは4文字だよ。もう一度たしかめてね。",
  "No room with that code.": "そのコードの部屋が見つからないよ。コードをたしかめるか、友だちにもう一度送ってもらおう。",
  "That room is full.": "その部屋はもういっぱいだよ。",
  "That game has already started.": "その部屋はもうゲームが始まっているよ。終わるまで待ってね。",
  "That race has already started.": "そのレースはもう始まっているよ。終わるまで待ってね。",
  "Could not join — the race may have started.": "参加できなかったよ。レースが始まったのかも。",
};
export const joinErrorText = (err: string, ja: boolean) => (ja ? JOIN_ERR_JA[err] ?? "参加できませんでした。もう一度ためしてね。" : err);
/* a code for another game: open the app on that game's join link */
export const roomLink = (kind: "party" | "race" | "ttt", code: string) => `/?${kind === "party" ? "pr" : kind === "race" ? "rr" : "ttt"}=${encodeURIComponent(code)}`;
