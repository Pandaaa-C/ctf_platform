import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { challenges, solves } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { ensureInitialised } from "@/lib/data";
import { challengeValue } from "@/lib/scoring";

export async function POST(req: Request) {
  await ensureInitialised();
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { challengeId, flag } = await req.json().catch(() => ({}));
  const submitted = String(flag ?? "").trim();

  const chalRows = await db.select().from(challenges).where(eq(challenges.id, challengeId)).limit(1);
  const chal = chalRows[0];
  if (!chal) return Response.json({ error: "Unknown challenge." }, { status: 404 });

  const already = await db
    .select({ id: solves.id })
    .from(solves)
    .where(and(eq(solves.teamId, session.id), eq(solves.challengeId, chal.id)))
    .limit(1);
  if (already.length) {
    return Response.json({ status: "already", message: `You've already solved "${chal.title}".` });
  }

  const correct = submitted.length > 0 && submitted === chal.flag;
  if (!correct) {
    return Response.json({ status: "wrong", message: "Incorrect flag. Keep trying!" });
  }

  const priorRows = await db
    .select({ n: sql<number>`count(*)` })
    .from(solves)
    .where(eq(solves.challengeId, chal.id));
  const priorSolves = Number(priorRows[0].n);

  const awarded = challengeValue(chal, priorSolves + 1);

  try {
    await db.insert(solves).values({
      teamId: session.id,
      challengeId: chal.id,
      points: awarded,
      solvedAt: Date.now(),
    });
  } catch {
    // unique violation = concurrent duplicate; treat as already solved
    return Response.json({ status: "already", message: `You've already solved "${chal.title}".` });
  }

  return Response.json({
    status: "correct",
    message:
      chal.scoring === "dynamic"
        ? `Correct! This challenge is now worth ${awarded} points.`
        : `Correct! +${awarded} points`,
    points: awarded,
    dynamic: chal.scoring === "dynamic",
    firstBlood: priorSolves === 0,
  });
}
