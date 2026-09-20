import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sutra Sprint",
  description:
    "A Vedic Math game: 14 sutras as stage-based lessons, an interactive matchstick puzzle dojo, and mixed question formats.",
  icons: { icon: "/brand/vedank-mark.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Nunito:wght@500;600;700;800;900&family=JetBrains+Mono:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
