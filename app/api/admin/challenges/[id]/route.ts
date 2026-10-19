import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { challenges, solves, adminChallenges } from "@/db/schema";
import { requireAdmin, canManageChallenge } from "@/lib/auth";
import { parseChallenge } from "@/lib/validate";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export async function PUT(req: Request, { params }: Ctx) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const id = Number(params.id);
  const existing = await db.select().from(challenges).where(eq(challenges.id, id)).limit(1);
  if (!existing.length) return Response.json({ error: "Not found." }, { status: 404 });

  if (!(await canManageChallenge(guard.admin, id))) {
    return Response.json({ error: "You don't have access to this challenge." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = parseChallenge(body, false);
  if (parsed.error || !parsed.value) return Response.json({ error: parsed.error }, { status: 400 });
  const c = parsed.value;

  await db
    .update(challenges)
    .set({
      title: c.title,
      category: c.category,
      points: c.points,
      description: c.description,
      flag: c.flag,
      hints: c.hints,
      scoring: c.scoring,
      initial: c.initial,
      minimum: c.minimum,
      decay: c.decay,
    })
    .where(eq(challenges.id, id));

  return Response.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const id = Number(params.id);
  if (!(await canManageChallenge(guard.admin, id))) {
    return Response.json({ error: "You don't have access to this challenge." }, { status: 403 });
  }

  await db.delete(solves).where(eq(solves.challengeId, id));
  await db.delete(adminChallenges).where(eq(adminChallenges.challengeId, id));
  await db.delete(challenges).where(eq(challenges.id, id));
  return Response.json({ ok: true });
}
