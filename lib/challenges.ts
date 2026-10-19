import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { challenges, solves } from "@/db/schema";

export type ChallengeInput = {
  slug?: string;
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
  return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 48);
}

function normalise(c: ChallengeInput, ctfId: number, order: number) {
  const dynamic = c.scoring === "dynamic";
  const slug = (c.slug ? slugify(c.slug) : slugify(c.id || c.title || "")).slice(0, 48);
  return {
    ctfId,
    slug,
    title: c.title ?? slug,
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

export async function importChallenges(ctfId: number, rows: ChallengeInput[], replace = false): Promise<number> {
  if (replace) {
    const ids = await db.select({ id: challenges.id }).from(challenges).where(eq(challenges.ctfId, ctfId));
    for (const { id } of ids) await db.delete(solves).where(eq(solves.challengeId, id));
    await db.delete(challenges).where(eq(challenges.ctfId, ctfId));
  }
  const base = (
    await db
      .select({ m: sql<number>`coalesce(max(${challenges.sortOrder}), -1)` })
      .from(challenges)
      .where(eq(challenges.ctfId, ctfId))
  )[0].m;

  let n = 0;
  let order = Number(base);
  for (const c of rows) {
    if (!c || !c.flag || !(c.title || c.slug || c.id)) continue;
    order += 1;
    const row = normalise(c, ctfId, order);
    const existing = await db
      .select({ id: challenges.id })
      .from(challenges)
      .where(and(eq(challenges.ctfId, ctfId), eq(challenges.slug, row.slug)))
      .limit(1);
    if (existing.length) {
      await db.update(challenges).set(row).where(eq(challenges.id, existing[0].id));
    } else {
      await db.insert(challenges).values(row);
    }
    n += 1;
  }
  return n;
}

export async function wipeChallenges(ctfId: number): Promise<void> {
  const ids = await db.select({ id: challenges.id }).from(challenges).where(eq(challenges.ctfId, ctfId));
  for (const { id } of ids) await db.delete(solves).where(eq(solves.challengeId, id));
  await db.delete(challenges).where(eq(challenges.ctfId, ctfId));
}
