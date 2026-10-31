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
     🚀 Space Race   everyone gets the same sums; each right answer blasts an
                     asteroid and flies your rocket up. First to the planet
                     (RACE_GOAL.space) wins, else the highest when time is up.
     🐸 Frog Race    the same, hopping a frog across the river's lily pads.

   Pure functions only: the server stores the state and checks answers, the
   client draws it. */
import { raceQuestion, type ChoiceRound } from "./minigames";

export type PartyGame = "tug" | "buzz" | "bingo" | "space" | "river";
export const PARTY_GAMES: PartyGame[] = ["tug", "buzz", "bingo", "space", "river"];
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

export function partyStatus(st: PartyState, now: number): PartyStatus {
  if (st.startAt === null) return "lobby";
  if (now < st.startAt) return "countdown";
  if (st.game === "tug") return tugInfo(st, now).winner !== null ? "done" : "playing";
  if (st.game === "bingo") return bingoInfo(st, now).over ? "done" : "playing";
  if (isRaceGame(st.game)) return raceInfo(st, now).over ? "done" : "playing";
  return st.q >= BUZZ_QS ? "done" : "playing";
}

export const PARTY_NAMES: Record<PartyGame, [string, string, string]> = {
  tug: ["🪢", "Tug of War", "つなひき"],
  buzz: ["🔔", "Buzzer Quiz", "早押しクイズ"],
  bingo: ["🎯", "Math Bingo", "計算ビンゴ"],
  space: ["🚀", "Space Race", "宇宙レース"],
  river: ["🐸", "Frog Race", "かえるレース"],
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
      score: st.game === "buzz" ? buzzScore(id) : st.game === "bingo" ? marksOf(p.done) : p.done, cpu: id.startsWith("cpu:") || undefined,
    })),
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
