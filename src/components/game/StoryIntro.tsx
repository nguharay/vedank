"use client";

import { useEffect, useRef, useState } from "react";
import { Mascot } from "./Mascot";

/* ---------- the welcome, told in five warm scenes ----------
   Shown the first time the app opens (and from the menu any time). One short
   line per scene, in big friendly type over a picture that moves:
     1. Welcome to Ray's learning app — the buddy waves, the logo glows
     2. Play with numbers, learn Vedic Maths — numbers float and turn into games
     3. Everything is free — a ribbon, a burst of confetti
     4. A free account unlocks it all — sign up (or "later"); a signed-in
        player sees "you're all set" instead
     5. Let's enjoy the world of numbers — the buddy jumps, sparkles
   Scenes move on by themselves, except the account scene and the last one,
   which wait for a tap. Tap anywhere for the next scene; Skip leaves. */
const SCENE_MS = 4200;

type Scene = { cls: string; line: [string, string]; sub?: [string, string] };
const SCENES: Scene[] = [
  { cls: "wi-hello", line: ["Welcome to Ray's learning app! 😊", "Rayの教育アプリへようこそ！😊"] },
  { cls: "wi-play", line: ["Play with numbers and learn Vedic Maths the fun way! 🎮🔢", "数字で遊びながら、インド式数学を楽しく学ぼう！🎮🔢"] },
  { cls: "wi-free", line: ["Every game and every lesson is free!", "ゲームも数学の学習も、すべて無料！"] },
  { cls: "wi-account", line: ["Make a free account to unlock everything.", "すべてのコンテンツを利用するには、無料アカウントに登録してください。"],
    sub: ["Just your email. It keeps your progress safe on every device.", "メールアドレスだけでOK。どの端末でも記録が引きつげるよ。"] },
  { cls: "wi-go", line: ["Let's dive into the world of numbers! ✨", "さあ、数字の世界を楽しもう！✨"] },
];
const WAITS = new Set([3, 4]);   /* scenes that wait for a tap */

export function StoryIntro({ lang, onDone, guest = true }: { lang: "en" | "ja"; onDone: () => void; guest?: boolean }) {
  const ja = lang === "ja";
  const [scene, setScene] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const last = SCENES.length - 1;

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (WAITS.has(scene)) return;
    timer.current = setTimeout(() => setScene((s) => Math.min(last, s + 1)), SCENE_MS);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [scene, last]);

  const next = () => (scene < last ? setScene(scene + 1) : onDone());
  const s = SCENES[scene];
  const tx = (p: [string, string]) => (ja ? p[1] : p[0]);

  return (
    <div className={`wi ${s.cls}`} role="dialog" aria-modal="true" aria-label={ja ? "ようこそ" : "Welcome"} onClick={next}>
      <button className="wi-skip" onClick={(e) => { e.stopPropagation(); onDone(); }}>{ja ? "スキップ" : "Skip"}</button>

      {/* the picture: one per scene, re-mounted so its animation replays */}
      <div key={scene} className="wi-art" aria-hidden="true">
        {scene === 0 && (
          <>
            <span className="wi-glow" />
            <img className="wi-logo" src="/brand/vedank-full.png" alt="" />
            <span className="wi-buddy wave"><Mascot animated={false} mood="excited" /></span>
            <span className="wi-bubble">{ja ? "こんにちは！" : "Hello!"}</span>
            {[0, 1, 2, 3, 4, 5].map((i) => <i key={i} className={`wi-spark k${i}`}>✨</i>)}
          </>
        )}
        {scene === 1 && (
          <>
            {["1", "2", "3", "5", "7", "9", "+", "×"].map((n, i) => <b key={n} className={`wi-num n${i}`}>{n}</b>)}
            {["🎮", "🏁", "🐉", "🍣", "🎈", "🪢"].map((g, i) => <i key={g} className={`wi-game g${i}`}>{g}</i>)}
            <span className="wi-buddy bob"><Mascot animated={false} mood="happy" /></span>
          </>
        )}
        {scene === 2 && (
          <>
            {Array.from({ length: 18 }, (_, i) => <i key={i} className={`wi-confetti c${i % 6}`} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 6) * 0.18}s` }} />)}
            <span className="wi-ribbon"><b>{ja ? "ぜんぶ無料！" : "100% FREE!"}</b><small>{ja ? "ゲーム ＋ レッスン" : "games + lessons"}</small></span>
            <span className="wi-tiles">{["⚔️", "🎮", "🧩", "🃏"].map((g) => <i key={g}>{g}</i>)}</span>
          </>
        )}
        {scene === 3 && (
          <>
            <span className="wi-card">
              <span className="wi-card-row">📧 <i>you@email</i></span>
              <span className="wi-card-row ok">✅ {ja ? "無料アカウント" : "Free account"}</span>
              <span className="wi-unlock">🔓</span>
            </span>
            <span className="wi-buddy point"><Mascot animated={false} mood="happy" /></span>
          </>
        )}
        {scene === 4 && (
          <>
            {Array.from({ length: 10 }, (_, i) => <i key={i} className={`wi-star s${i}`}>✦</i>)}
            <span className="wi-buddy jump"><Mascot animated={false} mood="excited" /></span>
            <span className="wi-firework f0" /><span className="wi-firework f1" /><span className="wi-firework f2" />
          </>
        )}
      </div>

      {/* the words */}
      <div key={`t${scene}`} className="wi-text">
        <p className="wi-line">{tx(s.line)}</p>
        {s.sub && <p className="wi-sub">{guest ? tx(s.sub) : (ja ? "✅ もう登録ずみ！すべてのコンテンツが使えるよ。" : "✅ You're signed in. Everything is unlocked!")}</p>}
        {scene === 3 && guest && (
          <div className="wi-btns" onClick={(e) => e.stopPropagation()}>
            <a className="btn btn-primary wi-cta" href="/signup?from=%2F">{ja ? "無料で登録する" : "Sign up free"}</a>
            <button className="btn btn-ghost wi-later" onClick={() => setScene(scene + 1)}>{ja ? "あとで" : "Later"}</button>
          </div>
        )}
        {(scene === last || (scene === 3 && !guest)) && (
          <button className="btn btn-primary wi-cta" onClick={(e) => { e.stopPropagation(); next(); }}>
            {scene === last ? (ja ? "はじめる ▶" : "Let's go ▶") : (ja ? "つぎへ ▶" : "Next ▶")}
          </button>
        )}
      </div>

      <div className="wi-dots" aria-hidden="true">
        {SCENES.map((_, i) => <i key={i} className={i === scene ? "on" : i < scene ? "done" : ""} />)}
      </div>
    </div>
  );
}
