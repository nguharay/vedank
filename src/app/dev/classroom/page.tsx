import { notFound } from "next/navigation";
import { ClassroomPreview } from "./ClassroomPreview";

/* Local review of the teacher's Classroom board against an in-memory class
   (localhost has no database). Never served in production. */
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <ClassroomPreview />;
}
