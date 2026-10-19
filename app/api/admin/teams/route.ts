import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { solves, teams } from "@/db/schema";
import { requireFullAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await requireFullAdmin();
  if ("error" in guard) return guard.error;

  const url = new URL(req.url);
  const ctfId = Number(url.searchParams.get("ctf"));
  if (!ctfId) return Response.json({ error: "A ctf id is required." }, { status: 400 });

  const rows = await db
    .select({
      id: teams.id,
      name: teams.name,
      score: sql<number>`coalesce(sum(${solves.points}), 0)`,
      solved: sql<number>`count(${solves.id})`,
    })
    .from(teams)
    .leftJoin(solves, eq(solves.teamId, teams.id))
    .where(eq(teams.ctfId, ctfId))
    .groupBy(teams.id)
    .orderBy(desc(sql`coalesce(sum(${solves.points}), 0)`), teams.name);

  return Response.json({
    teams: rows.map((r) => ({ ...r, score: Number(r.score), solved: Number(r.solved) })),
  });
}
