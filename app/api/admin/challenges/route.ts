import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { challenges, solves } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { parseChallenge } from "@/lib/validate";

export const dynamic = "force-dynamic";

// List all challenges (including flags + scoring config — admin only).
export async function GET() {
  const deny = await requireAdmin();
  if (deny) return deny;

  const rows = await db.select().from(challenges).orderBy(challenges.category, challenges.sortOrder);

  const counts = await db
    .select({ challengeId: solves.challengeId, n: sql<number>`count(*)` })
    .from(solves)
    .groupBy(solves.challengeId);
  const countMap: Record<string, number> = {};
  for (const r of counts) countMap[r.challengeId] = Number(r.n);

  return Response.json({
    challenges: rows.map((c) => ({
      ...c,
      hints: (c.hints as string[]) ?? [],
      solves: countMap[c.id] ?? 0,
    })),
  });
}

// Create a new challenge.
export async function POST(req: Request) {
  const deny = await requireAdmin();
  if (deny) return deny;

  const body = await req.json().catch(() => ({}));
  const parsed = parseChallenge(body, true);
  if (parsed.error || !parsed.value) {
    return Response.json({ error: parsed.error }, { status: parsed.status ?? 400 });
  }
  const c = parsed.value;
  const id = c.id as string;

  const exists = await db.select({ id: challenges.id }).from(challenges).where(eq(challenges.id, id)).limit(1);
  if (exists.length) {
    return Response.json({ error: `A challenge with id "${id}" already exists.` }, { status: 409 });
  }

  const base = (
    await db.select({ m: sql<number>`coalesce(max(${challenges.sortOrder}), -1)` }).from(challenges)
  )[0].m;

  await db.insert(challenges).values({
    id,
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
  });

  return Response.json({ ok: true, id });
}
