import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const DATABASE_URL =
  process.env.DATABASE_URL || "postgres://postgres@127.0.0.1:5432/ctf";

type GlobalWithDb = typeof globalThis & {
  __ctf_pool?: Pool;
  __ctf_db?: NodePgDatabase<typeof schema>;
};
const g = globalThis as GlobalWithDb;

export const pool: Pool = g.__ctf_pool ?? new Pool({ connectionString: DATABASE_URL });
if (!g.__ctf_pool) g.__ctf_pool = pool;

export const db: NodePgDatabase<typeof schema> =
  g.__ctf_db ?? drizzle(pool, { schema });
if (!g.__ctf_db) g.__ctf_db = db;

export { schema };
