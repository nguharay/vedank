/* Schema changes applied at build time, because the database lives on Neon
   and the only place DATABASE_URL is known is the deploy environment.
 
   Each file in migrations/ is a single statement (a DO block), so there is no
   semicolon-splitting to get wrong, and each one is written to be safe to run
   again — every deploy replays all of them. */
import { neon } from "@neondatabase/serverless";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    /* First deploy of a fresh project, or a local build with no database.
       Not an error: the app itself tolerates a missing DATABASE_URL until a
       request actually needs it. */
    console.log("[migrate] no DATABASE_URL — skipping");
    return;
  }

  const dir = path.join(process.cwd(), "migrations");
  let files: string[];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  } catch {
    console.log("[migrate] no migrations/ directory — nothing to do");
    return;
  }
  if (!files.length) return console.log("[migrate] no migrations — nothing to do");

  const sql = neon(url);
  for (const f of files) {
    const body = await readFile(path.join(dir, f), "utf8");
    process.stdout.write(`[migrate] ${f} … `);
    await sql.query(body);
    console.log("ok");
  }
  console.log(`[migrate] ${files.length} migration(s) applied`);
}

/* A failed migration must fail the build. Shipping code that expects a column
   the database does not have is worse than not shipping. */
main().catch((err) => {
  console.error("[migrate] FAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
});
