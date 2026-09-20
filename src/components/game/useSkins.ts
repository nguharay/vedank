"use client";
import { useEffect, useState } from "react";

const STORE_KEY = "sutraSprint.skin";

export type SkinDef = {
  id: string;
  name: string;
  swatch: string;
  unlockLabel: string;
  unlocked: (level: number, bossClears: number) => boolean;
};

export const SKINS: SkinDef[] = [
  { id: "classic", name: "Classic", swatch: "linear-gradient(135deg,var(--violet),var(--sun1))", unlockLabel: "Always available", unlocked: () => true },
  { id: "inferno", name: "Inferno", swatch: "linear-gradient(135deg,#FF7A3D,#D81B5B)", unlockLabel: "Beat 1 boss stage", unlocked: (_l, b) => b >= 1 },
  { id: "electric", name: "Electric", swatch: "linear-gradient(135deg,#00C2FF,#4D6BFF)", unlockLabel: "Reach level 5", unlocked: (l) => l >= 5 },
  { id: "cosmic", name: "Cosmic", swatch: "linear-gradient(135deg,#8B5CF6,#FF3DA6)", unlockLabel: "Beat 3 boss stages", unlocked: (_l, b) => b >= 3 },
];

export function useSkins() {
  const [skinId, setSkinId] = useState("classic");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved) setSkinId(saved);
    } catch {}
  }, []);

  function selectSkin(id: string) {
    setSkinId(id);
    try {
      localStorage.setItem(STORE_KEY, id);
    } catch {}
  }

  return { skinId, selectSkin };
}
