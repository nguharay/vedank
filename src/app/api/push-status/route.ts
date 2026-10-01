import { NextResponse } from "next/server";
import { pushConfigured } from "@/lib/game/push";

/* Says only whether web push is configured on this deploy — no keys, no
   users — so a redeploy after adding the VAPID variables can be checked. */
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({ push: pushConfigured() ? "configured" : "off" });
}
