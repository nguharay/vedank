/* Guest play must produce exactly the numbers the server would, or a guest's
   stars change the moment they sign up. Both call stageOutcome — this pins it. */
import { stageOutcome } from "../src/lib/game/state";

const fails: string[] = [];
function eq(label: string, got: unknown, want: unknown) {
  if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`${label}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
}

/* stars ladder */
eq("5/5 stars", stageOutcome(5, 1, 0).stars, 3);
eq("4/5 stars", stageOutcome(4, 1, 0).stars, 2);
eq("3/5 stars", stageOutcome(3, 1, 0).stars, 1);
eq("2/5 stars", stageOutcome(2, 1, 0).stars, 0);

/* the pass line */
eq("3 passes", stageOutcome(3, 1, 0).passed, true);
eq("2 fails", stageOutcome(2, 1, 0).passed, false);

/* unlocking only moves forward */
eq("new stage unlocks", stageOutcome(5, 3, 2).justUnlocked, true);
eq("replayed stage does not", stageOutcome(5, 2, 3).justUnlocked, false);
eq("failed stage does not", stageOutcome(1, 3, 2).justUnlocked, false);

/* gems: ten a correct answer, fifty for breaking new ground */
eq("gems, new stage", stageOutcome(5, 1, 0).gemsGained, 100);
eq("gems, replay", stageOutcome(5, 1, 5).gemsGained, 50);
eq("gems, failed", stageOutcome(2, 1, 0).gemsGained, 20);

if (fails.length) {
  console.error("guest scoring FAILED:\n  " + fails.join("\n  "));
  process.exit(1);
}
console.log(`guest scoring matches the server (${12} checks)`);
