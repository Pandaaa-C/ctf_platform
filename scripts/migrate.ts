import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import path from "node:path";

const DATABASE_URL = process.env.DATABASE_URL || "postgres://postgres@127.0.0.1:5432/ctf";

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL });
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
