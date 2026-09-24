import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { topicOverrides } from "@/db/schema";
import type { Topic } from "./topics";

/* The text an admin may change on a lesson page. Everything else on a Topic
   — generators, examples, illustrations — stays in code. */
export type TopicOverride = {
  steps?: string[];
  stepsJa?: string[];
  tip?: string;
  tipJa?: string;
  blurb?: string;
  blurbJa?: string;
};
export type OverrideMap = Record<string, TopicOverride>;

const STR = (v: unknown, max = 400) => (typeof v === "string" ? v.slice(0, max) : undefined);
const LIST = (v: unknown) =>
  Array.isArray(v) ? v.filter((x) => typeof x === "string").map((x: string) => x.slice(0, 300)).slice(0, 12) : undefined;

/* Whatever arrives from the form is shaped here, so a stray field or a
   pasted novel cannot land in the row. */
export function sanitiseOverride(raw: unknown): TopicOverride {
  const r = (raw ?? {}) as Record<string, unknown>;
  const out: TopicOverride = {};
  const steps = LIST(r.steps), stepsJa = LIST(r.stepsJa);
  if (steps?.length) out.steps = steps;
  if (stepsJa?.length) out.stepsJa = stepsJa;
  const tip = STR(r.tip), tipJa = STR(r.tipJa), blurb = STR(r.blurb), blurbJa = STR(r.blurbJa);
  if (tip) out.tip = tip;
  if (tipJa) out.tipJa = tipJa;
  if (blurb) out.blurb = blurb;
  if (blurbJa) out.blurbJa = blurbJa;
  return out;
}

export async function loadOverrides(): Promise<OverrideMap> {
  try {
    const rows = await getDb().select().from(topicOverrides);
    return Object.fromEntries(rows.map((r) => [r.topicId, sanitiseOverride(r.data)]));
  } catch {
    /* No table yet, or no database: the defaults are the content. */
    return {};
  }
}

export async function saveOverride(topicId: string, raw: unknown, by: string): Promise<TopicOverride> {
  const data = sanitiseOverride(raw);
  const db = getDb();
  if (!Object.keys(data).length) {
    await db.delete(topicOverrides).where(eq(topicOverrides.topicId, topicId));
    return {};
  }
  await db
    .insert(topicOverrides)
    .values({ topicId, data, updatedBy: by })
    .onConflictDoUpdate({ target: topicOverrides.topicId, set: { data, updatedBy: by, updatedAt: new Date() } });
  return data;
}

/* Pure: a Topic with the admin's text laid over the code's. Used by the
   client, so no database here. */
export function applyOverride(topic: Topic, o?: TopicOverride): Topic {
  if (!o) return topic;
  return {
    ...topic,
    steps: o.steps ?? topic.steps,
    stepsJa: o.stepsJa ?? topic.stepsJa,
    tip: o.tip ?? topic.tip,
    tipJa: o.tipJa ?? topic.tipJa,
    blurb: o.blurb ?? topic.blurb,
    blurbJa: o.blurbJa ?? topic.blurbJa,
  };
}
