import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import path from "node:path";

const { Pool } = pg;
const DATABASE_URL = process.env.DATABASE_URL || "postgres://postgres@127.0.0.1:5432/ctf";

async function waitForDb(pool, tries = 30) {
  for (let i = 1; i <= tries; i++) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch {
      console.log(`[migrate] waiting for Postgres (${i}/${tries})…`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw new Error("Postgres did not become ready in time.");
}

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  await waitForDb(pool);
  const db = drizzle(pool);
  const migrationsFolder = path.join(process.cwd(), "drizzle");
  console.log("[migrate] applying migrations from", migrationsFolder);
  await migrate(db, { migrationsFolder });
  console.log("[migrate] done");
  await pool.end();
}

main().catch((err) => {
  console.error("[migrate] failed:", err);
  process.exit(1);
});
