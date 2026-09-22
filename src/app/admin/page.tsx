import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin";
import { listSignups } from "@/lib/actions/admin-actions";
import { AdminTable } from "./AdminTable";

export const metadata = { title: "Signups · VedAnk Admin" };

/* Rendered per request — a cached signup register would be worse than useless. */
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await getAdminSession();
  /* Not the admin? This route simply does not exist for you. No "forbidden"
     page that confirms an admin area is here. */
  if (!admin) redirect("/");

  const result = await listSignups();
  if (!result.ok) redirect("/");

  return <AdminTable rows={result.rows} summary={result.summary} adminEmail={admin.email} />;
}
