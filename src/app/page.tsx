import { auth } from "@/auth";
import { loadProgress, touchDailyStreak } from "@/lib/game/progress";
import { GameApp } from "@/components/game/GameApp";

export default async function HomePage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const [progress, daily] = userId
    ? await Promise.all([loadProgress(userId), touchDailyStreak(userId)])
    : [{ topics: {}, arena: { solved: {}, bestMoves: {} } }, { dailyStreak: 0, bestDailyStreak: 0, isNewDay: false }];

  return (
    <GameApp
      initialProgress={progress}
      dailyStreak={daily.dailyStreak}
      user={{ name: session?.user?.name ?? null, email: session?.user?.email ?? null }}
    />
  );
}
