import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { teams } from "@/db/schema";
import { setSession } from "@/lib/auth";
import { ensureInitialised } from "@/lib/data";

export async function POST(req: Request) {
  await ensureInitialised();
  const { name, password } = await req.json().catch(() => ({}));
  const teamName = String(name ?? "").trim();
  const pw = String(password ?? "").trim();

  const rows = await db.select().from(teams).where(eq(teams.name, teamName)).limit(1);
  const team = rows[0];

  if (!team || !bcrypt.compareSync(pw, team.passHash)) {
    return Response.json({ error: "Wrong team name or password." }, { status: 401 });
  }

  await setSession({ id: team.id, name: team.name });
  return Response.json({ ok: true, name: team.name });
}
