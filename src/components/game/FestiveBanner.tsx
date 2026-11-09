"use client";

import { useState } from "react";

/* A greeting at the very top of Home for a festival, shown only inside its
   window (Japan time) and gone by itself afterwards. */
type Festival = {
  id: string; from: string; until: string; title: { en: string; ja: string }; body: { en: string; ja: string };
  /* an optional button: a short label, never the bare URL */
  link?: { href: string; label: { en: string; ja: string } };
};

const FESTIVALS: Festival[] = [
  {
    id: "diwali-2026",
    /* Diwali (Lakshmi Puja) is 8 Nov 2026: shown that day and the next */
    from: "2026-11-08T00:00:00+09:00",
    until: "2026-11-10T00:00:00+09:00",
    title: {
      en: "Happy Diwali! दीपावली (Diwali)",
      ja: "Happy Diwali! दीपावली（ディワリ）おめでとう！",
    },
    body: {
      en: "Diwali is the Indian festival that celebrates light over darkness, good over evil, and knowledge over ignorance. ✨",
      ja: "ディワリは、光が闇に、善が悪に、そして知恵が無知に勝つことを祝うインドのお祭りです。✨",
    },
    link: { href: "https://www.instagram.com/vedankac/", label: { en: "📸 @vedankac on Instagram", ja: "📸 Instagramで見る @vedankac" } },
  },
];

export function FestiveBanner({ lang }: { lang: "en" | "ja" }) {
  /* read once per mount; a page left open past midnight keeps it until reload */
  const [now] = useState(() => Date.now());
  const f = FESTIVALS.find((x) => now >= Date.parse(x.from) && now < Date.parse(x.until));
  if (!f) return null;
  return (
    <div className={`festive-banner ${f.id}`} role="note">
      <span className="festive-sparks" aria-hidden="true"><i>✦</i><i>✧</i><i>✦</i><i>✧</i><i>✦</i></span>
      <span className="festive-diya" aria-hidden="true">🪔</span>
      <div className="festive-body">
        <strong>{f.title[lang]}</strong>
        <span>{f.body[lang]}</span>
        {f.link && <a className="festive-link" href={f.link.href} target="_blank" rel="noopener noreferrer">{f.link.label[lang]}</a>}
      </div>
    </div>
  );
}
