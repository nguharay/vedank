import type { Metadata } from "next";
import { RayLanding } from "./RayLanding";
import { ownerSheetEnabled } from "@/lib/owner-notify";

export const metadata: Metadata = {
  title: "Ray先生と学ぶインド式数学 — 授業のお問い合わせ",
  description: "インド式数学をRay先生と。日本国内の対面授業とオンライン授業。まずは無料のゲームアプリで遊んでみよう。",
  openGraph: {
    title: "Ray先生と学ぶインド式数学",
    description: "日本国内の対面授業とオンライン授業。ゲームで遊びながら数学の「見方」を身につけよう。",
    images: [{ url: "/brand/og-ja.png", width: 1200, height: 630 }],
  },
};

export default function Page() {
  return <RayLanding enabled={ownerSheetEnabled()} />;
}
