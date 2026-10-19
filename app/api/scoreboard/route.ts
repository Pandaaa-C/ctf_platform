import { ensureInitialised, frozenAt } from "@/lib/data";
import { computeScores } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureInitialised();
  const freeze = await frozenAt();
  const cutoff = freeze ?? Number.MAX_SAFE_INTEGER;

  const { teams } = await computeScores(cutoff);

  const standings = teams.map((t, i) => ({
    rank: i + 1,
    name: t.name,
    score: t.score,
    solved: t.solved,
  }));

  const series = teams
    .filter((t) => t.score > 0)
    .slice(0, 10)
    .map((t) => ({ name: t.name, line: t.line }));

  return Response.json({ frozen: freeze !== null, standings, series });
}
