import { auth } from "@/auth";
import { loadProgress } from "@/lib/game/progress";
import { GameApp } from "@/components/game/GameApp";

export default async function HomePage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const progress = userId ? await loadProgress(userId) : { topics: {}, arena: { solved: {}, bestMoves: {} } };

  return <GameApp initialProgress={progress} />;
}
