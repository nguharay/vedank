import { auth } from "@/auth";
import { loadProgress, touchDailyStreak } from "@/lib/game/progress";
import { GameApp } from "@/components/game/GameApp";

export default async function HomePage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const [progress, daily] = userId
    ? await Promise.all([loadProgress(userId), touchDailyStreak(userId)])
    : [
        { topics: {}, arena: { solved: {}, bestMoves: {} } },
        { dailyStreak: 0, bestDailyStreak: 0, isNewDay: false, preferredLang: "en" as const, bonusGems: 0, chestReward: null },
      ];

  return (
    <GameApp
      initialProgress={progress}
      dailyStreak={daily.dailyStreak}
      initialLang={daily.preferredLang}
      initialBonusGems={daily.bonusGems}
      dailyChestReward={daily.chestReward}
      user={{ name: session?.user?.name ?? null, email: session?.user?.email ?? null }}
    />
  );
}
