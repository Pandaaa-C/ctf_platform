import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { challenges, solves } from "@/db/schema";
import { requireAdmin, scopedChallengeIds } from "@/lib/auth";
import { parseChallenge } from "@/lib/validate";
import { importChallenges, wipeChallenges, type ChallengeInput } from "@/lib/challenges";
import { getCtfById } from "@/lib/ctfs";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  const admin = guard.admin;

  const url = new URL(req.url);
  const ctfId = Number(url.searchParams.get("ctf"));
  if (!ctfId) return Response.json({ error: "A ctf id is required." }, { status: 400 });

  const rows = await db
    .select()
    .from(challenges)
    .where(eq(challenges.ctfId, ctfId))
    .orderBy(challenges.category, challenges.sortOrder);

  const counts = await db
    .select({ challengeId: solves.challengeId, n: sql<number>`count(*)` })
    .from(solves)
    .groupBy(solves.challengeId);
  const countMap: Record<number, number> = {};
  for (const r of counts) countMap[r.challengeId] = Number(r.n);

  const scoped = admin.role === "full" ? null : new Set(await scopedChallengeIds(admin));

  const visible = rows
    .filter((c) => (scoped ? scoped.has(c.id) : true))
    .map((c) => ({
      ...c,
      hints: (c.hints as string[]) ?? [],
      solves: countMap[c.id] ?? 0,
      canManage: admin.role === "full" || (scoped ? scoped.has(c.id) : false),
    }));

  return Response.json({ challenges: visible, role: admin.role });
}

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  if (guard.admin.role !== "full") {
    return Response.json({ error: "Only full admins can create challenges." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));

  if (body?.action === "import" || body?.action === "wipe") {
    const ctfId = Number(body?.ctfId);
    if (!ctfId || !(await getCtfById(ctfId))) {
      return Response.json({ error: "A valid ctfId is required." }, { status: 400 });
    }
    if (body.action === "wipe") {
      await wipeChallenges(ctfId);
      return Response.json({ ok: true });
    }
    const rows = Array.isArray(body?.challenges) ? (body.challenges as ChallengeInput[]) : null;
    if (!rows) return Response.json({ error: "Expected a 'challenges' array." }, { status: 400 });
    const n = await importChallenges(ctfId, rows, !!body?.replace);
    return Response.json({ ok: true, imported: n });
  }

  const ctfId = Number(body?.ctfId);
  if (!ctfId || !(await getCtfById(ctfId))) {
    return Response.json({ error: "A valid ctfId is required." }, { status: 400 });
  }

  const parsed = parseChallenge(body, true);
  if (parsed.error || !parsed.value) return Response.json({ error: parsed.error }, { status: 400 });
  const c = parsed.value;
  const slug = c.slug as string;

  const exists = await db
    .select({ id: challenges.id })
    .from(challenges)
    .where(and(eq(challenges.ctfId, ctfId), eq(challenges.slug, slug)))
    .limit(1);
  if (exists.length) return Response.json({ error: `A challenge "${slug}" already exists in this CTF.` }, { status: 409 });

  const base = (
    await db.select({ m: sql<number>`coalesce(max(${challenges.sortOrder}), -1)` }).from(challenges).where(eq(challenges.ctfId, ctfId))
  )[0].m;

  const inserted = await db
    .insert(challenges)
    .values({
      ctfId,
      slug,
      title: c.title,
      category: c.category,
      points: c.points,
      description: c.description,
      flag: c.flag,
      hints: c.hints,
      sortOrder: Number(base) + 1,
      scoring: c.scoring,
      initial: c.initial,
      minimum: c.minimum,
      decay: c.decay,
    })
    .returning({ id: challenges.id });

  return Response.json({ ok: true, id: inserted[0].id });
}
