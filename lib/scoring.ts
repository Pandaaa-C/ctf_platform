import { and, eq, lte, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { challenges, solves, teams } from "@/db/schema";
import type { Challenge } from "@/db/schema";

export function challengeValue(
  ch: Pick<Challenge, "scoring" | "points" | "initial" | "minimum" | "decay">,
  solveCount: number
): number {
  if (ch.scoring === "dynamic") {
    const initial = num(ch.initial, ch.points ?? 500);
    const minimum = num(ch.minimum, 100);
    const decay = Math.max(1, num(ch.decay, 20));
    let v = ((minimum - initial) / (decay * decay)) * (solveCount * solveCount) + initial;
    v = Math.round(v);
    if (v < minimum) v = minimum;
    if (v > initial) v = initial;
    return v;
  }
  return num(ch.points, 0);
}

function num(x: number | null | undefined, fallback: number): number {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

export type TeamScore = {
  id: number;
  name: string;
  score: number;
  solved: number;
  last: number;
  line: { t: number; score: number }[];
};

export type ScoreData = {
  value: Record<number, number>;
  solveCount: Record<number, number>;
  teams: TeamScore[];
  challenges: Challenge[];
};

export async function computeScores(ctfId: number, cutoff: number = Number.MAX_SAFE_INTEGER): Promise<ScoreData> {
  const chals = await db.select().from(challenges).where(eq(challenges.ctfId, ctfId));
  const chalIds = chals.map((c) => c.id);

  const value: Record<number, number> = {};
  const solveCount: Record<number, number> = {};
  const teamRows = await db.select({ id: teams.id, name: teams.name }).from(teams).where(eq(teams.ctfId, ctfId));
  const byTeam: Record<number, TeamScore> = {};
  for (const t of teamRows) byTeam[t.id] = { id: t.id, name: t.name, score: 0, solved: 0, last: 0, line: [] };

  if (chalIds.length === 0) {
    return { value, solveCount, teams: Object.values(byTeam), challenges: chals };
  }

  const countRows = await db
    .select({ challengeId: solves.challengeId, n: sql<number>`count(*)` })
    .from(solves)
    .where(and(inArray(solves.challengeId, chalIds), lte(solves.solvedAt, cutoff)))
    .groupBy(solves.challengeId);
  for (const r of countRows) solveCount[r.challengeId] = Number(r.n);

  for (const ch of chals) value[ch.id] = challengeValue(ch, solveCount[ch.id] ?? 0);

  const solveRows = await db
    .select({ teamId: solves.teamId, challengeId: solves.challengeId, solvedAt: solves.solvedAt })
    .from(solves)
    .where(and(inArray(solves.challengeId, chalIds), lte(solves.solvedAt, cutoff)))
    .orderBy(solves.solvedAt);

  for (const s of solveRows) {
    const t = byTeam[s.teamId];
    if (!t) continue;
    t.score += value[s.challengeId] ?? 0;
    t.solved += 1;
    t.last = s.solvedAt;
    t.line.push({ t: s.solvedAt, score: t.score });
  }

  const ranked = Object.values(byTeam).sort(
    (a, b) => b.score - a.score || (a.last || Infinity) - (b.last || Infinity)
  );
  return { value, solveCount, teams: ranked, challenges: chals };
}

export async function firstBloods(ctfId: number, cutoff: number = Number.MAX_SAFE_INTEGER): Promise<Record<number, string>> {
  const chalIds = (await db.select({ id: challenges.id }).from(challenges).where(eq(challenges.ctfId, ctfId))).map((c) => c.id);
  const fb: Record<number, string> = {};
  if (chalIds.length === 0) return fb;
  const rows = await db
    .select({ challengeId: solves.challengeId, name: teams.name, solvedAt: solves.solvedAt })
    .from(solves)
    .innerJoin(teams, sql`${teams.id} = ${solves.teamId}`)
    .where(and(inArray(solves.challengeId, chalIds), lte(solves.solvedAt, cutoff)))
    .orderBy(solves.solvedAt);
  for (const r of rows) if (!(r.challengeId in fb)) fb[r.challengeId] = r.name;
  return fb;
}
