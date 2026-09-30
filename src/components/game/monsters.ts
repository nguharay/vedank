import { TOPICS, STAGE_COUNT } from "@/lib/game/topics";

/* Every topic is guarded by its own monster; stage 5 is its crowned king.
   Kept friendly — this is a children's maths game. */
export const ROSTER = [
  { emoji: "👾", en: "Blip", ja: "ピコ" },
  { emoji: "🐙", en: "Tako", ja: "タコすけ" },
  { emoji: "🦖", en: "Rexy", ja: "ザウルス" },
  { emoji: "👻", en: "Boo", ja: "オバケン" },
  { emoji: "🤖", en: "Robo", ja: "ロボッチ" },
  { emoji: "🦂", en: "Scorp", ja: "サソリン" },
  { emoji: "🐉", en: "Drako", ja: "ドラゴ" },
  { emoji: "🦇", en: "Batty", ja: "コウモリン" },
  { emoji: "🐺", en: "Wolfy", ja: "ウルフ" },
  { emoji: "🦈", en: "Sharky", ja: "シャーク" },
];

export type Monster = { emoji: string; name: string; boss: boolean };

export function monsterFor(topicId: string, stageN: number, lang: "en" | "ja"): Monster {
  const i = Math.max(0, TOPICS.findIndex((t) => t.id === topicId));
  const m = ROSTER[i % ROSTER.length];
  const boss = stageN === STAGE_COUNT;
  const base = lang === "ja" ? m.ja : m.en;
  return { emoji: m.emoji, boss, name: boss ? (lang === "ja" ? `キング${base}` : `King ${base}`) : base };
}
