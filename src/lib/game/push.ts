/* Guards the leak this feature already caused once: competition.ts is in the
   client bundle (the game imports COMP_LEVELS from it), so anything reaching
   Node-only code from there breaks the build. Reaching this module from the
   browser now fails loudly instead. */
import "server-only";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { deliver } from "./webpush";

/* Web Push.
 
   The whole feature is optional at runtime: with no VAPID keys configured it
   reports itself unavailable, the UI hides the toggle, and sends are no-ops.
   That is deliberate — the keys are environment variables, so a deploy
   without them should degrade rather than throw on every duel. */

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";


export function pushConfigured(): boolean {
  return Boolean(PUBLIC_KEY && PRIVATE_KEY);
}



export type PushSub = { endpoint: string; keys: { p256dh: string; auth: string } };

export async function saveSubscription(userId: string, sub: PushSub): Promise<{ ok: boolean }> {
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return { ok: false };
  const db = getDb();
  /* The endpoint is the key, so re-subscribing the same browser moves it to
     this account rather than leaving a row pointed at the old one. */
  await db
    .insert(pushSubscriptions)
    .values({ endpoint: sub.endpoint, userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    });
  return { ok: true };
}

export async function removeSubscription(endpoint: string): Promise<void> {
  if (!endpoint) return;
  await getDb().delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}

export type Notification = { title: string; body: string; url?: string; tag?: string };

/* Fire-and-forget by design: a duel must still be created if a phone is
   unreachable. Endpoints the push service has retired (404/410) are deleted,
   otherwise the table fills with dead browsers forever. */
export async function sendTo(userId: string, note: Notification): Promise<void> {
  if (!pushConfigured()) return;
  const db = getDb();
  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));
  if (!subs.length) return;

  const payload = JSON.stringify(note);
  const dead: string[] = [];
  await Promise.all(
    subs.map(async (s) => {
      try {
        const status = await deliver(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          PUBLIC_KEY,
          PRIVATE_KEY
        );
        /* The push service says this browser is gone for good. */
        if (status === 404 || status === 410) dead.push(s.endpoint);
      } catch {
        /* Network trouble: leave the row, it may work next time. */
      }
    })
  );
  if (dead.length) {
    await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.endpoint, dead));
  }
}
