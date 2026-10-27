import type { MetadataRoute } from "next";

/* Makes the game installable: "add to home screen" gives it its own icon and
   opens it without browser chrome, which for a game played in two-minute
   bursts on a phone is most of the difference between a site and an app.
   This is the default (Japanese). The page swaps the manifest link to
   /manifest-en.webmanifest ("VedAnk Sprint") for a player using English, so
   the home-screen name follows the language they play in (i18n.ts). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "インド式数学ゲーム",
    short_name: "インド式数学ゲーム",
    description: "インド式数学を覚えるアプリではなく、数学の「見方」を発見するゲーム。",
    lang: "ja",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FFF7E8",
    theme_color: "#FFF7E8",
    categories: ["education", "games"],
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
