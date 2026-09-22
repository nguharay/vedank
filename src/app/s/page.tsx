import Link from "next/link";
import type { Metadata } from "next";

/* The page a shared link points at. Its only real job is to carry the Open
   Graph tags so X, LINE, WhatsApp and Facebook unfurl the card image instead of
   showing a bare URL — and then to give whoever clicked somewhere to go. */

type Q = { f?: string; v?: string; n?: string; s?: string };

const TITLES: Record<string, (v: string) => string> = {
  level: (v) => `Level ${v} at VedAnk Academy`,
  gems: (v) => `${v} gems earned doing Vedic maths`,
  streak: (v) => `${v}-day streak on Sutra Sprint`,
  hearts: (v) => `Still on ${v} hearts`,
  blitz: (v) => `${v} in Number Blitz`,
  bosses: (v) => `${v} boss stages beaten`,
  puzzles: (v) => `${v} matchstick puzzles solved`,
};

function clean(s: string | undefined, max: number) {
  return (s ?? "").replace(/[\u0000-\u001F<>]/g, "").slice(0, max);
}

function cardUrl(q: Q) {
  const p = new URLSearchParams();
  p.set("f", clean(q.f, 12) || "level");
  p.set("v", clean(q.v, 12) || "0");
  if (q.n) p.set("n", clean(q.n, 24));
  if (q.s) p.set("s", clean(q.s, 48));
  return `/api/share-card?${p.toString()}`;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Q>;
}): Promise<Metadata> {
  const q = await searchParams;
  const focus = clean(q.f, 12) || "level";
  const value = clean(q.v, 12) || "0";
  const headline = (TITLES[focus] ?? TITLES.level)(value);
  const img = cardUrl(q);

  return {
    title: `${headline} · Sutra Sprint`,
    description: "Vedic maths as a game — 25 sutras, a matchstick dojo and a daily challenge.",
    openGraph: {
      title: headline,
      description: "Vedic maths as a game. Can you beat it?",
      images: [{ url: img, width: 1200, height: 630 }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: headline,
      description: "Vedic maths as a game. Can you beat it?",
      images: [img],
    },
  };
}

export default async function SharePage({ searchParams }: { searchParams: Promise<Q> }) {
  const q = await searchParams;
  const focus = clean(q.f, 12) || "level";
  const value = clean(q.v, 12) || "0";
  const headline = (TITLES[focus] ?? TITLES.level)(value);

  return (
    <div className="auth-shell">
      <div className="auth-card share-landing">
        <div className="auth-lockup">
          <img src="/brand/vedank-mark.png" alt="" className="auth-lockup-tree" />
          <div className="auth-lockup-words">
            <span className="auth-lockup-name">VedAnk Academy</span>
            <span className="auth-lockup-tag">Unleashing Brainpower &amp; Creativity</span>
          </div>
        </div>

        {/* The same card the link unfurls into, so the page and the preview agree. */}
        <img className="share-landing-card" src={cardUrl(q)} alt={headline} width={1200} height={630} />

        <h1 className="share-landing-title">{headline}</h1>
        <p className="sub">
          Sutra Sprint turns Vedic maths into a game — 25 sutras as stages, a matchstick dojo,
          a daily challenge and timed Blitz runs.
        </p>
        <Link className="btn btn-primary share-landing-cta" href="/signup">
          Play it yourself →
        </Link>
        <p className="share-landing-alt">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
