import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { challenges, solves, teams } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import {
  eventMeta, frozenAt, setSetting, reimportChallenges,
  importChallenges, wipeChallenges, wipeTeams,
  type ChallengeInput,
} from "@/lib/data";

export const dynamic = "force-dynamic";

async function counts() {
  const t = (await db.select({ n: sql<number>`count(*)` }).from(teams))[0].n;
  const c = (await db.select({ n: sql<number>`count(*)` }).from(challenges))[0].n;
  const s = (await db.select({ n: sql<number>`count(*)` }).from(solves))[0].n;
  return { teams: Number(t), challenges: Number(c), solves: Number(s) };
}

export async function GET() {
  const deny = await requireAdmin();
  if (deny) return deny;

  const freeze = await frozenAt();
  return Response.json({
    frozen: freeze !== null,
    frozenAt: freeze,
    stats: await counts(),
    event: await eventMeta(),
  });
}

export async function POST(req: Request) {
  const deny = await requireAdmin();
  if (deny) return deny;

  const body = await req.json().catch(() => ({}));
  const action = body?.action as string;

  if (action === "freeze") {
    await setSetting("frozen_at", String(Date.now()));
    return Response.json({ ok: true, frozen: true });
  }
  if (action === "unfreeze") {
    await setSetting("frozen_at", "");
    return Response.json({ ok: true, frozen: false });
  }
  if (action === "reimport") {
    const n = await reimportChallenges();
    return Response.json({ ok: true, imported: n });
  }
  if (action === "event") {
    await setSetting("event_name", String(body?.name ?? "").trim());
    await setSetting("event_tagline", String(body?.tagline ?? "").trim());
    return Response.json({ ok: true, event: await eventMeta() });
  }
  if (action === "import") {
    let rows = body?.challenges;
    if (!Array.isArray(rows) && Array.isArray(body?.payload)) rows = body.payload;
    if (!Array.isArray(rows)) {
      return Response.json({ error: "Expected a 'challenges' array." }, { status: 400 });
    }
    if (body?.event && typeof body.event === "object") {
      if (body.event.name) await setSetting("event_name", String(body.event.name).trim());
      if (body.event.tagline !== undefined)
        await setSetting("event_tagline", String(body.event.tagline).trim());
    }
    const n = await importChallenges(rows as ChallengeInput[], !!body?.replace);
    return Response.json({ ok: true, imported: n });
  }
  if (action === "wipe_challenges") {
    await wipeChallenges();
    return Response.json({ ok: true });
  }
  if (action === "wipe_teams") {
    await wipeTeams();
    return Response.json({ ok: true });
  }
  return Response.json({ error: "Unknown action." }, { status: 400 });
}
