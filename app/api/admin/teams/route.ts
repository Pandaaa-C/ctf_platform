import { desc, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { solves, teams } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const deny = await requireAdmin();
  if (deny) return deny;

  const rows = await db
    .select({
      id: teams.id,
      name: teams.name,
      createdAt: teams.createdAt,
      score: sql<number>`coalesce(sum(${solves.points}), 0)`,
      solved: sql<number>`count(${solves.id})`,
    })
    .from(teams)
    .leftJoin(solves, sql`${solves.teamId} = ${teams.id}`)
    .groupBy(teams.id)
    .orderBy(desc(sql`coalesce(sum(${solves.points}), 0)`), teams.name);

  return Response.json({
    teams: rows.map((r) => ({ ...r, score: Number(r.score), solved: Number(r.solved) })),
  });
}
