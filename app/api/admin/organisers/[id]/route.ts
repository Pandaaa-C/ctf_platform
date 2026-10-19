import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { admins, adminChallenges } from "@/db/schema";
import { requireFullAdmin, getCurrentAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export async function PATCH(req: Request, { params }: Ctx) {
  const guard = await requireFullAdmin();
  if ("error" in guard) return guard.error;

  const id = Number(params.id);
  const rows = await db.select().from(admins).where(eq(admins.id, id)).limit(1);
  if (!rows.length) return Response.json({ error: "Not found." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const update: Partial<{ role: string; passHash: string }> = {};

  if (body?.role === "full" || body?.role === "scoped") update.role = body.role;
  if (typeof body?.password === "string" && body.password.trim().length >= 4) {
    update.passHash = bcrypt.hashSync(body.password.trim(), 10);
  }
  if (Object.keys(update).length) await db.update(admins).set(update).where(eq(admins.id, id));

  if (Array.isArray(body?.scope)) {
    const scope: number[] = body.scope.map((n: unknown) => Number(n)).filter(Boolean);
    await db.delete(adminChallenges).where(eq(adminChallenges.adminId, id));
    const finalRole = update.role ?? rows[0].role;
    if (finalRole === "scoped" && scope.length) {
      await db.insert(adminChallenges).values(scope.map((cid) => ({ adminId: id, challengeId: cid })));
    }
  }

  return Response.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const guard = await requireFullAdmin();
  if ("error" in guard) return guard.error;

  const id = Number(params.id);
  const me = await getCurrentAdmin();
  if (me && me.id === id) {
    return Response.json({ error: "You can't delete your own account." }, { status: 400 });
  }

  const rows = await db.select({ username: admins.username }).from(admins).where(eq(admins.id, id)).limit(1);
  if (!rows.length) return Response.json({ error: "Not found." }, { status: 404 });

  await db.delete(adminChallenges).where(eq(adminChallenges.adminId, id));
  await db.delete(admins).where(eq(admins.id, id));
  return Response.json({ ok: true, username: rows[0].username });
}
