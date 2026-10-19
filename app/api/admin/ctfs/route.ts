import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { ctfs, challenges, teams } from "@/db/schema";
import { requireFullAdmin } from "@/lib/auth";
import { uniqueSlug } from "@/lib/ctfs";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireFullAdmin();
  if ("error" in guard) return guard.error;

  const rows = await db.select().from(ctfs).orderBy(ctfs.createdAt);
  const out = [];
  for (const c of rows) {
    const cc = (await db.select({ n: sql<number>`count(*)` }).from(challenges).where(eq(challenges.ctfId, c.id)))[0].n;
    const tc = (await db.select({ n: sql<number>`count(*)` }).from(teams).where(eq(teams.ctfId, c.id)))[0].n;
    out.push({
      id: c.id,
      slug: c.slug,
      name: c.name,
      tagline: c.tagline ?? "",
      frozen: c.frozenAt !== null,
      challenges: Number(cc),
      teams: Number(tc),
    });
  }
  return Response.json({ ctfs: out });
}

export async function POST(req: Request) {
  const guard = await requireFullAdmin();
  if ("error" in guard) return guard.error;

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim();
  if (!name) return Response.json({ error: "A CTF name is required." }, { status: 400 });

  const slug = await uniqueSlug(body?.slug ? String(body.slug) : name);
  const inserted = await db
    .insert(ctfs)
    .values({
      slug,
      name,
      tagline: String(body?.tagline ?? "").trim(),
      frozenAt: null,
      createdAt: Date.now(),
    })
    .returning({ id: ctfs.id, slug: ctfs.slug });

  return Response.json({ ok: true, id: inserted[0].id, slug: inserted[0].slug });
}
