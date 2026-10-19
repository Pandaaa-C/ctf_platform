import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { challenges, solves } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { ensureInitialised } from "@/lib/data";
import { computeScores, firstBloods } from "@/lib/scoring";

export const dynamic = "force-dynamic";

type ChallengeView = {
  id: string;
  title: string;
  category: string;
  value: number;
  dynamic: boolean;
  minimum: number | null;
  initial: number | null;
  description: string | null;
  hints: string[];
  solves: number;
  firstBlood: string | null;
  solved: boolean;
};

export async function GET() {
  await ensureInitialised();
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { value, solveCount } = await computeScores();
  const fb = await firstBloods();

  const mineRows = await db
    .select({ challengeId: solves.challengeId })
    .from(solves)
    .where(eq(solves.teamId, session.id));
  const mine = new Set(mineRows.map((r) => r.challengeId));

  const rows = await db.select().from(challenges).orderBy(challenges.category, challenges.sortOrder);

  const categories: Record<string, ChallengeView[]> = {};
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
