import "server-only";
import { and, asc, eq, inArray, sql as raw } from "drizzle-orm";
import { getDb } from "@/db";
import { reminders, reminderRuns, users, pushSubscriptions, guestPush } from "@/db/schema";
import { sendTo, sendToGuest } from "./push";

/* ---------- daily reminder notifications ----------
   Admins (the marketing team) write the messages in /admin/reminders; two
   daily crons send them. Each slot picks one enabled message a day, rotating
   through the slot in `sort` order so players don't get the same line twice
   running. A player gets the message in their own language. */

export type Slot = "morning" | "evening";
/* all / not_played_today reach signed-in players AND guests; streak_risk is
   signed-in only (a guest's streak lives in their browser); guests is guests only */
export type Audience = "all" | "not_played_today" | "streak_risk" | "guests";
export const SLOTS: Slot[] = ["morning", "evening"];
export const AUDIENCES: Audience[] = ["all", "not_played_today", "streak_risk", "guests"];

export type Reminder = {
  id: number; slot: Slot; audience: Audience;
  titleJa: string; bodyJa: string; titleEn: string; bodyEn: string;
  url: string; enabled: boolean; sort: number; updatedBy: string | null; updatedAt: string;
};
export type ReminderInput = Omit<Reminder, "id" | "updatedBy" | "updatedAt"> & { id?: number };

/* Japan's calendar day — the players are there, the server is not. */
export function jstDay(d = new Date()): string {
  return new Date(d.getTime() + 9 * 3600_000).toISOString().slice(0, 10);
}

type Row = typeof reminders.$inferSelect;
const view = (r: Row): Reminder => ({
  id: r.id, slot: (r.slot as Slot) ?? "evening", audience: (r.audience as Audience) ?? "all",
  titleJa: r.titleJa, bodyJa: r.bodyJa, titleEn: r.titleEn, bodyEn: r.bodyEn,
  url: r.url, enabled: r.enabled, sort: r.sort, updatedBy: r.updatedBy, updatedAt: r.updatedAt.toISOString(),
});

export async function listReminders(): Promise<Reminder[]> {
  const rows = await getDb().select().from(reminders).orderBy(asc(reminders.slot), asc(reminders.sort), asc(reminders.id));
  return rows.map(view);
}

const clip = (s: unknown, n: number) => String(s ?? "").trim().slice(0, n);
export async function saveReminder(input: ReminderInput, by: string): Promise<Reminder> {
  const values = {
    slot: SLOTS.includes(input.slot) ? input.slot : "evening",
    audience: AUDIENCES.includes(input.audience) ? input.audience : "all",
    titleJa: clip(input.titleJa, 60), bodyJa: clip(input.bodyJa, 160),
    titleEn: clip(input.titleEn, 60), bodyEn: clip(input.bodyEn, 160),
    url: clip(input.url, 120).startsWith("/") ? clip(input.url, 120) : "/",
    enabled: !!input.enabled, sort: Math.max(0, Math.floor(Number(input.sort) || 0)),
    updatedBy: by, updatedAt: new Date(),
  };
  if (!values.titleJa || !values.bodyJa || !values.titleEn || !values.bodyEn) throw new Error("Every title and body is needed, in both languages.");
  const db = getDb();
  if (input.id) {
    const [r] = await db.update(reminders).set(values).where(eq(reminders.id, input.id)).returning();
    return view(r);
  }
  const [r] = await db.insert(reminders).values(values).returning();
  return view(r);
}
export async function deleteReminder(id: number): Promise<void> {
  await getDb().delete(reminders).where(eq(reminders.id, id));
}

/* Today's message for a slot: the enabled ones in order, rotated by the day
   number so the pick changes daily and cycles through them all. */
export async function pickForDay(slot: Slot, day: string): Promise<Reminder | null> {
  const rows = await getDb().select().from(reminders).where(and(eq(reminders.slot, slot), eq(reminders.enabled, true)))
    .orderBy(asc(reminders.sort), asc(reminders.id));
  if (!rows.length) return null;
  const dayNo = Math.floor(Date.parse(day) / 86400_000);
  return view(rows[dayNo % rows.length]);
}

type Target =
  | { kind: "user"; id: string; lang: string }
  | { kind: "guest"; endpoint: string; p256dh: string; auth: string; lang: string };

/* Everyone who should get this message: signed-in players with a push
   subscription, plus guest browsers, each narrowed by audience. */
async function audienceTargets(audience: Audience, day: string): Promise<Target[]> {
  const out: Target[] = [];
  if (audience !== "guests") {
    for (const u of await audienceUserIds(audience, day)) out.push({ kind: "user", ...u });
  }
  if (audience === "all" || audience === "not_played_today" || audience === "guests") {
    const gs = await getDb().select().from(guestPush);
    for (const g of gs) {
      if (audience === "not_played_today" && g.lastActiveDay === day) continue;
      out.push({ kind: "guest", endpoint: g.endpoint, p256dh: g.p256dh, auth: g.auth, lang: g.lang });
    }
  }
  return out;
}

async function audienceUserIds(audience: Audience, day: string): Promise<{ id: string; lang: string }[]> {
  const db = getDb();
  const subbed = db.selectDistinct({ userId: pushSubscriptions.userId }).from(pushSubscriptions);
  const base = db.select({ id: users.id, lang: users.preferredLang }).from(users).where(inArray(users.id, subbed));
  const rows = await base;
  if (audience === "all") return rows;
  const active = await db.select({ id: users.id, lastActiveDate: users.lastActiveDate, dailyStreak: users.dailyStreak }).from(users).where(inArray(users.id, rows.map((r) => r.id)));
  const byId = new Map(active.map((a) => [a.id, a]));
  return rows.filter((r) => {
    const a = byId.get(r.id);
    const playedToday = a?.lastActiveDate === day;
    if (audience === "not_played_today") return !playedToday;
    return !playedToday && (a?.dailyStreak ?? 0) > 0;   /* streak_risk */
  });
}

async function sendReminderTo(r: Reminder, targets: Target[]): Promise<number> {
  let sent = 0;
  /* a few at a time, so a big list doesn't open hundreds of connections at once */
  for (let i = 0; i < targets.length; i += 20) {
    await Promise.all(targets.slice(i, i + 20).map(async (t) => {
      const ja = t.lang === "ja";
      const note = { title: ja ? r.titleJa : r.titleEn, body: ja ? r.bodyJa : r.bodyEn, url: r.url, tag: `reminder-${r.slot}` };
      try {
        if (t.kind === "user") { await sendTo(t.id, note); sent++; }
        else if (await sendToGuest(t, note)) sent++;
      } catch {}
    }));
  }
  return sent;
}

/* The cron entry point. Idempotent per slot per JST day: the run row is
   claimed first, so a retried cron does nothing. */
export async function runSlot(slot: Slot): Promise<{ day: string; picked: Reminder | null; targets: number; sent: number; skipped?: string }> {
  const day = jstDay();
  const db = getDb();
  const claimed = await db.insert(reminderRuns).values({ slot, day }).onConflictDoNothing().returning({ slot: reminderRuns.slot });
  if (!claimed.length) return { day, picked: null, targets: 0, sent: 0, skipped: "already ran today" };
  const picked = await pickForDay(slot, day);
  if (!picked) return { day, picked: null, targets: 0, sent: 0, skipped: "no enabled message in this slot" };
  const targets = await audienceTargets(picked.audience, day);
  const sent = await sendReminderTo(picked, targets);
  await db.update(reminderRuns).set({ reminderId: picked.id, sent }).where(and(eq(reminderRuns.slot, slot), eq(reminderRuns.day, day)));
  return { day, picked, targets: targets.length, sent };
}

/* Admin tools: a test to one person, or a manual send to the audience now. */
export async function sendTest(reminderId: number, toUserId: string, lang: string): Promise<boolean> {
  const [r] = await getDb().select().from(reminders).where(eq(reminders.id, reminderId)).limit(1);
  if (!r) return false;
  return (await sendReminderTo(view(r), [{ kind: "user", id: toUserId, lang }])) === 1;
}
export async function sendNow(reminderId: number): Promise<{ targets: number; sent: number }> {
  const [r] = await getDb().select().from(reminders).where(eq(reminders.id, reminderId)).limit(1);
  if (!r) return { targets: 0, sent: 0 };
  const rem = view(r);
  const targets = await audienceTargets(rem.audience, jstDay());
  const sent = await sendReminderTo(rem, targets);
  await getDb().insert(reminderRuns).values({ slot: `manual-${Date.now()}`, day: jstDay(), reminderId: rem.id, sent }).onConflictDoNothing();
  return { targets: targets.length, sent };
}
export async function recentRuns(): Promise<{ slot: string; day: string; reminderId: number | null; sent: number; ranAt: string }[]> {
  const rows = await getDb().select().from(reminderRuns).orderBy(raw`${reminderRuns.ranAt} desc`).limit(14);
  return rows.map((r) => ({ slot: r.slot, day: String(r.day), reminderId: r.reminderId, sent: r.sent, ranAt: r.ranAt.toISOString() }));
}
/* how many players can receive pushes at all */
export async function reachCount(): Promise<{ players: number; guests: number }> {
  const [r] = await getDb().select({ n: raw<number>`count(distinct ${pushSubscriptions.userId})` }).from(pushSubscriptions);
  const [g] = await getDb().select({ n: raw<number>`count(*)` }).from(guestPush);
  return { players: Number(r?.n ?? 0), guests: Number(g?.n ?? 0) };
}
