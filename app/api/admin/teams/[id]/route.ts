import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { solves, teams } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

// PATCH = reset this team's solves (keep the team, zero the score).
export async function PATCH(_req: Request, { params }: Ctx) {
  const deny = await requireAdmin();
  if (deny) return deny;

  const teamId = Number(params.id);
  const rows = await db.select({ name: teams.name }).from(teams).where(eq(teams.id, teamId)).limit(1);
  if (!rows.length) return Response.json({ error: "Not found." }, { status: 404 });

  await db.delete(solves).where(eq(solves.teamId, teamId));
  return Response.json({ ok: true, name: rows[0].name });
}

// DELETE = remove the team entirely (and their solves).
export async function DELETE(_req: Request, { params }: Ctx) {
  const deny = await requireAdmin();
  if (deny) return deny;

  const teamId = Number(params.id);
  const rows = await db.select({ name: teams.name }).from(teams).where(eq(teams.id, teamId)).limit(1);
  if (!rows.length) return Response.json({ error: "Not found." }, { status: 404 });

  await db.delete(solves).where(eq(solves.teamId, teamId));
  await db.delete(teams).where(eq(teams.id, teamId));
  return Response.json({ ok: true, name: rows[0].name });
}
