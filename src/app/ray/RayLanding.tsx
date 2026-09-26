"use client";

import Link from "next/link";
import { InterestForm, ContactLinks } from "@/components/InterestForm";
import { Mascot } from "@/components/game/Mascot";

/* Landing page for Ray先生's classes — for ads, flyers, LINE and social posts.
   Japanese only. Two goals, in order: enquire about classes (the same form as
   in the app), or start playing the game. */
export function RayLanding({ enabled }: { enabled: boolean }) {
  return (
    <div className="lp" lang="ja">
      <header className="lp-top">
        <Link href="/" className="lp-brand">
          <img src="/brand/vedank-mark.png" alt="" />
          <span>VedAnk Academy</span>
        </Link>
        <Link href="/" className="lp-top-play">🎮 ゲームで遊ぶ</Link>
      </header>

      <section className="lp-hero">
        <div className="lp-hero-text">
          <div className="lp-kicker">オンライン ・ 対面（日本）</div>
          <h1>Ray先生と学ぶ<br />インド式数学</h1>
          <p>考えて、ひらめいて、挑戦しよう！<br />数学の「見方」が変わる授業です。</p>
          <div className="lp-hero-btns">
            <a href="#form" className="lp-btn lp-btn-primary">授業について問い合わせる →</a>
            <Link href="/" className="lp-btn lp-btn-ghost">まずはゲームで遊ぶ 🎮</Link>
          </div>
        </div>
        <div className="lp-hero-mascot" aria-hidden="true"><Mascot mood="excited" /></div>
      </section>

      <section className="lp-features">
        {[
          ["💡", "数学の「見方」が身につく", "暗記ではなく、数のパターンに気づく力を育てます。"],
          ["📘", "本とアプリに沿った授業", "テキストとゲームアプリで、授業のあとも楽しく復習。"],
          ["🏫", "対面（日本）・オンライン", "教室でも、おうちからでも受講できます。"],
          ["🧒", "子どもから大人まで", "小学生・中学生・大人、先生や学校の研修にも。"],
        ].map(([icon, title, body]) => (
          <div className="lp-feature" key={title}>
            <span className="lp-feature-ic">{icon}</span>
            <div className="lp-feature-title">{title}</div>
            <p>{body}</p>
          </div>
        ))}
      </section>

      <section className="lp-game">
        <div className="lp-game-text">
          <div className="lp-kicker lp-kicker-dark">ゲームアプリ</div>
          <h2>毎日5分、ゲームで<br />インド式数学トレーニング</h2>
          <ul>
            <li>✅ 25のトピックをステージでクリア</li>
            <li>✅ 風船・○×ゲームなど15以上のミニゲーム</li>
            <li>✅ 友だちと対戦・毎日のチャレンジ</li>
          </ul>
          <Link href="/" className="lp-btn lp-btn-primary lp-btn-big">🎮 今すぐゲームで遊ぶ</Link>
          <div className="lp-game-note">登録なしですぐ遊べます</div>
        </div>
      </section>

      <section className="lp-form" id="form">
        <h2>授業のお問い合わせ</h2>
        <p className="lp-form-lede">下のフォームを送るか、Ray先生に直接ご連絡ください。</p>
        <div className="lp-form-card">
          {enabled ? <InterestForm lang="ja" source="landing" /> : <ContactLinks lang="ja" />}
        </div>
      </section>

      <section className="lp-final">
        <div className="lp-final-mascot" aria-hidden="true"><Mascot mood="happy" /></div>
        <h2>まずは遊んでみよう！</h2>
        <p>ゲームでインド式数学の楽しさを体験してみてください。</p>
        <Link href="/" className="lp-btn lp-btn-primary lp-btn-big">🎮 ゲームをはじめる</Link>
      </section>

      <footer className="lp-foot">© VedAnk Academy · <Link href="/">インド式数学ゲーム</Link></footer>
    </div>
  );
}
