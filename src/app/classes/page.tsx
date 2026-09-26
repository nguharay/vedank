import type { Metadata } from "next";
import { ClassesPage } from "./ClassesPage";
import { ownerSheetEnabled as classesEnabled } from "@/lib/owner-notify";

export const metadata: Metadata = {
  title: "Ray先生のインド式数学 — オンライン・対面授業",
  description: "インド式数学をRay先生と学ぼう。オンライン、または日本国内で対面の授業があります。",
};

export default function Page() {
  return <ClassesPage enabled={classesEnabled()} />;
}
