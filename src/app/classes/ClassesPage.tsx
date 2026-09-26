"use client";

import Link from "next/link";
import { useLang } from "@/components/game/i18n";
import { InterestForm, ContactLinks, ClassesHero } from "@/components/InterestForm";

/* Public, shareable page for the live classes — for flyers, social posts and
   the in-app links. Japanese first, like the rest of the app's front door. */
export function ClassesPage({ enabled }: { enabled: boolean }) {
  const { lang, setLang } = useLang("ja");
  const ja = lang === "ja";
  return (
    <div className="auth-shell">
      <div className="auth-card auth-card-wide">
        <div className="lang-toggle auth-lang">
          <button type="button" className={ja ? "active" : ""} onClick={() => setLang("ja")}>日本語</button>
          <button type="button" className={!ja ? "active" : ""} onClick={() => setLang("en")}>English</button>
        </div>
        <ClassesHero lang={lang} />
        <p className="interest-lede">
          {ja
            ? "アプリで遊ぶだけでなく、先生と一緒に学べます。この本とアプリに沿った授業です。お気軽にどうぞ！"
            : "Beyond the app, learn with a teacher — lessons follow the book and this app. Leave your details or contact us directly."}
        </p>
        {enabled ? (
          <InterestForm lang={lang} source="classes-page" />
        ) : (
          <ContactLinks lang={lang} />
        )}
        <p className="sub" style={{ textAlign: "center", marginTop: 14 }}><Link href="/">{ja ? "← アプリにもどる" : "← Back to the app"}</Link></p>
      </div>
    </div>
  );
}
