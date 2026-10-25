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
     🐉 Boss Battle  everyone against one dragon. Right answers hit it. Every
                     BOSS_WAVE_MS it breathes fire — the team blocks it if they
                     landed enough hits in that wave, otherwise a heart is lost.

   Pure functions only: the server stores the state and checks answers, the
   client draws it. */
import { raceQuestion, type ChoiceRound } from "./minigames";

export type PartyGame = "tug" | "buzz" | "boss";
export const PARTY_GAMES: PartyGame[] = ["tug", "buzz", "boss"];
export const PARTY_ROOM_MAX = 50;
export const PARTY_COUNTDOWN_MS = 3500;

export const TUG_MS = 90_000;
export const TUG_WIN = 6;            /* team-average answers ahead */

export const BUZZ_QS = 10;
export const BUZZ_Q_MS = 15_000;     /* a question nobody gets moves on after this */
export const BUZZ_GAP_MS = 2200;     /* "Riko got it!" before the next one */

export const BOSS_WAVE_MS = 10_000;
export const BOSS_WAVES = 12;        /* two minutes; a boss still standing then wins */
export const BOSS_HEARTS = 5;
export const bossHp = (players: number) => 14 * Math.max(2, players);
export const bossNeed = (players: number) => 2 * Math.max(2, players);  /* hits a wave to block the fire */

export type PartyPlayer = { name: string; joinedAt: number; slot: number; team: 0 | 1; done: number };
export type PartyState = {
  game: PartyGame;
  seed: number;
  startAt: number | null;
  round: number;
  players: Record<string, PartyPlayer>;
  /* buzz */
  q: number;
  qAt: number;
  wins: (string | null)[];
  /* boss: hits landed in each wave, keyed by wave number */
  waves: Record<string, number>;
};

/* Each player's own sums (tug, boss): seeded by the room and their slot, so
   the server can check an answer without storing the questions. */
export const partyQuestion = (seed: number, slot: number, idx: number): ChoiceRound => raceQuestion((seed + slot * 7919) >>> 0, idx);
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

export type BossInfo = { hp: number; dmg: number; need: number; wave: number; waveHits: number; heartsLost: number; waveEndsAt: number; result: "win" | "lose" | null; lostIn: number[] };
export function bossInfo(st: PartyState, now: number): BossInfo {
  const n = Object.keys(st.players).length;
  const hp = bossHp(n), need = bossNeed(n);
  const dmg = Object.values(st.players).reduce((a, p) => a + p.done, 0);
  const t = Math.max(0, now - (st.startAt ?? now));
  const wave = Math.min(BOSS_WAVES - 1, Math.floor(t / BOSS_WAVE_MS));
  /* waves that have finished: did the team block the fire? */
  const finished = Math.min(BOSS_WAVES, Math.floor(t / BOSS_WAVE_MS));
  const lostIn: number[] = [];
  for (let w = 0; w < finished; w++) if ((st.waves[String(w)] ?? 0) < need) lostIn.push(w);
  /* the boss falls the moment the hits reach its HP — waves after that don't count */
  let result: BossInfo["result"] = null;
  if (dmg >= hp) result = "win";
  else if (lostIn.length >= BOSS_HEARTS || finished >= BOSS_WAVES) result = "lose";
  return {
    hp, dmg: Math.min(dmg, hp), need, wave, waveHits: st.waves[String(wave)] ?? 0,
    heartsLost: Math.min(BOSS_HEARTS, lostIn.length), waveEndsAt: (st.startAt ?? now) + (wave + 1) * BOSS_WAVE_MS, result, lostIn,
  };
}

export function partyStatus(st: PartyState, now: number): PartyStatus {
  if (st.startAt === null) return "lobby";
  if (now < st.startAt) return "countdown";
  if (st.game === "tug") return tugInfo(st, now).winner !== null ? "done" : "playing";
  if (st.game === "boss") return bossInfo(st, now).result ? "done" : "playing";
  return st.q >= BUZZ_QS ? "done" : "playing";
}

export const PARTY_NAMES: Record<PartyGame, [string, string, string]> = {
  tug: ["🪢", "Tug of War", "つなひき"],
  buzz: ["🔔", "Buzzer Quiz", "早押しクイズ"],
  boss: ["🐉", "Boss Battle", "みんなでボス戦"],
};
