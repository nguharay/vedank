import { NextResponse, after, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { appendRows, activitySheetOn, jst, type SheetRow } from "@/lib/activity-sheet";

/* The browser sends its activity in one small batch per visit (when the tab
   is hidden or closed), and the service worker sends a notification tap.
   Each batch becomes rows in the "Activity" tab of the Google Sheet. Who the
   player is comes from their sign-in cookie, never from the request body;
   guests are a random device number their browser keeps. Nothing is stored
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

type In = { ev?: unknown; at?: unknown; game?: unknown; topic?: unknown; score?: unknown; stars?: unknown; detail?: unknown };

export async function POST(req: NextRequest) {
  if (!activitySheetOn()) return new NextResponse(null, { status: 204 });
  let body: { device?: unknown; info?: { lang?: unknown; installed?: unknown; kind?: unknown }; events?: In[] };
  try {
    body = JSON.parse(await req.text());
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const events = Array.isArray(body.events) ? body.events.slice(0, MAX_EVENTS) : [];
  if (!events.length) return new NextResponse(null, { status: 204 });

  const session = await auth();
  const user = session?.user as { id?: string; name?: string | null } | undefined;
  const device = clip(body.device, 12).replace(/[^a-z0-9]/gi, "");
  const player = user?.id ? (user.name || "Player") : `Guest ${device.slice(0, 6) || "?"}`;
  const playerId = user?.id ? user.id.slice(0, 8) : `g-${device.slice(0, 6) || "?"}`;
  const now = Date.now();

  const rows: SheetRow[] = [];
  for (const e of events) {
    const ev = clip(e.ev, 30);
    if (!EVENTS.has(ev)) continue;
    /* trust the browser's clock only within the last day */
    const at = typeof e.at === "number" && e.at <= now && e.at > now - 86400_000 ? e.at : now;
    const { date, time } = jst(at);
    rows.push({
      Date: date, Time: time, Player: player, "Player ID": playerId, "Signed in": user?.id ? "yes" : "no",
      Event: ev, Game: clip(e.game, 20), Topic: clip(e.topic, 30), Score: num(e.score), Stars: num(e.stars),
      Detail: clip(e.detail, ev === "visit_end" ? 600 : 160), Device: clip(body.info?.kind, 10), Installed: body.info?.installed === true ? "yes" : "no",
      Lang: clip(body.info?.lang, 4),
    });
  }
  if (rows.length) after(() => appendRows("Activity", rows));
  return new NextResponse(null, { status: 204 });
}
