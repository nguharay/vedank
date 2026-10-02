/* Guards the leak this feature already caused once: competition.ts is in the
   client bundle (the game imports COMP_LEVELS from it), so anything reaching
   Node-only code from there breaks the build. Reaching this module from the
   browser now fails loudly instead. */
import "server-only";
import { eq, inArray, lt } from "drizzle-orm";
import { getDb } from "@/db";
import { pushSubscriptions, guestPush } from "@/db/schema";
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
  if (!sub?.endpoint || !okEndpoint(sub.endpoint) || !sub.keys?.p256dh || !sub.keys?.auth) return { ok: false };
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

/* notification keys configured Oct 2 2026 — see /api/push-status */

/* ---------- guests ----------
   A guest browser's subscription, stored without a user. The endpoint must
   be an https push-service URL; anything else is refused. */
/* Only the real browser push services. A subscription is just a URL the server
   will POST to, so accepting any https address would let anyone point our
   server at a site of their choosing. These are the hosts Chrome/Edge/Opera
   (FCM), Firefox, Safari/iOS and old Edge (WNS) actually use. */
const PUSH_HOSTS = [
  /(^|\.)fcm\.googleapis\.com$/, /(^|\.)push\.services\.mozilla\.com$/,
  /(^|\.)web\.push\.apple\.com$/, /(^|\.)push\.apple\.com$/, /(^|\.)notify\.windows\.com$/,
];
export function okEndpoint(e: string): boolean {
  if (typeof e !== "string" || e.length > 1000) return false;
  try {
    const u = new URL(e);
    return u.protocol === "https:" && !u.port && PUSH_HOSTS.some((h) => h.test(u.hostname));
  } catch { return false; }
}


export async function saveGuestSubscription(sub: PushSub, lang: string, day: string): Promise<{ ok: boolean }> {
  if (!sub?.endpoint || !okEndpoint(sub.endpoint) || !sub.keys?.p256dh || !sub.keys?.auth) return { ok: false };
  const l = lang === "en" ? "en" : "ja";
  await getDb().insert(guestPush)
    .values({ endpoint: sub.endpoint, p256dh: sub.keys.p256dh.slice(0, 200), auth: sub.keys.auth.slice(0, 200), lang: l, lastActiveDay: day })
    .onConflictDoUpdate({ target: guestPush.endpoint, set: { p256dh: sub.keys.p256dh.slice(0, 200), auth: sub.keys.auth.slice(0, 200), lang: l, lastActiveDay: day } });
  return { ok: true };
}
export async function touchGuest(endpoint: string, lang: string, day: string): Promise<void> {
  if (!okEndpoint(endpoint)) return;
  await getDb().update(guestPush).set({ lastActiveDay: day, lang: lang === "en" ? "en" : "ja" }).where(eq(guestPush.endpoint, endpoint));
}
export async function removeGuestSubscription(endpoint: string): Promise<void> {
  if (!endpoint) return;
  await getDb().delete(guestPush).where(eq(guestPush.endpoint, endpoint));
}
/* Send to one guest browser; a retired endpoint (404/410) is deleted. */
export async function sendToGuest(row: { endpoint: string; p256dh: string; auth: string }, note: Notification): Promise<boolean> {
  if (!pushConfigured()) return false;
  try {
    const status = await deliver({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, JSON.stringify(note), PUBLIC_KEY, PRIVATE_KEY);
    if (status === 404 || status === 410) { await removeGuestSubscription(row.endpoint); return false; }
    return status >= 200 && status < 300;
  } catch { return false; }
}

/* Guests who have not opened the game in 60 days stop receiving anything and
   are removed — a reminder to someone who has left is just spam. */
export async function pruneStaleGuests(day: string): Promise<number> {
  const cutoff = new Date(Date.parse(day) - 60 * 86400_000).toISOString().slice(0, 10);
  const gone = await getDb().delete(guestPush).where(lt(guestPush.lastActiveDay, cutoff)).returning({ e: guestPush.endpoint });
  return gone.length;
}
