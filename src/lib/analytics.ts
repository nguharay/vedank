/* ---------- player activity → the Google Sheet (+ GA4 and Clarity) ----------
   The sheet gets one row per meaningful action (a game opened or finished, a
   lesson, a notification tapped…) plus one "visit_end" row each time the app
   is closed or put away, with the minutes played and games played in that
   stretch. Rows are kept in memory and sent as one small batch then, with
   sendBeacon, so the game never waits on it. GA4 and Clarity, when loaded,
   get the same events and every screen change as well.

   Never pass anything that identifies a child — only game ids, numbers and
   yes/no flags. Who the player is, the server takes from the sign-in cookie. */

type Params = Record<string, string | number | boolean | undefined>;
type W = Window & { gtag?: (...a: unknown[]) => void; clarity?: (...a: unknown[]) => void };
type Section = { n: string; s: number; r?: string };
type Ev = {
  ev: string; at: number; game?: string; topic?: string; score?: number; stars?: number; detail?: string;
  /* visit_end only: when the visit began, this device's visit number, and every section in order */
  start?: number; vno?: number; sections?: Section[];
};

/* GA4 / Clarity load only when these are set (see components/Analytics.tsx) */
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "";
export const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID || "";

const queue: Ev[] = [];
const FLUSH_AT = 40;
let wired = false;

/* the current stretch of play: since the app was opened or last came back.
   `trail` is the screens visited in order with the time on each — it rides
   on the one visit_end row instead of being a row per screen. */
/* start: when this visit began; since: when it last came on screen (0 while
   hidden); active: on-screen time banked so far */
const visit = { start: 0, since: 0, active: 0, games: 0, finished: 0 };
const trail: { screen: string; ms: number; results: string[] }[] = [];
let onScreen: { screen: string; since: number; results: string[] } | null = null;
const gameOpenedAt: Record<string, number> = {};

const dur = (ms: number) => (ms >= 60000 ? `${Math.round(ms / 6000) / 10}m` : `${Math.round(ms / 1000)}s`);
function closeScreen(now = Date.now()) {
  if (!onScreen) return;
  const ms = now - onScreen.since;
  const last = trail[trail.length - 1];
  if (last && last.screen === onScreen.screen) { last.ms += ms; last.results.push(...onScreen.results); }
  else if (trail.length < 60) trail.push({ screen: onScreen.screen, ms, results: onScreen.results });
  onScreen = { screen: onScreen.screen, since: now, results: [] };
}

/* the result of a game or stage, attached to the section it was played in */
function noteResult(name: string, p: Params) {
  if (!onScreen) return;
  let r = "";
  if (name === "game_end") {
    const unit = p.unit === "secs" ? "s" : p.unit === "turns" ? " turns" : " pts";
    r = `${p.score ?? 0}${unit}${typeof p.stars === "number" ? ` ★${p.stars}` : ""}${p.place ? ` place ${p.place}` : ""}${p.new_best ? " NEW BEST" : ""}`;
  } else if (name === "lesson_stage_end") {
    r = `★${p.stars ?? 0} ${p.correct ?? "?"}/${p.questions ?? "?"}${p.passed ? "" : " not passed"}`;
  } else if (name === "daily_done") {
    r = `${p.correct ?? "?"}/${p.questions ?? "?"} correct, ${p.score ?? 0} pts`;
  } else return;
  if (onScreen.results.length < 12) onScreen.results.push(r);
}

/* The visit number on this device. Coming back within 2 minutes of the last
   send is the same visit (a glance at a message is not a new visit): it keeps
   the number, and the sheet merges it into that visit's row. */
const SAME_VISIT_MS = 120_000;
function visitNo(stretchStart: number, now: number): number {
  try {
    const last = Number(localStorage.getItem("sutraSprint.visitLast") || 0);
    let n = Number(localStorage.getItem("sutraSprint.visitNo") || 0);
    if (!n || stretchStart - last > SAME_VISIT_MS) n += 1;
    localStorage.setItem("sutraSprint.visitNo", String(n));
    localStorage.setItem("sutraSprint.visitLast", String(now));
    return n;
  } catch {
    return 0;
  }
}

function deviceId(): { id: string; isNew: boolean } {
  try {
    let id = localStorage.getItem("sutraSprint.device");
    const isNew = !id;
    if (!id) {
      id = Math.random().toString(36).slice(2, 10);
      localStorage.setItem("sutraSprint.device", id);
    }
    return { id, isNew };
  } catch {
    return { id: "", isNew: false };
  }
}

function info() {
  const ua = navigator.userAgent;
  const kind = /iPad|Tablet/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? "tablet" : /Mobi|Android|iPhone/i.test(ua) ? "phone" : "desktop";
  const installed = matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  const os = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? "iOS" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "Mac" : /CrOS/.test(ua) ? "ChromeOS" : /Linux/.test(ua) ? "Linux" : "other";
  const browser = /Edg\//.test(ua) ? "Edge" : /SamsungBrowser/.test(ua) ? "Samsung" : /Line\//.test(ua) ? "LINE" : /FBAN|FBAV|Instagram/.test(ua) ? "in-app" : /CriOS|Chrome\//.test(ua) ? "Chrome" : /FxiOS|Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "other";
  let tz = "";
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch {}
  return { kind, installed, lang: document.documentElement.lang || "", os, browser, screen: `${screen.width}x${screen.height}`, tz };
}

function gaClarity(name: string, params: Params) {
  const w = window as W;
  try { w.gtag?.("event", name, params); } catch {}
  try { w.clarity?.("event", name); } catch {}
}

/* close the current stretch of play into one "visit_end" row */
function endStretch() {
  if (!visit.since) return;
  const now = Date.now();
  visit.active += now - visit.since;
  visit.since = 0;
  closeScreen(now);
  /* a glance away (under 10s, nothing played) doesn't end the visit — it
     carries on when the app comes back */
  const played = trail.some((t) => t.results.length) || visit.games > 0;
  if (visit.active < 10000 && !played) return;
  const start = visit.start || now;
  const activeSecs = Math.round(visit.active / 1000);
  const mins = Math.round((activeSecs / 60) * 10) / 10;
  visit.start = 0;
  visit.active = 0;
  const sections: Section[] = trail
    .filter((t) => t.ms >= 1000 || t.results.length)
    .map((t) => ({ n: t.screen, s: Math.round(t.ms / 1000), r: t.results.join(", ") || undefined }));
  const path = sections.map((x) => `${x.n} ${dur(x.s * 1000)}`).join(" › ");
  trail.length = 0;
  const vno = visitNo(start, now);
  queue.push({
    ev: "visit_end", at: now, score: activeSecs, start, vno, sections,
    detail: `mins=${mins} games=${visit.games} finished=${visit.finished} path: ${path}`,
  });
  gaClarity("visit_end", { minutes: mins, games: visit.games, finished: visit.finished });
  visit.games = 0;
  visit.finished = 0;
}

export function flush() {
  if (typeof window === "undefined" || !queue.length) return;
  const events = queue.splice(0, queue.length);
  const body = JSON.stringify({ device: deviceId().id, info: info(), events });
  try {
    if (navigator.sendBeacon?.("/api/track", new Blob([body], { type: "text/plain" }))) return;
  } catch {}
  fetch("/api/track", { method: "POST", body, keepalive: true }).catch(() => {});
}

function wire() {
  if (wired || typeof window === "undefined") return;
  wired = true;
  visit.start = visit.since = Date.now();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") { endStretch(); flush(); }
    else if (!visit.since) {
      const now = Date.now();
      if (!visit.start) visit.start = now;
      visit.since = now;
      if (onScreen) onScreen.since = now;
    }
  });
  window.addEventListener("pagehide", () => { endStretch(); flush(); });
}

function push(name: string, params: Params) {
  const { game, topic, score, stars, detail: lead, ...rest } = params;
  const detail = [typeof lead === "string" ? lead : "", ...Object.entries(rest).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => `${k}=${v}`)].filter(Boolean).join(" ");
  queue.push({
    ev: name, at: Date.now(),
    game: typeof game === "string" ? game : undefined,
    topic: typeof topic === "string" ? topic : undefined,
    score: typeof score === "number" ? score : undefined,
    stars: typeof stars === "number" ? stars : undefined,
    detail: detail || undefined,
  });
  if (queue.length >= FLUSH_AT) flush();
}

/* an event for the sheet, GA4 and Clarity */
export function track(name: string, params: Params = {}) {
  if (typeof window === "undefined") return;
  wire();
  if (name === "game_open") { visit.games++; if (typeof params.game === "string") gameOpenedAt[params.game] = Date.now(); }
  if (name === "game_end") {
    visit.finished++;
    /* how long that game was played, if we saw it open */
    const g = typeof params.game === "string" ? params.game : "";
    if (g && gameOpenedAt[g] && params.play_secs === undefined) params = { ...params, play_secs: Math.round((Date.now() - gameOpenedAt[g]) / 1000) };
    if (g) gameOpenedAt[g] = Date.now();
  }
  noteResult(name, params);
  gaClarity(name, params);
  push(name, params);
}

/* a screen inside the single-page game — GA4 and Clarity only */
export function trackScreen(screen: string) {
  if (typeof window === "undefined") return;
  wire();
  const name = screen;
  if (!onScreen || onScreen.screen !== name) { closeScreen(); onScreen = { screen: name, since: Date.now(), results: [] }; }
  const w = window as W;
  try {
    w.gtag?.("event", "page_view", {
      page_title: screen,
      page_location: `${location.origin}/${screen.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
    });
  } catch {}
  try { w.clarity?.("set", "screen", screen); } catch {}
}

/* once per page load: the visit itself — new or returning, where from, and
   where the player stands (level, gems, streak) */
let opened = false;
export function trackAppOpen(player: { level?: number; gems?: number; streak?: number } = {}) {
  if (opened || typeof window === "undefined") return;
  opened = true;
  const { isNew } = deviceId();
  let source = "direct";
  try {
    const q = new URLSearchParams(location.search);
    if (q.get("utm_source")) source = `${q.get("utm_source")}${q.get("utm_medium") ? `/${q.get("utm_medium")}` : ""}`.slice(0, 30);
    else if (q.get("class")) source = "class-link";
    else if (q.get("race") || q.get("rr") || q.get("ttt")) source = "game-invite";
    else if (document.referrer && new URL(document.referrer).origin !== location.origin) source = new URL(document.referrer).hostname.slice(0, 30);
  } catch {}
  track("app_open", { first_visit: isNew, source, level: player.level, gems: player.gems, streak: player.streak });
}

/* broad tags for filtering in GA4 / Clarity — never anything identifying */
export function setAudience(tags: { signed_in: boolean; lang: string }) {
  if (typeof window === "undefined") return;
  const w = window as W;
  try { w.gtag?.("set", "user_properties", { signed_in: tags.signed_in ? "yes" : "no", app_lang: tags.lang }); } catch {}
  try { w.clarity?.("set", "signed_in", tags.signed_in ? "yes" : "no"); w.clarity?.("set", "lang", tags.lang); } catch {}
}
