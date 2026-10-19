import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { challenges, solves } from "@/db/schema";
import { getTeamSession } from "@/lib/auth";
import { getCtfBySlug } from "@/lib/ctfs";
import { computeScores, firstBloods } from "@/lib/scoring";

export const dynamic = "force-dynamic";

type Ctx = { params: { slug: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const ctf = await getCtfBySlug(params.slug);
  if (!ctf) return Response.json({ error: "CTF not found." }, { status: 404 });

  const session = await getTeamSession(ctf.id);
  if (!session) return Response.json({ error: "Not authenticated." }, { status: 401 });

  const { value, solveCount } = await computeScores(ctf.id);
  const fb = await firstBloods(ctf.id);

  const rows = await db
    .select()
    .from(challenges)
    .where(eq(challenges.ctfId, ctf.id))
    .orderBy(challenges.category, challenges.sortOrder);

  const myTeamSolves = await db
    .select({ challengeId: solves.challengeId })
    .from(solves)
    .where(eq(solves.teamId, session.id));
  const mine = new Set(myTeamSolves.map((r) => r.challengeId));

  const categories: Record<string, unknown[]> = {};
  let totalCurrent = 0;
  let myScore = 0;

  for (const c of rows) {
    const val = value[c.id] ?? c.points;
    totalCurrent += val;
    if (mine.has(c.id)) myScore += val;
    (categories[c.category] ||= []).push({
      id: c.id,
      title: c.title,
      category: c.category,
      value: val,
      dynamic: c.scoring === "dynamic",
      minimum: c.scoring === "dynamic" ? c.minimum : null,
      initial: c.scoring === "dynamic" ? c.initial : null,
      description: c.description,
      hints: (c.hints as string[]) ?? [],
      solves: solveCount[c.id] ?? 0,
      firstBlood: fb[c.id] ?? null,
      solved: mine.has(c.id),
    });
  }

  return Response.json({
    team: session.name,
    categories,
    totalPoints: totalCurrent,
    myScore,
    solvedCount: mine.size,
    totalCount: rows.length,
  });
}
