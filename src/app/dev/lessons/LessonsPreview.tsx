"use client";

import { useEffect, useState } from "react";
import { TopicView } from "@/components/game/views/TopicView";
import { UI } from "@/components/game/i18n";
import { TOPICS } from "@/lib/game/topics";
import type { Lang } from "@/lib/game/topics";

export function LessonsPreview() {
  const [lang, setLang] = useState<Lang>("en");
  const [id, setId] = useState<string | null>(null);
  const [focus, setFocus] = useState("");
  /* Read ?topic= after mount so the server render and first client render agree. */
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    /* eslint-disable react-hooks/set-state-in-effect -- one-time read of the URL on a dev-only page */
    setId(q.get("topic") || TOPICS[0].id);
    setFocus(q.get("focus") || "");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);
  if (!id) return null;
  const topic = TOPICS.find((t) => t.id === id) ?? TOPICS[0];
  const pick = (next: string) => {
    setId(next);
    window.history.replaceState({}, "", `?topic=${next}`);
    window.scrollTo(0, 0);
  };
  return (
    <div className={`app${focus ? ` dev-focus-${focus}` : ""}`} style={{ maxWidth: 480, margin: "0 auto", padding: "12px 12px 60px" }}>
      {/* ?focus=ex1 / ex2 — show one example card alone, for screenshots */}
      <style>{`.dev-focus-ex2 .topic-head,.dev-focus-ex2 h4,.dev-focus-ex2 .bookexample-flow-title,.dev-focus-ex2 .bookmethod-card,.dev-focus-ex2 .bookexample-card:not(.bookexample-second),.dev-focus-ex2 .lesson-tip{display:none}
.dev-focus-ex1 .topic-head,.dev-focus-ex1 h4,.dev-focus-ex1 .bookexample-flow-title,.dev-focus-ex1 .bookmethod-card,.dev-focus-ex1 .bookexample-second,.dev-focus-ex1 .lesson-tip{display:none}`}</style>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, position: "sticky", top: 0, zIndex: 5, background: "var(--bg)", padding: "8px 0" }}>
        <select value={topic.id} onChange={(e) => pick(e.target.value)} style={{ flex: 1, padding: 8, fontSize: 14 }}>
          {TOPICS.map((t, i) => <option key={t.id} value={t.id}>{i + 1}. {t.title}</option>)}
        </select>
        <button className="btn btn-ghost" style={{ padding: "8px 12px" }} onClick={() => setLang(lang === "en" ? "ja" : "en")}>{lang === "en" ? "日本語" : "EN"}</button>
      </div>
      <TopicView key={topic.id + lang} topic={topic} lang={lang} t={UI[lang]} />
    </div>
  );
}
