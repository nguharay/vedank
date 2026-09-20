import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Lazy init: DATABASE_URL isn't available at build time on first deploy,
// and `neon()` throws immediately if the env var is missing. Never wrap
// this in a Proxy — Auth.js inspects the adapter/client object shape and
// a Proxy breaks those checks silently.
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!_db) {
    const sql = neon(process.env.DATABASE_URL!);
    _db = drizzle(sql, { schema });
  }
  return _db;
}
