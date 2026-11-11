import { NextResponse, type NextRequest } from "next/server";
import { runSlot, SLOTS, type Slot } from "@/lib/game/reminders";
import { runLeagueReminders } from "@/lib/game/league";
import { appendRows, jst } from "@/lib/activity-sheet";

/* Called by Vercel Cron (see vercel.json): 08:00 JST morning, 19:00 JST
   evening. Vercel sends `Authorization: Bearer <CRON_SECRET>` when that
   variable is set; without the variable the route is open, which is fine
   because a slot can only run once a day anyway. */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const slot = req.nextUrl.searchParams.get("slot") as Slot | null;
  if (!slot || !SLOTS.includes(slot)) return NextResponse.json({ error: "slot must be morning or evening" }, { status: 400 });
  try {
    const result = await runSlot(slot);
    /* the personal league reminders ride on the evening run (once a day) */
    let league: Awaited<ReturnType<typeof runLeagueReminders>> | { error: string } | null = null;
    if (slot === "evening") {
      try { league = await runLeagueReminders(); } catch (e) { league = { error: e instanceof Error ? e.message.slice(0, 120) : "failed" }; }
    }
    /* one row a day in the sheet's Activity tab: what went out, to how many
       (taps arrive as "notification_open" rows) */
    if (result.picked) {
      const { date, time } = jst(Date.now());
      await appendRows("Activity", [{
        Date: date, Time: time, Player: "(all players)", "Player ID": "", "Signed in": "", Email: "",
        Event: "notification_sent", Game: "", Topic: "", Score: result.sent, Stars: "",
        Detail: `${result.picked.titleJa} / ${result.picked.titleEn} · audience=${result.picked.audience} targets=${result.targets} sent=${result.sent}`,
        Device: "", Installed: "", Lang: "",
      }]);
    }
    return NextResponse.json({ slot, ...result, picked: result.picked ? { id: result.picked.id, titleJa: result.picked.titleJa } : null, league });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message.slice(0, 200) : "failed" }, { status: 500 });
  }
}
