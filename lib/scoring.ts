import { sql, lte } from "drizzle-orm";
import { db } from "@/db/client";
import { challenges, solves, teams } from "@/db/schema";
import type { Challenge } from "@/db/schema";

/**
 * Current value of a challenge given how many teams have solved it.
 * static  -> fixed `points`.
 * dynamic -> ((minimum-initial)/decay^2) * solves^2 + initial, clamped.
 */
export function challengeValue(
  ch: Pick<Challenge, "scoring" | "points" | "initial" | "minimum" | "decay">,
  solveCount: number
): number {
  if (ch.scoring === "dynamic") {
    const initial = num(ch.initial, ch.points ?? 500);
    const minimum = num(ch.minimum, 100);
    const decay = Math.max(1, num(ch.decay, 20));
    let v =
      ((minimum - initial) / (decay * decay)) * (solveCount * solveCount) +
      initial;
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
  value: Record<string, number>;
  solveCount: Record<string, number>;
  teams: TeamScore[];
  challenges: Challenge[];
};

/**
 * Compute all scoring in one pass. `cutoff` (epoch ms) limits which solves
 * count — used for the scoreboard freeze. Defaults to "everything" (live).
 */
export async function computeScores(
  cutoff: number = Number.MAX_SAFE_INTEGER
): Promise<ScoreData> {
  const allChallenges = await db.select().from(challenges);

  const countRows = await db
    .select({
      challengeId: solves.challengeId,
      n: sql<number>`count(*)`,
    })
    .from(solves)
    .where(lte(solves.solvedAt, cutoff))
    .groupBy(solves.challengeId);

  const solveCount: Record<string, number> = {};
  for (const r of countRows) solveCount[r.challengeId] = Number(r.n);

  const value: Record<string, number> = {};
  for (const ch of allChallenges) {
    value[ch.id] = challengeValue(ch, solveCount[ch.id] ?? 0);
  }

  const teamRows = await db
    .select({ id: teams.id, name: teams.name })
    .from(teams);

  const byTeam: Record<number, TeamScore> = {};
  for (const t of teamRows) {
    byTeam[t.id] = { id: t.id, name: t.name, score: 0, solved: 0, last: 0, line: [] };
  }

  const solveRows = await db
    .select({
      teamId: solves.teamId,
      challengeId: solves.challengeId,
      solvedAt: solves.solvedAt,
    })
    .from(solves)
    .where(lte(solves.solvedAt, cutoff))
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

  return { value, solveCount, teams: ranked, challenges: allChallenges };
}

/** First-blood (earliest solver name) per challenge, respecting cutoff. */
export async function firstBloods(
  cutoff: number = Number.MAX_SAFE_INTEGER
): Promise<Record<string, string>> {
  const rows = await db
    .select({
      challengeId: solves.challengeId,
      name: teams.name,
      solvedAt: solves.solvedAt,
    })
    .from(solves)
    .innerJoin(teams, sql`${teams.id} = ${solves.teamId}`)
    .where(lte(solves.solvedAt, cutoff))
    .orderBy(solves.solvedAt);

  const fb: Record<string, string> = {};
  for (const r of rows) {
    if (!(r.challengeId in fb)) fb[r.challengeId] = r.name; // first in time order
  }
  return fb;
}
