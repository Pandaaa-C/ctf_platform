import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { ctfs, challenges, teams } from "@/db/schema";
import type { Ctf } from "@/db/schema";

export function slugify(s: string): string {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || "ctf";
  let candidate = root;
  let n = 1;
  while (true) {
    const existing = await db.select({ id: ctfs.id }).from(ctfs).where(eq(ctfs.slug, candidate)).limit(1);
    if (!existing.length) return candidate;
    n += 1;
    candidate = `${root}-${n}`;
  }
}

export async function getCtfBySlug(slug: string): Promise<Ctf | null> {
  const rows = await db.select().from(ctfs).where(eq(ctfs.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function getCtfById(id: number): Promise<Ctf | null> {
  const rows = await db.select().from(ctfs).where(eq(ctfs.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listCtfsPublic() {
  const rows = await db.select().from(ctfs).orderBy(ctfs.createdAt);
  const out = [];
  for (const c of rows) {
    const cc = (await db.select({ n: sql<number>`count(*)` }).from(challenges).where(eq(challenges.ctfId, c.id)))[0].n;
    const tc = (await db.select({ n: sql<number>`count(*)` }).from(teams).where(eq(teams.ctfId, c.id)))[0].n;
    out.push({
      slug: c.slug,
      name: c.name,
      tagline: c.tagline ?? "",
      challenges: Number(cc),
      teams: Number(tc),
    });
  }
  return out;
}
