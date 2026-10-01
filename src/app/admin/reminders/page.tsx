import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin";
import { listReminders, recentRuns, reachCount } from "@/lib/game/reminders";
import { pushConfigured } from "@/lib/game/push";
import { RemindersAdmin } from "./RemindersAdmin";

export const metadata = { title: "Reminders · Sutra Sprint Admin" };
export const dynamic = "force-dynamic";

/* The marketing team's screen: write and schedule the daily reminder
   notifications. Admins only — anyone else sees the game. */
export default async function RemindersPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/");
  const [rows, runs, reach] = await Promise.all([listReminders(), recentRuns(), reachCount()]);
  return <RemindersAdmin rows={rows} runs={runs} reach={reach} adminEmail={admin.email} pushOn={pushConfigured()} />;
}
