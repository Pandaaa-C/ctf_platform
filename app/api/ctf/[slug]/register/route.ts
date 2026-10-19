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

  if (teamName.length < 2 || teamName.length > 40) {
    return Response.json({ error: "Team name must be 2–40 characters." }, { status: 400 });
  }
  if (pw.length < 4) {
    return Response.json({ error: "Password must be at least 4 characters." }, { status: 400 });
  }

  const exists = await db
    .select({ id: teams.id })
    .from(teams)
    .where(and(eq(teams.ctfId, ctf.id), eq(teams.name, teamName)))
    .limit(1);
  if (exists.length) {
    return Response.json({ error: "That team name is already taken for this CTF." }, { status: 409 });
  }

  const passHash = bcrypt.hashSync(pw, 10);
  const inserted = await db
    .insert(teams)
    .values({ ctfId: ctf.id, name: teamName, passHash, createdAt: Date.now() })
    .returning({ id: teams.id, name: teams.name });

  await setTeamSession({ id: inserted[0].id, name: inserted[0].name, ctfId: ctf.id });
  return Response.json({ ok: true, name: teamName });
}
