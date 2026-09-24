import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { sql as raw } from "drizzle-orm";

/* A deploy can succeed while the database is a migration behind — the build
   applies migrations/, but only when DATABASE_URL is present in the build
   environment, and a skip is silent. This says plainly whether the schema the
   running code expects is actually there.

   Deliberately says nothing about connection strings, row counts or users:
   just whether the database answers and whether the columns exist. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Columns added after the original setup-db.sql, and the feature each one
   carries. Extend this when a migration adds another. */
const EXPECTED: { table: string; column: string; feature: string }[] = [
  { table: "competitions", column: "scope", feature: "friends competitions" },
];

export async function GET() {
  try {
    const db = getDb();
    const rows = await db.execute<{ table_name: string; column_name: string }>(raw`
      select table_name, column_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name = any(${EXPECTED.map((e) => e.table)})
    `);
    const have = new Set(
      (rows.rows ?? []).map((r) => `${r.table_name}.${r.column_name}`)
    );
    const missing = EXPECTED.filter((e) => !have.has(`${e.table}.${e.column}`));

    return NextResponse.json(
      {
        db: "ok",
        migrations: missing.length ? "behind" : "ok",
        missing: missing.map((m) => ({ column: `${m.table}.${m.column}`, feature: m.feature })),
      },
      { status: missing.length ? 503 : 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { db: "error", detail: err instanceof Error ? err.message.slice(0, 200) : "unknown" },
      { status: 503 }
    );
  }
}
