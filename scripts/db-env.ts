/* Loads .env.local the way the Next CLI does, then refuses to run without a
   database.

   These suites used to call getDb() with no DATABASE_URL set, and the Neon
   driver threw from inside the first query. tsx reported that as an uncaught
   error and the process died before a single check ran -- which reads, in a
   terminal, almost exactly like a suite that passed quietly. A whole class of
   defect sat unnoticed behind it.

   Import this first in any suite that touches the database: the side effect has
   to happen before another module reads process.env. */
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

if (!process.env.DATABASE_URL) {
  console.error(
    [
      "",
      "  ✗ This suite needs a database, and DATABASE_URL is not set.",
      "",
      "    It is normally read from .env.local in the project root. Check that",
      "    the file exists and defines DATABASE_URL, or pass one for a single run:",
      "",
      "      DATABASE_URL='postgres://…' npx tsx scripts/<suite>.ts",
      "",
      "    Nothing ran, so this is not a pass.",
      "",
    ].join("\n")
  );
  process.exit(1);
}
