"use client";

import Link from "next/link";
import { InterestForm, ContactLinks, ClassesHero } from "@/components/InterestForm";

/* Public, shareable page for Ray先生's live classes — for flyers, social posts
   and the in-app links. Japanese only: the classes are for learners in Japan. */
export function ClassesPage({ enabled }: { enabled: boolean }) {
  return (
    <div className="auth-shell" lang="ja">
      <div className="auth-card auth-card-wide">
        <ClassesHero lang="ja" />
        <p className="interest-lede">
          アプリで遊ぶだけでなく、Ray先生と一緒に学べます。この本とアプリに沿った授業です。お気軽にどうぞ！
        </p>
        {enabled ? <InterestForm lang="ja" source="classes-page" /> : <ContactLinks lang="ja" />}
        <p className="sub" style={{ textAlign: "center", marginTop: 14 }}><Link href="/">← アプリにもどる</Link></p>
      </div>
    </div>
  );
}
