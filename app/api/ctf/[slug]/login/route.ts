import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { teams } from "@/db/schema";
import { setTeamSession } from "@/lib/auth";
import { getCtfBySlug } from "@/lib/ctfs";

type Ctx = { params: { slug: string } };

export async function POST(req: Request, { params }: Ctx) {
  const ctf = await getCtfBySlug(params.slug);
  if (!ctf) return Response.json({ error: "CTF not found." }, { status: 404 });

  const { name, password } = await req.json().catch(() => ({}));
  const teamName = String(name ?? "").trim();
  const pw = String(password ?? "").trim();

  const rows = await db
    .select()
    .from(teams)
    .where(and(eq(teams.ctfId, ctf.id), eq(teams.name, teamName)))
    .limit(1);
  const team = rows[0];

  if (!team || !bcrypt.compareSync(pw, team.passHash)) {
    return Response.json({ error: "Wrong team name or password." }, { status: 401 });
  }

  await setTeamSession({ id: team.id, name: team.name, ctfId: ctf.id });
  return Response.json({ ok: true, name: team.name });
}
