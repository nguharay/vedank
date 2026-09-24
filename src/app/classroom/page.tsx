import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { myClassrooms } from "@/lib/game/classroom";
import { ClassroomBoard } from "./ClassroomBoard";

export const metadata = { title: "Classroom · Sutra Sprint" };
export const dynamic = "force-dynamic";

export default async function ClassroomPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  /* Any signed-in account can teach — a class is created, not granted, and the
     ownership check on every read is what actually protects the data. */
  if (!userId) redirect("/login?from=%2Fclassroom");

  const classes = await myClassrooms(userId);
  return (
    <ClassroomBoard
      initialClasses={classes}
      teacherName={session?.user?.name ?? null}
    />
  );
}
