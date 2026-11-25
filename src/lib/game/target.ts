/* ---------- 🏹 Target Hunt ----------
   A party game for thinkers. Each round everyone gets the same five numbers
   and a round-number target (100 at first, 2000 by the last round). Combine
   two numbers at a time with + − × ÷; each result becomes a new number you
   can use again. Every number once. The first exact hit starts a short
   countdown for everyone else; then every player's working is shown side by
   side, with the shortest way the solver knows.

   Scoring per round (each player's best attempt counts):
     exact 10, +2 for the fewest steps among the exact ones;
     otherwise by how far off: within 1% 6, 5% 4, 10% 2.

   Pure functions: the server checks every attempt against the seeded puzzle,
   and the phone runs the same rules for a solo game. Attempts live in the
   room's `wins` list as "round|playerId|time|steps", so one append is one
   write and nothing else has to be stored. */

export type TOp = "+" | "−" | "×" | "÷";
export type TStep = [number, TOp, number];          /* pool indexes: the five numbers, then each step's result */
export const T_OPS: TOp[] = ["+", "−", "×", "÷"];

export const TARGET_ROUNDS = 5;
export const TARGET_ROUND_MS = 90_000;
export const TARGET_GRACE_MS = 15_000;               /* after the first exact hit */
export const TARGET_REVEAL_MS = 10_000;              /* everyone's working, before the next round */
export const TARGET_MAX_TRIES = 40;                  /* attempts a player may send in a round */

const TARGETS = [[100, 150, 200], [250, 300, 400], [400, 500, 600], [750, 800, 1000], [1200, 1500, 2000]];
const LARGE = [25, 50, 75, 100];
const MIN_STEPS = [2, 2, 2, 3, 3];

export function tApply(a: number, o: TOp, b: number): number | null {
  if (o === "+") return a + b;
  if (o === "−") return a > b ? a - b : null;        /* no zero or negatives: kids' numbers stay positive */
  if (o === "×") return a * b;
  return b > 0 && a % b === 0 ? a / b : null;
}

const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/* every value the numbers can make, each with the first way found */
function reachable(nums: number[]): Map<number, TStep[]> {
  const out = new Map<number, TStep[]>();
  const pool = [...nums], used = nums.map(() => false), steps: TStep[] = [];
  const walk = () => {
    const live: number[] = [];
    for (let i = 0; i < pool.length; i++) if (!used[i]) live.push(i);
    for (let x = 0; x < live.length; x++) for (let y = 0; y < live.length; y++) {
      if (x === y) continue;
      const i = live[x], j = live[y];
      for (const o of T_OPS) {
        if ((o === "+" || o === "×") && x > y) continue;   /* the same sum the other way round */
        const v = tApply(pool[i], o, pool[j]);
        if (v === null || v > 99_999) continue;
        used[i] = used[j] = true; pool.push(v); steps.push([i, o, j]);
        if (!out.has(v)) out.set(v, steps.map((s) => [...s] as TStep));
        if (live.length > 2) walk();
        steps.pop(); pool.pop(); used[i] = used[j] = false;
      }
    }
  };
  walk();
  return out;
}

/* the shortest way to the target (iterative deepening), or null */
export function tSolve(nums: number[], target: number, maxSteps = nums.length - 1): TStep[] | null {
  const pool = [...nums], used = nums.map(() => false), steps: TStep[] = [];
  const dfs = (left: number): boolean => {
    if (!left) return false;
    const live: number[] = [];
    for (let i = 0; i < pool.length; i++) if (!used[i]) live.push(i);
    for (let x = 0; x < live.length; x++) for (let y = 0; y < live.length; y++) {
      if (x === y) continue;
      const i = live[x], j = live[y];
      for (const o of T_OPS) {
        if ((o === "+" || o === "×") && x > y) continue;
        const v = tApply(pool[i], o, pool[j]);
        if (v === null || v > 99_999) continue;
        used[i] = used[j] = true; pool.push(v); steps.push([i, o, j]);
        if (v === target || dfs(left - 1)) return true;
        steps.pop(); pool.pop(); used[i] = used[j] = false;
      }
    }
    return false;
  };
  if (nums.includes(target)) return [];
  for (let d = 1; d <= maxSteps; d++) if (dfs(d)) return steps.map((s) => [...s] as TStep);
  return null;
}

export type TPuzzle = { nums: number[]; target: number; best: TStep[]; reach: Map<number, TStep[]> };
const cache = new Map<string, TPuzzle>();
/* Round r of a game: two big numbers and three small ones, and a round
   target they can reach. Seeded, so the server and every phone agree. */
export function targetPuzzle(seed: number, r: number): TPuzzle {
  const key = `${seed}:${r}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const rand = rng((seed ^ Math.imul(r + 1, 2654435761)) >>> 0);
  const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)];
  const list = TARGETS[Math.min(r, TARGETS.length - 1)];
  let made: TPuzzle | null = null;
  for (let tries = 0; tries < 40 && !made; tries++) {
    const big = [...LARGE].sort(() => rand() - 0.5).slice(0, 2);
    const small = Array.from({ length: 3 }, () => 2 + Math.floor(rand() * 9));
    const nums = [...big, ...small].sort((a, b) => b - a);
    const reach = reachable(nums);
    /* no one-step targets: the fun is in finding a route */
    const ok = list.filter((t) => reach.has(t) && !nums.includes(t))
      .map((t) => ({ t, best: tSolve(nums, t) })).filter((x) => x.best && x.best.length >= MIN_STEPS[Math.min(r, MIN_STEPS.length - 1)]);
    if (!ok.length) continue;
    const { t: target, best } = pick(ok);
    made = { nums, target, best: best!, reach };
  }
  /* practically never: a set that always works */
  made ??= (() => { const nums = [100, 50, 4, 3, 2]; const target = list[0]; return { nums, target, best: tSolve(nums, target) ?? [], reach: reachable(nums) }; })();
  if (cache.size > 200) cache.clear();
  cache.set(key, made);
  return made;
}

/* ---- an attempt: steps on the wire as "0x1;5-2" ---- */
const ENC: Record<TOp, string> = { "+": "+", "−": "-", "×": "x", "÷": "/" };
const DEC: Record<string, TOp> = { "+": "+", "-": "−", x: "×", "/": "÷" };
export const tEncode = (steps: TStep[]) => steps.map(([i, o, j]) => `${i}${ENC[o]}${j}`).join(";");
export function tDecode(s: string): TStep[] | null {
  if (!s || s.length > 60) return null;
  const out: TStep[] = [];
  for (const part of s.split(";")) {
    const m = /^(\d{1,2})([+\-x/])(\d{1,2})$/.exec(part);
    if (!m) return null;
    out.push([Number(m[1]), DEC[m[2]], Number(m[3])]);
  }
  return out;
}
/* play the steps; null if any is not allowed */
export function tRun(nums: number[], steps: TStep[]): { value: number; pool: number[] } | null {
  if (!steps.length || steps.length >= nums.length) return null;
  const pool = [...nums], used = new Set<number>();
  for (const [i, o, j] of steps) {
    if (i === j || i >= pool.length || j >= pool.length || used.has(i) || used.has(j)) return null;
    const v = tApply(pool[i], o, pool[j]);
    if (v === null) return null;
    used.add(i); used.add(j); pool.push(v);
  }
  return { value: pool[pool.length - 1], pool };
}
/* "50 × 7 = 350, 350 − 8 = 342" */
export function tText(nums: number[], steps: TStep[]): string {
  const pool = [...nums];
  return steps.map(([i, o, j]) => {
    const v = tApply(pool[i], o, pool[j]) ?? 0;
    const s = `${pool[i]} ${o} ${pool[j]} = ${v}`;
    pool.push(v);
    return s;
  }).join(",  ");
}

/* ---- the game clock and the scores, from the attempts alone ---- */
export type TAttempt = { r: number; id: string; t: number; steps: TStep[]; value: number; dist: number };
export type TBest = TAttempt & { pts: number; exact: boolean; bonus: boolean };
export type TargetInfo = {
  r: number;                                   /* the round on now (or the last one, once over) */
  phase: "play" | "reveal";
  start: number; endsAt: number; nextAt: number;
  hitBy: string | null;                        /* first exact hit this round */
  over: boolean;
  best: Record<string, TBest>[];               /* per round, each player's best attempt */
  total: Record<string, number>;
};

export const tAttemptStr = (r: number, id: string, t: number, steps: TStep[]) => `${r}|${id}|${Math.round(t)}|${tEncode(steps)}`;
export function tAttempts(seed: number, wins: (string | null)[]): TAttempt[] {
  const out: TAttempt[] = [];
  for (const w of wins) {
    if (!w) continue;
    const [rs, id, ts, enc] = w.split("|");
    const r = Number(rs), steps = tDecode(enc ?? "");
    if (!steps || !(r >= 0 && r < TARGET_ROUNDS) || !id) continue;
    const pz = targetPuzzle(seed, r);
    const run = tRun(pz.nums, steps);
    if (!run) continue;
    out.push({ r, id, t: Number(ts), steps, value: run.value, dist: Math.abs(run.value - pz.target) });
  }
  return out;
}

function pointsFor(dist: number, target: number) {
  if (dist === 0) return 10;
  const f = dist / target;
  return f <= 0.01 ? 6 : f <= 0.05 ? 4 : f <= 0.1 ? 2 : 0;
}

export function targetInfo(seed: number, startAt: number, wins: (string | null)[], now: number): TargetInfo {
  const all = tAttempts(seed, wins);
  const best: Record<string, TBest>[] = [];
  const total: Record<string, number> = {};
  let start = startAt;
  for (let r = 0; r < TARGET_ROUNDS; r++) {
    const pz = targetPuzzle(seed, r);
    const mine = all.filter((a) => a.r === r && a.t >= start && a.t <= start + TARGET_ROUND_MS);
    const exact = mine.filter((a) => a.dist === 0).sort((a, b) => a.t - b.t);
    const hitAt = exact.length ? exact[0].t : null;
    const endsAt = Math.min(start + TARGET_ROUND_MS, hitAt === null ? Infinity : hitAt + TARGET_GRACE_MS);
    const counted = mine.filter((a) => a.t <= endsAt);
    const b: Record<string, TBest> = {};
    for (const a of counted) {
      const cur = b[a.id];
      if (!cur || a.dist < cur.dist || (a.dist === cur.dist && (a.steps.length < cur.steps.length || (a.steps.length === cur.steps.length && a.t < cur.t))))
        b[a.id] = { ...a, pts: 0, exact: a.dist === 0, bonus: false };
    }
    const fewest = Math.min(...Object.values(b).filter((x) => x.exact).map((x) => x.steps.length));
    for (const x of Object.values(b)) {
      x.bonus = x.exact && x.steps.length === fewest;
      x.pts = pointsFor(x.dist, pz.target) + (x.bonus ? 2 : 0);
      total[x.id] = (total[x.id] ?? 0) + x.pts;
    }
    best.push(b);
    const nextAt = endsAt + TARGET_REVEAL_MS;
    const hitBy = exact.find((a) => a.t <= endsAt)?.id ?? null;
    if (now < endsAt) return { r, phase: "play", start, endsAt, nextAt, hitBy, over: false, best, total };
    if (now < nextAt) return { r, phase: "reveal", start, endsAt, nextAt, hitBy, over: false, best, total };
    if (r === TARGET_ROUNDS - 1) return { r, phase: "reveal", start, endsAt, nextAt, hitBy, over: true, best, total };
    start = nextAt;
  }
  /* unreachable */
  return { r: TARGET_ROUNDS - 1, phase: "reveal", start, endsAt: start, nextAt: start, hitBy: null, over: true, best, total };
}
