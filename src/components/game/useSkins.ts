"use client";
import { useEffect, useState } from "react";

const STORE_KEY = "sutraSprint.skin";

export type SkinUnlockCtx = { level: number; bossClears: number; solvedCount: number };

/* The buddy's outfit. Its body stays the same sprout — the character shouldn't
   change identity — and these colour the attire layered over it. */
export type Outfit = {
  /* head piece: crown of flames, leaf circlet, bolt, star halo… */
  head: "none" | "leaf" | "flame" | "bolt" | "halo" | "crown";
  cape: string;
  capeEdge: string;
  scarf: string;
  /* small floating accent particles around the buddy */
  spark: string;
};

export type SkinDef = {
  id: string;
  name: string;
  nameJa: string;
  blurb: string;
  blurbJa: string;
  swatch: string;
  unlockLabel: string;
  unlockLabelJa: string;
  unlocked: (c: SkinUnlockCtx) => boolean;
  outfit: Outfit;
};

export const SKINS: SkinDef[] = [
  {
    id: "classic",
    name: "Sutra Dawn",
    nameJa: "スートラの夜明け",
    blurb: "The colours you start with — violet to sunrise.",
    blurbJa: "はじまりの色。紫から朝日へ。",
    swatch: "linear-gradient(135deg,#9B30FF,#FF4D1C)",
    unlockLabel: "Always yours",
    unlockLabelJa: "最初から使えます",
    unlocked: () => true,
    outfit: { head: "none", cape: "#9B30FF", capeEdge: "#FF4D1C", scarf: "#FF4D1C", spark: "#FFCC00" },
  },
  {
    id: "inferno",
    name: "Agni Ember",
    nameJa: "炎のアグニ",
    blurb: "Agni is the fire that takes the offering. Earned in battle.",
    blurbJa: "供物を運ぶ火の神アグニ。戦いで得られます。",
    swatch: "linear-gradient(135deg,#FF7A3D,#D81B5B)",
    unlockLabel: "Beat 1 boss stage",
    unlockLabelJa: "ボスステージを1つクリア",
    unlocked: (c) => c.bossClears >= 1,
    outfit: { head: "flame", cape: "#D81B5B", capeEdge: "#FF7A3D", scarf: "#FF7A3D", spark: "#FFB020" },
  },
  {
    id: "verdant",
    name: "Soma Grove",
    nameJa: "ソーマの森",
    blurb: "Patience with the matchsticks grows something green.",
    blurbJa: "マッチ棒をじっくり解く人に緑が芽吹きます。",
    swatch: "linear-gradient(135deg,#1FE07A,#0FA857)",
    unlockLabel: "Solve 6 matchstick puzzles",
    unlockLabelJa: "マッチ棒パズルを6問クリア",
    unlocked: (c) => c.solvedCount >= 6,
    outfit: { head: "leaf", cape: "#0FA857", capeEdge: "#1FE07A", scarf: "#7BE23A", spark: "#B7F27A" },
  },
  {
    id: "electric",
    name: "Indra Bolt",
    nameJa: "インドラの雷",
    blurb: "Indra's thunderbolt — speed rewarded with speed's colour.",
    blurbJa: "インドラの雷。速さには速さの色を。",
    swatch: "linear-gradient(135deg,#00C2FF,#4D6BFF)",
    unlockLabel: "Reach level 5",
    unlockLabelJa: "レベル5に到達",
    unlocked: (c) => c.level >= 5,
    outfit: { head: "bolt", cape: "#4D6BFF", capeEdge: "#00E0FF", scarf: "#00C2FF", spark: "#00E0FF" },
  },
  {
    id: "cosmic",
    name: "Nakshatra",
    nameJa: "ナクシャトラ",
    blurb: "The 27 lunar mansions. For those who keep beating bosses.",
    blurbJa: "27の月宿。ボスを倒し続けた証。",
    swatch: "linear-gradient(135deg,#8B5CF6,#FF3DA6)",
    unlockLabel: "Beat 3 boss stages",
    unlockLabelJa: "ボスステージを3つクリア",
    unlocked: (c) => c.bossClears >= 3,
    outfit: { head: "halo", cape: "#8B5CF6", capeEdge: "#FF3DA6", scarf: "#C79BFF", spark: "#E9D4FF" },
  },
  {
    id: "gold",
    name: "Hiranya",
    nameJa: "ヒラニヤ",
    blurb: "Hiranya — the golden. The long road's colour.",
    blurbJa: "ヒラニヤ＝黄金。長い道を歩いた人の色。",
    swatch: "linear-gradient(135deg,#FFCC00,#D89B00)",
    unlockLabel: "Reach level 12",
    unlockLabelJa: "レベル12に到達",
    unlocked: (c) => c.level >= 12,
    outfit: { head: "crown", cape: "#D89B00", capeEdge: "#FFE480", scarf: "#FFCC00", spark: "#FFE480" },
  },
];

export const SKIN_BY_ID = new Map(SKINS.map((s) => [s.id, s]));

export function skinOf(id: string): SkinDef {
  return SKIN_BY_ID.get(id) ?? SKINS[0];
}
export function skinName(s: SkinDef, ja: boolean) {
  return ja ? s.nameJa : s.name;
}
export function skinBlurb(s: SkinDef, ja: boolean) {
  return ja ? s.blurbJa : s.blurb;
}
export function skinUnlockLabel(s: SkinDef, ja: boolean) {
  return ja ? s.unlockLabelJa : s.unlockLabel;
}

export function useSkins() {
  const [skinId, setSkinId] = useState("classic");

  /* Stamped on <html>, not on #app, for the same reason the theme is: the body
     background sits outside #app and would otherwise keep the default palette,
     leaving a mismatched frame around a re-skinned app. */
  function stamp(id: string) {
    document.documentElement.setAttribute("data-skin", id);
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved && SKIN_BY_ID.has(saved)) {
        setSkinId(saved);
        stamp(saved);
        return;
      }
    } catch {}
    stamp("classic");
  }, []);

  function selectSkin(id: string) {
    if (!SKIN_BY_ID.has(id)) return;
    setSkinId(id);
    stamp(id);
    try {
      localStorage.setItem(STORE_KEY, id);
    } catch {}
  }

  return { skinId, selectSkin, skin: skinOf(skinId) };
}
