"use client";

import Link from "next/link";
import { InterestForm, ContactLinks } from "@/components/InterestForm";
import { Mascot } from "@/components/game/Mascot";

/* Why join the classes — six short comic panels. */
const BENEFITS: { title: string; line: string }[] = [
  { title: "直接教わる", line: "Ray先生がていねいに教えます" },
  { title: "すぐ質問", line: "わからないところをすぐ聞ける" },
  { title: "マイペース", line: "レベルや目標に合わせて進む" },
  { title: "考える力", line: "答えより「考え方」が身につく" },
  { title: "自信がつく", line: "「できた！」が増えていく" },
  { title: "楽しく続く", line: "本とアプリで、授業のあとも復習" },
];


/* Landing page for Ray先生's classes — for ads, flyers, LINE and social posts.
   Japanese only and deliberately short: the essentials → form → why join,
   with a way into the game at the top and the bottom. */
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


      <section className="lp-section lp-about">
        <h2>授業について</h2>
        <ul className="lp-facts">
          <li><b>🏫 かたち</b> 日本国内の対面授業／オンライン授業</li>
          <li><b>🧒 対象</b> 小学生・中学生・大人、先生や学校の研修</li>
          <li><b>📘 教材</b> Ray先生の本とこのゲームアプリ</li>
        </ul>
      </section>


      <section className="lp-form" id="form">
        <h2>授業のお問い合わせ</h2>
        <div className="lp-form-card">
          {enabled ? <InterestForm lang="ja" source="landing" /> : <ContactLinks lang="ja" />}
        </div>
      </section>

      <section className="lp-section">
        <h2>授業に参加すると、こんないいことが！</h2>
        <div className="lp-comic">
          {BENEFITS.map((b, i) => (
            <div className="lp-panel" key={b.title}>
              <div className="lp-panel-head"><span className="lp-panel-num">{i + 1}</span>{b.title}</div>
              <div className="lp-bubble">{b.line}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-final">
        <div className="lp-final-mascot" aria-hidden="true"><Mascot mood="happy" /></div>
        <div>
          <h2>まずはゲームで遊んでみよう！</h2>
          <p>25のトピックと15以上のミニゲーム。登録なしですぐ遊べます。</p>
          <Link href="/" className="lp-btn lp-btn-primary">🎮 ゲームをはじめる</Link>
        </div>
      </section>

      <footer className="lp-foot">© VedAnk Academy · <Link href="/">インド式数学ゲーム</Link></footer>
    </div>
  );
}
