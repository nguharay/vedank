import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { GuestGame } from "./GuestGame";
import { ownerSheetEnabled as classesEnabled } from "@/lib/owner-notify";
import { loadOverrides } from "@/lib/game/overrides";

/* The shared link used to land on a password form: someone taps a Japanese
   preview card promising a game and is asked to make an account before
   they've seen a single question. This is the same game, playable first. */

export const metadata = {
  title: "おためしプレイ — インド式数学ゲーム",
  description: "アカウントなしで、すぐに遊べます。",
};

export default async function TryPage() {
  /* Already signed in? Then the real thing is strictly better. */
  const session = await auth();
  if (session?.user) redirect("/");
  return <GuestGame overrides={await loadOverrides()} classesEnabled={classesEnabled()} />;
}
