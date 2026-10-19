import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { Pool } from "pg";
import { admins } from "../db/schema";

const DATABASE_URL = process.env.DATABASE_URL || "postgres://postgres@127.0.0.1:5432/ctf";
const USERNAME = process.env.ADMIN_USERNAME || "admin";
const PASSWORD = process.env.ADMIN_PASSWORD || "changeme";

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool, { schema: { admins } });

  const existing = await db.select().from(admins).where(eq(admins.username, USERNAME)).limit(1);
  if (existing.length) {
    console.log(`[seed] admin "${USERNAME}" already exists, leaving it untouched`);
  } else {
    await db.insert(admins).values({
      username: USERNAME,
      passHash: bcrypt.hashSync(PASSWORD, 10),
      role: "full",
      createdAt: Date.now(),
    });
    console.log(`[seed] created full admin "${USERNAME}"`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
