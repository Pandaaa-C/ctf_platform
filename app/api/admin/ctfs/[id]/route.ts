import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { ctfs, challenges, teams, solves } from "@/db/schema";
import { requireFullAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export async function PATCH(req: Request, { params }: Ctx) {
  const guard = await requireFullAdmin();
  if ("error" in guard) return guard.error;

  const id = Number(params.id);
  const rows = await db.select().from(ctfs).where(eq(ctfs.id, id)).limit(1);
  if (!rows.length) return Response.json({ error: "Not found." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const action = body?.action as string | undefined;

  if (action === "freeze") {
    await db.update(ctfs).set({ frozenAt: Date.now() }).where(eq(ctfs.id, id));
    return Response.json({ ok: true, frozen: true });
  }
  if (action === "unfreeze") {
    await db.update(ctfs).set({ frozenAt: null }).where(eq(ctfs.id, id));
    return Response.json({ ok: true, frozen: false });
  }

  const name = String(body?.name ?? rows[0].name).trim();
  if (!name) return Response.json({ error: "A CTF name is required." }, { status: 400 });
  await db
    .update(ctfs)
    .set({ name, tagline: String(body?.tagline ?? rows[0].tagline ?? "").trim() })
    .where(eq(ctfs.id, id));
  return Response.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const guard = await requireFullAdmin();
  if ("error" in guard) return guard.error;

  const id = Number(params.id);
  const chalIds = (await db.select({ id: challenges.id }).from(challenges).where(eq(challenges.ctfId, id))).map((c) => c.id);
  for (const cid of chalIds) await db.delete(solves).where(eq(solves.challengeId, cid));
  const teamIds = (await db.select({ id: teams.id }).from(teams).where(eq(teams.ctfId, id))).map((t) => t.id);
  for (const tid of teamIds) await db.delete(solves).where(eq(solves.teamId, tid));
  await db.delete(challenges).where(eq(challenges.ctfId, id));
  await db.delete(teams).where(eq(teams.ctfId, id));
  await db.delete(ctfs).where(eq(ctfs.id, id));
  return Response.json({ ok: true });
}
