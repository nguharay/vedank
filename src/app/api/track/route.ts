import { NextResponse, after, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { appendBatches, activitySheetOn, jst, type SheetRow } from "@/lib/activity-sheet";

/* The browser sends its activity in one small batch per visit (when the tab
   is hidden or closed), and the service worker sends a notification tap.
   Each batch becomes rows in the "Activity" tab of the Google Sheet. Who the
   player is comes from their sign-in cookie, never from the request body;
   guests are a random device number their browser keeps. The email lets the
   sheet join each player to their row in the Registrations tab. Nothing is stored
   here — the response goes back at once and the sheet write runs after it. */
export const dynamic = "force-dynamic";

const EVENTS = new Set([
  "app_open", "visit_end", "game_open", "demo_view", "game_end", "chest_open",
  "topic_open", "lesson_stage_end", "daily_done", "locked_tap", "join_class",
  "notification_open", "push_permission", "install_click", "install_result",
]);
const MAX_EVENTS = 60;
const clip = (v: unknown, n = 40) => (typeof v === "string" ? v.slice(0, n) : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : "");

type In = {
  ev?: unknown; at?: unknown; game?: unknown; topic?: unknown; score?: unknown; stars?: unknown; detail?: unknown;
  start?: unknown; vno?: unknown; sections?: { n?: unknown; s?: unknown; r?: unknown }[];
};

/* "Game · Ninja Slice" → Game; "Lesson · … · Stage 2" → Lesson; "Home · Learn" → Home … */
const areaOf = (name: string) => {
  const head = name.split(" · ")[0];
  return ["Game", "Lesson", "Home", "Matchsticks"].includes(head) ? head : "Other";
};
const mmss = (secs: number) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
const human = (secs: number) => (secs >= 60 ? `${Math.floor(secs / 60)}m ${secs % 60}s` : `${secs}s`);

export async function POST(req: NextRequest) {
  if (!activitySheetOn()) return new NextResponse(null, { status: 204 });
  let body: { device?: unknown; info?: { lang?: unknown; installed?: unknown; kind?: unknown; os?: unknown; browser?: unknown; screen?: unknown; tz?: unknown }; events?: In[] };
  try {
    body = JSON.parse(await req.text());
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const events = Array.isArray(body.events) ? body.events.slice(0, MAX_EVENTS) : [];
  if (!events.length) return new NextResponse(null, { status: 204 });

  const session = await auth();
  const user = session?.user as { id?: string; name?: string | null; email?: string | null } | undefined;
  const device = clip(body.device, 12).replace(/[^a-z0-9]/gi, "");
  const player = user?.id ? (user.name || "Player") : `Guest ${device.slice(0, 6) || "?"}`;
  const playerId = user?.id ? user.id.slice(0, 8) : `g-${device.slice(0, 6) || "?"}`;
  const now = Date.now();

  const rows: SheetRow[] = [];
  const visits: SheetRow[] = [];
  const sections: SheetRow[] = [];
  const email = user?.id ? clip(user.email ?? "", 120) : "";
  for (const e of events) {
    const ev = clip(e.ev, 30);
    if (!EVENTS.has(ev)) continue;
    /* trust the browser's clock only within the last day */
    const at = typeof e.at === "number" && e.at <= now && e.at > now - 86400_000 ? e.at : now;
    const { date, time } = jst(at);
    rows.push({
      Date: date, Time: time, Player: player, "Player ID": playerId, "Signed in": user?.id ? "yes" : "no",
      Email: email,
      Event: ev, Game: clip(e.game, 20), Topic: clip(e.topic, 30), Score: num(e.score), Stars: num(e.stars),
      Detail: clip(e.detail, ev === "visit_end" ? 1500 : 160), Device: clip(body.info?.kind, 10), Installed: body.info?.installed === true ? "yes" : "no",
      Lang: clip(body.info?.lang, 4),
      /* the browser's own number, for guests and signed-in players alike — it
         is what links a guest's early visits to the account they make later */
      "Device ID": device.slice(0, 8),
      OS: clip(body.info?.os, 12), Browser: clip(body.info?.browser, 12), Screen: clip(body.info?.screen, 12), Timezone: clip(body.info?.tz, 40),
    });

    /* a visit: one row in Visits, and one row per section in Sections */
    if (ev === "visit_end" && Array.isArray(e.sections)) {
      const startMs = typeof e.start === "number" && e.start <= at && e.start > at - 86400_000 ? e.start : at;
      const s0 = jst(startMs);
      const vno = num(e.vno);
      const list = e.sections.slice(0, 60).map((x) => ({
        n: clip(x?.n, 80) || "?",
        s: Math.max(0, Math.round(typeof x?.s === "number" && Number.isFinite(x.s) ? x.s : 0)),
        r: clip(x?.r, 160),
      }));
      /* time actually on screen (the visit's score); wall-clock as a fallback */
      const secs = typeof e.score === "number" && Number.isFinite(e.score) ? Math.round(e.score) : Math.round((at - startMs) / 1000);
      visits.push({
        Date: s0.date, Start: s0.time, End: time, Player: player, "Player ID": playerId, Email: email,
        "Signed in": user?.id ? "yes" : "no", "Visit #": vno, Minutes: Math.round((secs / 60) * 10) / 10,
        Sections: list.length,
        "Games finished": list.filter((x) => x.n.startsWith("Game") && x.r).reduce((t, x) => t + x.r.split(", ").length, 0),
        "Visit details": list.map((x, i) => `${i + 1}. ${x.n} — ${human(x.s)}${x.r ? ` (${x.r})` : ""}`).join("  |  ").slice(0, 4000),
        Device: clip(body.info?.kind, 10), OS: clip(body.info?.os, 12), Browser: clip(body.info?.browser, 12),
        Installed: body.info?.installed === true ? "yes" : "no", Lang: clip(body.info?.lang, 4),
      });
      list.forEach((x, i) => sections.push({
        Date: s0.date, "Visit start": s0.time, Player: player, "Player ID": playerId, Email: email, "Visit #": vno,
        Order: i + 1, Section: x.n, Area: areaOf(x.n), Seconds: x.s, Time: mmss(x.s), Result: x.r,
      }));
    }
  }
  if (rows.length) {
    after(() => appendBatches([{ tab: "Activity", rows }, { tab: "Visits", rows: visits }, { tab: "Sections", rows: sections }]));
  }
  return new NextResponse(null, { status: 204 });
}
