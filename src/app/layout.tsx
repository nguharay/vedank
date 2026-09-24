import type { Metadata, Viewport } from "next";
import "./globals.css";

/* The link preview is the first thing a Japanese player sees — it has to sell
   the idea before they ever reach the login screen, so the copy here is
   Japanese-first with the English line kept underneath. */
const TITLE = "インド式算数ゲーム — 考えて、ひらめいて、挑戦しよう！";
const DESCRIPTION =
  "インド式算数を覚えるアプリではなく、数学の「見方」を発見するゲーム。" +
  "古代の計算法を、14のスートラとマッチ棒パズルで。" +
  "A game that doesn't just teach Indian calculation methods — it teaches you to see mathematics differently.";

export const metadata: Metadata = {
  metadataBase: new URL("https://vedank.vercel.app"),
  title: TITLE,
  description: DESCRIPTION,
  icons: {
    icon: "/brand/vedank-mark.png",
    apple: "/brand/apple-icon.png",
  },
  appleWebApp: { capable: true, title: "Sutra Sprint", statusBarStyle: "default" },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    alternateLocale: ["en_US"],
    siteName: "Sutra Sprint",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/brand/og-ja.png", width: 1200, height: 630, alt: "インド式算数ゲーム" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/brand/og-ja.png"],
  },
};

/* Tints the phone's status bar to the game's paper in standalone mode. */
export const viewport: Viewport = {
  themeColor: "#FFF7E8",
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Nunito:wght@500;600;700;800;900&family=Caladea:wght@400;700&family=Rubik+Mono+One&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
