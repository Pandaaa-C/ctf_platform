import bcrypt from "bcryptjs";
import pg from "pg";

const { Pool } = pg;
const DATABASE_URL = process.env.DATABASE_URL || "postgres://postgres@127.0.0.1:5432/ctf";
const USERNAME = process.env.ADMIN_USERNAME || "admin";
const PASSWORD = process.env.ADMIN_PASSWORD || "changeme";

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const existing = await pool.query("SELECT id FROM admins WHERE username = $1", [USERNAME]);
  if (existing.rowCount > 0) {
    console.log(`[seed] admin "${USERNAME}" already exists, leaving it untouched`);
  } else {
    const hash = bcrypt.hashSync(PASSWORD, 10);
    await pool.query(
      "INSERT INTO admins (username, pass_hash, role, created_at) VALUES ($1, $2, 'full', $3)",
      [USERNAME, hash, Date.now()]
    );
    console.log(`[seed] created full admin "${USERNAME}"`);
  }
  await pool.end();
}

main().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
