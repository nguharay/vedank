import { auth } from "@/auth";
import { loadProgress, touchDailyStreak } from "@/lib/game/progress";
import { GameApp } from "@/components/game/GameApp";
import { GuestGame } from "./try/GuestGame";
import { isAdminEmail } from "@/lib/admin";
import { loadOverrides } from "@/lib/game/overrides";

export default async function HomePage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;

  /* No session: play. Asking someone to make an account before they have
     seen a question is how a shared link gets closed. */
  const overrides = await loadOverrides();
  if (!userId) return <GuestGame overrides={overrides} />;
  const [progress, daily] = await Promise.all([loadProgress(userId), touchDailyStreak(userId)]);

  return (
    <GameApp
      initialProgress={progress}
      dailyStreak={daily.dailyStreak}
      initialLang={daily.preferredLang}
      initialBonusGems={daily.bonusGems}
      dailyChestReward={daily.chestReward}
      user={{ name: session?.user?.name ?? null, email: session?.user?.email ?? null }}
      isAdmin={isAdminEmail(session?.user?.email)}
      overrides={overrides}
    />
  );
}
