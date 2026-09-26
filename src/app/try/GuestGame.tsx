"use client";

import { useEffect, useState } from "react";
import { GameApp } from "@/components/game/GameApp";
import type { ProgressState } from "@/lib/game/state";
import type { OverrideMap } from "@/lib/game/overrides";

const GUEST_KEY = "sutraSprint.guestProgress";
const EMPTY: ProgressState = { topics: {}, arena: { solved: {}, bestMoves: {} } };

/* Progress is read on the client because it lives in localStorage; rendering
   the game before it is read would start the guest at zero and then jump. */
export function GuestGame({ overrides = {}, classesEnabled = false }: { overrides?: OverrideMap; classesEnabled?: boolean }) {
  const [progress, setProgress] = useState<ProgressState | null>(null);

  useEffect(() => {
    let saved: ProgressState = EMPTY;
    try {
      const raw = localStorage.getItem(GUEST_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && parsed.topics) saved = parsed as ProgressState;
      }
    } catch {}
    setProgress(saved);
  }, []);

  if (!progress) return <div className="guest-boot" aria-hidden="true" />;

  return (
    <GameApp
      guest
      initialProgress={progress}
      dailyStreak={0}
      initialLang="ja"
      user={{ name: null, email: null }}
      overrides={overrides}
      classesEnabled={classesEnabled}
    />
  );
}
