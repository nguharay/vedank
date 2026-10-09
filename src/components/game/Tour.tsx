"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { track } from "@/lib/analytics";

/* ---------- first-open guided tour ----------
   One thing at a time: the button being explained is lit up, everything
   else is dimmed grey, and a speech bubble says what it is in a sentence.
   Next / Skip; tapping the lit button also goes on. Steps whose button isn't
   on screen (e.g. "Save" for a signed-in player) are skipped automatically.
   Shown once after the story intro; the menu can replay it. */

type Step = { sel: string | null; icon: string; title: [string, string]; text: [string, string] };

export const TOUR_KEY = "sutraSprint.tourDone";

function steps(guest: boolean): Step[] {
  const s: Step[] = [
    { sel: null, icon: "👋", title: ["Welcome!", "ようこそ！"],
      text: ["Let me show you around — it takes 30 seconds.", "かんたんな使い方を案内するね。30秒でおわるよ。"] },
    { sel: ".home-tabs .home-tab:nth-child(1)", icon: "⚔️", title: ["Learn", "まなぶ"],
      text: ["Lessons teach one Vedic maths trick at a time. You practise by battling monsters!", "インド式計算をひとつずつレッスンで覚えるよ。モンスターとのバトルで練習！"] },
    { sel: ".continue-card", icon: "▶️", title: ["Start here", "まずはここから"],
      text: ["Tap this to start your next lesson battle.", "ここをタップすると、つぎのレッスンバトルがはじまるよ。"] },
    { sel: ".dock-play", icon: "🎮", title: ["Games", "ゲーム"],
      text: ["All the maths games are here. A few are open at first — finish games to unlock more 🔓", "ゲームはここ！さいしょは少しだけ。クリアすると新しいゲームがアンロックされるよ🔓"] },
    { sel: ".home-tabs .home-tab:nth-child(2)", icon: "🎁", title: ["Come back every day", "毎日ひらこう"],
      text: ["Open the app each day for a gift and a new Great Minds card 🃏 — plus a daily challenge.", "毎日アプリを開くとプレゼント🎁と偉人カード🃏がもらえる。デイリーチャレンジもあるよ。"] },
  ];
  if (guest) s.push({ sel: ".dock-save", icon: "💾", title: ["Free account", "無料アカウント"],
    text: ["Sign up free with just your email, so your progress is never lost — and play every game.", "メールアドレスだけで無料登録！データが消えないし、全部のゲームであそべるよ。"] });
  s.push(
    { sel: ".install-banner||.avatar-btn", icon: "📲", title: ["Add to your home screen", "ホーム画面に追加"],
      text: ["Put the game on your home screen so it opens like an app. (iPhone: Share button → “Add to Home Screen”)", "ホーム画面に追加すると、アプリみたいにすぐ開けるよ。（iPhone：共有ボタン→「ホーム画面に追加」）"] },
    { sel: ".avatar-btn", icon: "☰", title: ["Menu", "メニュー"],
      text: ["🎁 Invite friends, 🃏 your card collection, 🔔 notifications and language are all in here.", "🎁友だちを招待・🃏カード図鑑・🔔通知・言語の切りかえはここ。"] },
    { sel: null, icon: "🎉", title: ["You're ready!", "じゅんびOK！"],
      text: ["Try a lesson or a game now. Have fun!", "さっそくレッスンかゲームをやってみよう。楽しんでね！"] },
  );
  return s;
}

type Box = { x: number; y: number; w: number; h: number } | null;

export function Tour({ lang, guest, onDone }: { lang: "en" | "ja"; guest: boolean; onDone: () => void }) {
  const ja = lang === "ja";
  const [list] = useState(() => steps(guest));
  const [i, setI] = useState(0);
  const [box, setBox] = useState<Box>(null);
  const step = list[i];

  const finish = useCallback((how: "done" | "skip") => {
    try { localStorage.setItem(TOUR_KEY, "1"); } catch {}
    track(how === "done" ? "tour_done" : "tour_skip", { detail: `step=${i + 1}` });
    onDone();
  }, [i, onDone]);

  const next = useCallback(() => {
    if (i >= list.length - 1) { finish("done"); return; }
    setI(i + 1);
  }, [i, list.length, finish]);

  /* find the step's button; skip the step if it isn't on screen */
  useLayoutEffect(() => {
    if (!step.sel) { const t = setTimeout(() => setBox(null), 0); return () => clearTimeout(t); }
    /* "a||b": the first of these that is on screen */
    const el = step.sel.split("||").map((q) => document.querySelector(q) as HTMLElement | null).find((e) => e && e.offsetParent) ?? null;
    if (!el || !el.offsetParent) { setTimeout(() => setI((n) => Math.min(n + 1, list.length - 1)), 0); return; }
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    const measure = () => {
      const r = el.getBoundingClientRect();
      setBox({ x: r.left, y: r.top, w: r.width, h: r.height });
    };
    const t1 = setTimeout(measure, 380);
    window.addEventListener("resize", measure);
    return () => { clearTimeout(t1); window.removeEventListener("resize", measure); };
  }, [step, list.length]);

  useEffect(() => { track("tour_step", { detail: `${i + 1}:${step.title[0]}` }); }, [i, step]);

  const pad = 8;
  const below = box ? box.y + box.h / 2 < window.innerHeight / 2 : true;
  return (
    <div className="tour" role="dialog" aria-modal="true" aria-label={ja ? "使い方ツアー" : "Guided tour"}>
      {box ? (
        <button
          className="tour-spot"
          style={{ left: box.x - pad, top: box.y - pad, width: box.w + pad * 2, height: box.h + pad * 2 }}
          onClick={next}
          aria-label={ja ? "つぎへ" : "Next"}
        />
      ) : (
        <div className="tour-dim" />
      )}
      <div className={`tour-bubble${box ? (below ? " below" : " above") : " center"}`}
        style={box ? (below ? { top: box.y + box.h + pad + 14 } : { bottom: window.innerHeight - box.y + pad + 14 }) : undefined}>
        <div className="tour-head"><span className="tour-ico">{step.icon}</span><b>{step.title[ja ? 1 : 0]}</b></div>
        <p>{step.text[ja ? 1 : 0]}</p>
        <div className="tour-foot">
          <span className="tour-dots">{list.map((_, k) => <i key={k} className={k === i ? "on" : k < i ? "done" : ""} />)}</span>
          {i < list.length - 1 && <button className="tour-skip" onClick={() => finish("skip")}>{ja ? "スキップ" : "Skip"}</button>}
          <button className="btn btn-primary tour-next" onClick={next}>
            {i === 0 ? (ja ? "はじめる ▶" : "Start ▶") : i >= list.length - 1 ? (ja ? "あそぶ！" : "Let's go!") : (ja ? "つぎへ ▶" : "Next ▶")}
          </button>
        </div>
      </div>
    </div>
  );
}
