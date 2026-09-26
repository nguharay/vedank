import { notFound } from "next/navigation";
import { LessonsPreview } from "./LessonsPreview";

/* Local review of every lesson against the book. Never served in production. */
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <LessonsPreview />;
}
