import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { challenges, solves } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { parseChallenge } from "@/lib/validate";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export async function PUT(req: Request, { params }: Ctx) {
  const deny = await requireAdmin();
  if (deny) return deny;

  const { id } = params;
  const existing = await db.select({ id: challenges.id }).from(challenges).where(eq(challenges.id, id)).limit(1);
  if (!existing.length) return Response.json({ error: "Not found." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = parseChallenge(body, false);
  if (parsed.error || !parsed.value) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }
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
  const deny = await requireAdmin();
  if (deny) return deny;

  const { id } = params;
  await db.delete(solves).where(eq(solves.challengeId, id));
  await db.delete(challenges).where(eq(challenges.id, id));
  return Response.json({ ok: true });
}
