import { getCtfBySlug } from "@/lib/ctfs";
import { computeScores } from "@/lib/scoring";

export const dynamic = "force-dynamic";

type Ctx = { params: { slug: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const ctf = await getCtfBySlug(params.slug);
  if (!ctf) return Response.json({ error: "CTF not found." }, { status: 404 });

  const cutoff = ctf.frozenAt ?? Number.MAX_SAFE_INTEGER;
  const { teams } = await computeScores(ctf.id, cutoff);

  const standings = teams.map((t, i) => ({ rank: i + 1, name: t.name, score: t.score, solved: t.solved }));
  const series = teams.filter((t) => t.score > 0).slice(0, 10).map((t) => ({ name: t.name, line: t.line }));

  return Response.json({ frozen: ctf.frozenAt !== null, standings, series });
}
