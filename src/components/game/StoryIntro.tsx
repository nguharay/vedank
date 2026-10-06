"use client";

import { useEffect, useRef, useState } from "react";
import { Mascot } from "./Mascot";

/* ---------- the story, told in pictures ----------
   A 4-scene animated intro shown the first time the game opens (and from the
   menu any time). Almost no words — each scene is a moment you can read at a
   glance, with at most a two-word caption:
     1. The Number Kingdom: numbers float happily… until monsters swoop in
        and grab them.
     2. An old scroll rises from the ground, glowing. The boy finds it.
     3. The boy runs at a monster, a sum flashes, ⚡ — the monster bursts into
        sparkles and a number flies home.
     4. On a hill an egg wobbles, cracks, a baby dragon pops out; a little
        town grows behind it. "Your adventure begins."
   Each scene auto-advances; tap anywhere for the next, or Skip. */
const SCENE_MS = 3600;

export function StoryIntro({ lang, onDone }: { lang: "en" | "ja"; onDone: () => void }) {
  const ja = lang === "ja";
  const [scene, setScene] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scenes = 4;

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (scene >= scenes - 1) return;          /* the last scene waits for the button */
    timer.current = setTimeout(() => setScene((s) => s + 1), SCENE_MS);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [scene]);

  const next = () => (scene < scenes - 1 ? setScene(scene + 1) : onDone());
  const caps = ja
    ? ["すうじの国", "ふしぎな巻物", "ひらめき！", "冒険のはじまり"]
    : ["The Number Kingdom", "A secret scroll", "Aha!", "Your adventure begins"];

  return (
    <div className="story" role="dialog" aria-modal="true" aria-label={ja ? "ものがたり" : "The story"} onClick={next}>
      <button className="story-skip" onClick={(e) => { e.stopPropagation(); onDone(); }}>{ja ? "スキップ" : "Skip"}</button>

      <div key={scene} className={`story-scene s${scene + 1}`}>
        {scene === 0 && (
          <>
            <span className="st-stars" aria-hidden="true" />
            {["1", "2", "3", "5", "7", "9", "11"].map((n, i) => (
              <span key={n} className={`st-num n${i + 1}`}>{n}</span>
            ))}
            <span className="st-monster m1" aria-hidden="true">👾</span>
            <span className="st-monster m2" aria-hidden="true">👹</span>
          </>
        )}
        {scene === 1 && (
          <>
            <span className="st-moon" aria-hidden="true" />
            <span className="st-ground" aria-hidden="true" />
            <span className="st-scroll" aria-hidden="true">📜</span>
            <span className="st-glow" aria-hidden="true" />
            {[0, 1, 2, 3, 4, 5].map((i) => <span key={i} className={`st-spark k${i}`} aria-hidden="true">✨</span>)}
            <span className="st-boy look"><Mascot animated={false} mood="excited" /></span>
          </>
        )}
        {scene === 2 && (
          <>
            <span className="st-ground" aria-hidden="true" />
            <span className="st-boy run"><Mascot animated={false} mood="excited" /></span>
            <span className="st-sum mono">32 × 11</span>
            <span className="st-bolt" aria-hidden="true">⚡</span>
            <span className="st-monster m3" aria-hidden="true">👾</span>
            <span className="st-burst" aria-hidden="true">💥</span>
            <span className="st-home mono" aria-hidden="true">352</span>
          </>
        )}
        {scene === 3 && (
          <>
            <span className="st-sun" aria-hidden="true" />
            <span className="st-hill" aria-hidden="true" />
            <span className="st-town" aria-hidden="true">🏠🏪🌳🏯🌸</span>
            <span className="st-egg" aria-hidden="true">🥚</span>
            <span className="st-hatch" aria-hidden="true">🐣</span>
            <span className="st-dragon" aria-hidden="true">🐉</span>
            <span className="st-boy wave"><Mascot animated={false} mood="excited" /></span>
          </>
        )}
        <div className="story-cap">{caps[scene]}</div>
      </div>

      <div className="story-dots" aria-hidden="true">
        {Array.from({ length: scenes }, (_, i) => <i key={i} className={i === scene ? "on" : i < scene ? "done" : ""} />)}
      </div>
      {scene === scenes - 1 && (
        <button className="story-go" onClick={(e) => { e.stopPropagation(); onDone(); }}>
          {ja ? "はじめる ▶" : "Let's go ▶"}
        </button>
      )}
    </div>
  );
}
