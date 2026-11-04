/* ---------- party games, solo: the same rules against the computer ----------
   Runs entirely on the phone (works for guests and offline). The state is the
   same PartyState an online room keeps, so party.ts decides wins and losses
   and the same screen draws it; only the other players are computer ones:

     🏯 Sutra Tower  you against three CPU builders who stack at their own
                     pace, slip now and then — and drop the wrecking ball
                     they earn on the tallest tower (one of them always on you)
     🪢 Tug of War   you (red) against a CPU team that pulls at a steady pace
     🔔 Buzzer Quiz  you against three CPU contestants who buzz in after a
                     few seconds — and sometimes get it wrong
     🎯 Math Bingo   you against three CPU players marking their own cards;
                     they spot each number after a few seconds, and now and
                     then miss one
     🚀🐸 the races  you against three CPU racers, each at its own pace

   `level` sets how quick the computer is. */
import {
  PARTY_COUNTDOWN_MS, BUZZ_QS, BUZZ_Q_MS, BUZZ_GAP_MS, BINGO_CALL_MS,
  myPartyQuestion, buzzQuestion, partyStatus, bingoCalls, bingoCard, bingoCalled, hasBingo, isRaceGame, RACE_GOAL,
  towerKey, towerVal, towerGain, towerPlayer,
  type PartyGame, type PartyPlayer, type PartyState,
} from "./party";

export type SoloLevel = 0 | 1 | 2;
export const SOLO_LEVELS: { id: SoloLevel; en: string; ja: string; icon: string }[] = [
  { id: 0, en: "Easy", ja: "やさしい", icon: "🐢" },
  { id: 1, en: "Normal", ja: "ふつう", icon: "🐰" },
  { id: 2, en: "Strong", ja: "つよい", icon: "🐆" },
];
export const SOLO_ME = "me";

/* ms per answer for a CPU tug team, and how soon a CPU buzzes in */
const TUG_PACE = [4300, 3200, 2400];
const BUZZ_BASE = [7000, 5000, 3600];
/* how long a CPU takes to spot a called number on its bingo card */
const BINGO_REACT = [3600, 2700, 1900];
/* bingo: how many CPU players at each strength, and how often (1 in N) a CPU
   never notices a called number — easy is one sleepy opponent, strong is
   three sharp ones */
const BINGO_CPUS = [1, 2, 3];
const BINGO_MISS = [3, 5, 9];
/* ms per answer for a CPU racer (each a little different) */
const RACE_PACE = [5200, 3900, 2900];
/* tower: ms per block for a CPU builder, and how often (1 in N) an answer
   is a slip that earns it a wrecking ball */
const TOWER_PACE = [6400, 4700, 3400];
const TOWER_SLIP = [4, 5, 6];
const TOWER_THROW_MS = 1600;      /* a CPU drops its ball this long after earning it */
const CPU_NAMES: [string, string][] = [["Ray", "レイ"], ["Mimi", "ミミ"], ["Taro", "タロウ"]];

/* a small deterministic hash so a CPU's timing is fixed for a given question */
const hash = (a: number, b: number, c: number) => {
  let h = (a ^ Math.imul(b + 1, 2654435761) ^ Math.imul(c + 7, 1597334677)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
  return (h ^ (h >>> 13)) >>> 0;
};

export function soloStart(game: PartyGame, ja: boolean, myName: string, round: number, now: number, level: SoloLevel = 1): PartyState {
  const seed = Math.floor(Math.random() * 2 ** 31);
  const startAt = now + PARTY_COUNTDOWN_MS;
  const p = (name: string, team: 0 | 1, i: number): PartyPlayer => ({ name, joinedAt: i, slot: 1000 + i * 37, team, done: 0 });
  const players: Record<string, PartyPlayer> = { [SOLO_ME]: p(myName, 0, 0) };
  const cpus = game === "tug" ? 1 : game === "bingo" ? BINGO_CPUS[level] : 3;
  for (let i = 0; i < cpus; i++) players[`cpu:${i}`] = p(CPU_NAMES[i][ja ? 1 : 0], 1, i + 1);
  return { game, seed, startAt, round, players, q: 0, qAt: startAt, wins: [], waves: {} };
}

/* my answer: the same checks the server makes */
export function soloAnswer(st: PartyState, now: number, idx: number, answer: number): PartyState | "wrong" {
  if (partyStatus(st, now) !== "playing") return st;
  const me = st.players[SOLO_ME];
  if (st.game === "buzz") {
    if (idx !== st.q || now < st.qAt) return st;
    if (buzzQuestion(st.seed, idx).answer !== answer) return "wrong";
    return { ...st, wins: [...st.wins.slice(0, idx), SOLO_ME], q: idx + 1, qAt: now + BUZZ_GAP_MS };
  }
  if (st.game === "bingo") {
    /* idx = the card cell; it counts if its number has been called */
    if (idx < 0 || idx > 8 || (me.done & (1 << idx))) return st;
    const value = bingoCard(st.seed, me.slot)[idx];
    if (!bingoCalls(st.seed).slice(0, bingoCalled(st, now)).some((c) => c.answer === value)) return "wrong";
    const mask = me.done | (1 << idx);
    const players = { ...st.players, [SOLO_ME]: { ...me, done: mask } };
    const wins = hasBingo(mask) && !st.wins[0] ? [SOLO_ME] : st.wins;
    return { ...st, players, wins };
  }
  if (me.done !== idx) return st;
  if (myPartyQuestion(st.game, st.seed, me.slot, idx).answer !== answer) return "wrong";
  if (st.game === "tower") return towerBuild(st, SOLO_ME, now);
  const players = { ...st.players, [SOLO_ME]: { ...me, done: idx + 1 } };
  const wins = isRaceGame(st.game) && idx + 1 >= RACE_GOAL[st.game] && !st.wins[0] ? [SOLO_ME] : st.wins;
  return { ...st, players, wins };
}

/* ---- tower ledger moves (shared by me and the CPUs) ---- */
const bump = (st: PartyState, key: string, by = 1): PartyState => ({ ...st, waves: { ...st.waves, [key]: (st.waves[key] ?? 0) + by } });
function towerBuild(st: PartyState, id: string, now: number): PartyState {
  const gain = towerGain(st, id, now);
  const p = st.players[id];
  let next: PartyState = { ...st, players: { ...st.players, [id]: { ...p, done: p.done + 1 } } };
  if (gain.gold) next = bump(next, towerKey("g", id));
  if (gain.boss) next = bump(next, towerKey("x", id));
  return next;
}
function towerSlip(st: PartyState, id: string): PartyState {
  const next = bump(st, towerKey("w", id));
  return { ...next, waves: { ...next.waves, [towerKey("s", id)]: st.players[id]?.done ?? 0 } };
}
function towerHit(st: PartyState, from: string, to: string): PartyState {
  if (from === to || !(to in st.players) || towerPlayer(st, from).balls <= 0) return st;
  return bump(bump(st, towerKey("b", from)), towerKey("h", to));
}
/* my wrong answer in the tower: it earns a wrecking ball */
export function soloWrong(st: PartyState, now: number): PartyState {
  return st.game === "tower" && partyStatus(st, now) === "playing" ? towerSlip(st, SOLO_ME) : st;
}
/* I drop a wrecking ball on a rival (targetId is the other player's id) */
export function soloThrow(st: PartyState, now: number, targetId: string): PartyState {
  return st.game === "tower" && partyStatus(st, now) === "playing" ? towerHit(st, SOLO_ME, targetId) : st;
}

/* the computer's turn: called a few times a second */
export function soloTick(st: PartyState, now: number, level: SoloLevel): PartyState {
  if (partyStatus(st, now) !== "playing" || st.startAt === null) return st;
  const t = now - st.startAt;

  if (st.game === "tower") {
    /* Each CPU "answers" on a fixed schedule: answer k lands at k × pace
       (a little uneven per player). Every TOWER_SLIP-th or so is a slip, which
       earns a ball; the ball drops TOWER_THROW_MS later — Taro always on me,
       the others on whoever is tallest (never themselves). The schedule is
       replayed from the counters so a slow tick never skips a move. */
    let next = st;
    Object.entries(st.players).filter(([id]) => id.startsWith("cpu:")).forEach(([id, p], i) => {
      const pace = TOWER_PACE[level] * [0.92, 1.0, 1.12][i % 3] * (0.95 + (hash(st.seed, p.slot, 5) % 10) / 100);
      const answered = towerVal(next, "w", id) + next.players[id].done;          /* answers so far: right + wrong */
      const due = Math.floor(t / pace);
      for (let k = answered; k < due; k++) {
        const slip = hash(st.seed, p.slot, k) % TOWER_SLIP[level] === 0 && k > 0;
        next = slip ? towerSlip(next, id) : towerBuild(next, id, st.startAt! + (k + 1) * pace);
      }
      /* drop any ball once its moment has passed */
      const tp = towerPlayer(next, id);
      if (tp.balls > 0) {
        const earnedAt = (() => {           /* the answer index of the latest unthrown slip */
          let n = 0; for (let k = 0; k <= due; k++) { if (hash(st.seed, p.slot, k) % TOWER_SLIP[level] === 0 && k > 0) { n++; if (n === towerVal(next, "b", id) + 1) return (k + 1) * pace; } } return 0;
        })();
        if (t >= earnedAt + TOWER_THROW_MS) {
          const others = Object.keys(next.players).filter((o) => o !== id);
          const target = i === 2 ? SOLO_ME : others.sort((a, b) => towerPlayer(next, b).height - towerPlayer(next, a).height)[0];
          next = towerHit(next, id, target);
        }
      }
    });
    return next;
  }

  if (st.game === "tug") {
    /* each CPU pulls at its pace, a little uneven so it feels human */
    let players = st.players;
    for (const [id, p] of Object.entries(st.players)) {
      if (!id.startsWith("cpu:")) continue;
      const pace = TUG_PACE[level] * (0.9 + (hash(st.seed, p.slot, 0) % 20) / 100);
      const done = Math.floor(t / pace);
      if (done > p.done) players = { ...players, [id]: { ...p, done } };
    }
    return players === st.players ? st : { ...st, players };
  }

  if (isRaceGame(st.game)) {
    /* each CPU racer answers at its own steady pace, up to the goal */
    const goal = RACE_GOAL[st.game];
    let players = st.players, wins = st.wins;
    Object.entries(st.players).filter(([id]) => id.startsWith("cpu:")).forEach(([id, p], i) => {
      /* one quick, one steady, one slower — and a little uneven per game */
      const pace = RACE_PACE[level] * [0.9, 1.04, 1.2][i % 3] * (0.95 + (hash(st.seed, p.slot, 3) % 10) / 100);
      const done = Math.min(goal, Math.floor(t / pace));
      if (done > p.done) {
        players = { ...players, [id]: { ...p, done } };
        if (done >= goal && !wins[0]) wins = [id];
      }
    });
    return players === st.players ? st : { ...st, players, wins };
  }

  if (st.game === "buzz") {
    if (st.q >= BUZZ_QS || now < st.qAt) return st;
    /* the first CPU whose moment has come — and who gets it right — takes it */
    let first: { id: string; at: number } | null = null;
    Object.keys(st.players).filter((id) => id.startsWith("cpu:")).forEach((id, i) => {
      const h = hash(st.seed, st.q, i);
      if (h % 5 === 0) return;                                    /* this one doesn't know it */
      const at = st.qAt + BUZZ_BASE[level] + (h % 3500);
      if (now >= at && (!first || at < first.at)) first = { id, at };
    });
    if (first) {
      const f = first as { id: string; at: number };
      return { ...st, wins: [...st.wins.slice(0, st.q), f.id], q: st.q + 1, qAt: now + BUZZ_GAP_MS };
    }
    /* nobody got it in time */
    if (now >= st.qAt + BUZZ_Q_MS) return { ...st, wins: [...st.wins.slice(0, st.q), null], q: st.q + 1, qAt: now + BUZZ_GAP_MS };
  }

  if (st.game === "bingo") {
    /* each CPU marks a called number once its "spotting" time has passed;
       now and then (BINGO_MISS) it never notices one */
    const calls = bingoCalls(st.seed), called = bingoCalled(st, now);
    let players = st.players, wins = st.wins;
    Object.entries(st.players).forEach(([id, p], i) => {
      if (!id.startsWith("cpu:")) return;
      const card = bingoCard(st.seed, p.slot);
      let mask = p.done;
      for (let k = 0; k < called; k++) {
        const cell = card.indexOf(calls[k].answer);
        if (cell < 0 || (mask & (1 << cell))) continue;
        const h = hash(st.seed, k, i);
        if (h % BINGO_MISS[level] === 0) continue;
        if (now >= (st.startAt ?? now) + k * BINGO_CALL_MS + BINGO_REACT[level] + (h % 1500)) mask |= 1 << cell;
      }
      if (mask !== p.done) {
        players = { ...players, [id]: { ...p, done: mask } };
        if (hasBingo(mask) && !wins[0]) wins = [id];
      }
    });
    return players === st.players ? st : { ...st, players, wins };
  }
  return st;
}
