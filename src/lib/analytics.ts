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
type Ev = { ev: string; at: number; game?: string; topic?: string; score?: number; stars?: number; detail?: string };

/* GA4 / Clarity load only when these are set (see components/Analytics.tsx) */
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "";
export const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID || "";

const queue: Ev[] = [];
const FLUSH_AT = 40;
let wired = false;

/* the current stretch of play: since the app was opened or last came back.
   `trail` is the screens visited in order with the time on each — it rides
   on the one visit_end row instead of being a row per screen. */
const visit = { since: 0, active: 0, games: 0, finished: 0 };
const trail: { screen: string; ms: number }[] = [];
let onScreen: { screen: string; since: number } | null = null;
const gameOpenedAt: Record<string, number> = {};

const dur = (ms: number) => (ms >= 60000 ? `${Math.round(ms / 6000) / 10}m` : `${Math.round(ms / 1000)}s`);
function closeScreen(now = Date.now()) {
  if (!onScreen) return;
  const ms = now - onScreen.since;
  const last = trail[trail.length - 1];
  if (last && last.screen === onScreen.screen) last.ms += ms;
  else if (trail.length < 40) trail.push({ screen: onScreen.screen, ms });
  onScreen = { screen: onScreen.screen, since: now };
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
  return { kind, installed, lang: document.documentElement.lang || "" };
}

function gaClarity(name: string, params: Params) {
  const w = window as W;
  try { w.gtag?.("event", name, params); } catch {}
  try { w.clarity?.("event", name); } catch {}
}

/* close the current stretch of play into one "visit_end" row */
function endStretch() {
  if (!visit.since) return;
  const mins = Math.round(((visit.active + (Date.now() - visit.since)) / 60000) * 10) / 10;
  visit.since = 0;
  visit.active = 0;
  closeScreen();
  const path = trail.filter((t) => t.ms >= 1000).map((t) => `${t.screen} ${dur(t.ms)}`).join(" › ");
  trail.length = 0;
  if (mins < 0.1 && !visit.games) return;
  push("visit_end", { score: Math.round(mins * 60), detail: `mins=${mins} games=${visit.games} finished=${visit.finished} path: ${path}` });
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
  visit.since = Date.now();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") { endStretch(); flush(); }
    else if (!visit.since) { visit.since = Date.now(); if (onScreen) onScreen.since = Date.now(); }
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
  gaClarity(name, params);
  push(name, params);
}

/* a screen inside the single-page game — GA4 and Clarity only */
export function trackScreen(screen: string, topic?: string) {
  if (typeof window === "undefined") return;
  wire();
  const name = topic ? `${screen}:${topic}` : screen;
  if (!onScreen || onScreen.screen !== name) { closeScreen(); onScreen = { screen: name, since: Date.now() }; }
  const w = window as W;
  try {
    w.gtag?.("event", "page_view", {
      page_title: topic ? `${screen}: ${topic}` : screen,
      page_location: `${location.origin}/${screen}${topic ? `/${topic}` : ""}`,
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
    if (q.get("utm_source")) source = `utm:${q.get("utm_source")}`.slice(0, 30);
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
