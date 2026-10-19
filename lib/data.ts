import { and, eq, sql } from "drizzle-orm";
import fs from "node:fs";
import path from "node:path";
import { db } from "@/db/client";
import { challenges, settings, solves, teams } from "@/db/schema";

const SEED_PATH = path.join(process.cwd(), "data", "challenges.json");

// ---------------------------------------------------------------------------
// Settings (key/value)
// ---------------------------------------------------------------------------
export async function getSetting(key: string, fallback = ""): Promise<string> {
  const rows = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1);
  return rows.length && rows[0].value !== null ? rows[0].value : fallback;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db
    .insert(settings)
    .values({ key, value: String(value) })
    .onConflictDoUpdate({ target: settings.key, set: { value: String(value) } });
}

export async function frozenAt(): Promise<number | null> {
  const v = await getSetting("frozen_at", "");
  return v ? Number(v) : null;
}

// ---------------------------------------------------------------------------
// Event identity: admin setting > env var > seed file > default
// ---------------------------------------------------------------------------
type EventMeta = { name: string; tagline: string };

function fileEvent(): { name?: string; tagline?: string } {
  try {
    return JSON.parse(fs.readFileSync(SEED_PATH, "utf8")).event ?? {};
  } catch {
    return {};
  }
}

export async function eventMeta(): Promise<EventMeta> {
  const je = fileEvent();
  const adminName = await getSetting("event_name", "");
  const SENTINEL = "\u0000";
  const adminTag = await getSetting("event_tagline", SENTINEL);

  const name =
    adminName || process.env.EVENT_NAME || je.name || "Capture The Flag";
  const tagline =
    adminTag !== SENTINEL
      ? adminTag
      : process.env.EVENT_TAGLINE ?? je.tagline ?? "";
  return { name, tagline };
}

// ---------------------------------------------------------------------------
// Challenge import / wipe
// ---------------------------------------------------------------------------
export type ChallengeInput = {
  id?: string;
  title?: string;
  category?: string;
  points?: number;
  description?: string;
  flag?: string;
  hints?: string[];
  scoring?: string;
  initial?: number;
  minimum?: number;
  decay?: number;
};

function slugify(s: string): string {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

function normaliseRow(c: ChallengeInput, order: number) {
  const dynamic = c.scoring === "dynamic";
  const id = (c.id ? slugify(c.id) : slugify(c.title ?? "")).slice(0, 48);
  return {
    id,
    title: c.title ?? id,
    category: c.category ?? "Misc",
    points: dynamic ? c.initial ?? c.points ?? 500 : c.points ?? 0,
    description: c.description ?? "",
    flag: c.flag ?? "",
    hints: Array.isArray(c.hints) ? c.hints : [],
    sortOrder: order,
    scoring: dynamic ? "dynamic" : "static",
    initial: dynamic ? c.initial ?? c.points ?? 500 : null,
    minimum: dynamic ? c.minimum ?? 100 : null,
    decay: dynamic ? c.decay ?? 20 : null,
  };
}

export async function importChallenges(
  rows: ChallengeInput[],
  replace = false
): Promise<number> {
  if (replace) {
    await db.delete(solves);
    await db.delete(challenges);
  }
  const base = (
    await db.select({ m: sql<number>`coalesce(max(${challenges.sortOrder}), -1)` }).from(challenges)
  )[0].m;

  let n = 0;
  let order = Number(base);
  for (const c of rows) {
    if (!c || !c.flag || !(c.title || c.id)) continue; // skip invalid
    order += 1;
    const row = normaliseRow(c, order);
    await db
      .insert(challenges)
      .values(row)
      .onConflictDoUpdate({
        target: challenges.id,
        set: {
          title: row.title,
          category: row.category,
          points: row.points,
          description: row.description,
          flag: row.flag,
          hints: row.hints,
          sortOrder: row.sortOrder,
          scoring: row.scoring,
          initial: row.initial,
          minimum: row.minimum,
          decay: row.decay,
        },
      });
    n += 1;
  }
  return n;
}

export async function reimportChallenges(): Promise<number> {
  const seed = JSON.parse(fs.readFileSync(SEED_PATH, "utf8"));
  return importChallenges(seed.challenges ?? [], false);
}

export async function wipeChallenges(): Promise<void> {
  await db.delete(solves);
  await db.delete(challenges);
}

export async function wipeTeams(): Promise<void> {
  await db.delete(solves);
  await db.delete(teams);
}

// ---------------------------------------------------------------------------
// First-boot initialisation: seed from challenges.json if empty + defaults.
// Safe to call repeatedly (guarded by a global flag + emptiness check).
// ---------------------------------------------------------------------------
type GlobalInit = typeof globalThis & { __ctf_inited?: boolean };
export async function ensureInitialised(): Promise<void> {
  const g = globalThis as GlobalInit;
  if (g.__ctf_inited) return;

  // default frozen_at setting
  const fr = await db
    .select({ k: settings.key })
    .from(settings)
    .where(eq(settings.key, "frozen_at"))
    .limit(1);
  if (fr.length === 0) await setSetting("frozen_at", "");

  // seed challenges once, only if the table is empty
  const count = (await db.select({ n: sql<number>`count(*)` }).from(challenges))[0].n;
  if (Number(count) === 0) {
    try {
      const seed = JSON.parse(fs.readFileSync(SEED_PATH, "utf8"));
      await importChallenges(seed.challenges ?? [], false);
    } catch {
      /* no seed file — start empty */
    }
  }
  g.__ctf_inited = true;
}

// re-export the drizzle instance + tables for routes/scoring that need them
export { db };
export { challenges, solves, teams, settings } from "@/db/schema";
export { and, eq, sql } from "drizzle-orm";
