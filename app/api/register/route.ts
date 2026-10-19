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

  if (teamName.length < 2 || teamName.length > 40) {
    return Response.json({ error: "Team name must be 2–40 characters." }, { status: 400 });
  }
  if (pw.length < 4) {
    return Response.json({ error: "Password must be at least 4 characters." }, { status: 400 });
  }

  const exists = await db.select({ id: teams.id }).from(teams).where(eq(teams.name, teamName)).limit(1);
  if (exists.length) {
    return Response.json({ error: "That team name is already taken." }, { status: 409 });
  }

  const passHash = bcrypt.hashSync(pw, 10);
  const inserted = await db
    .insert(teams)
    .values({ name: teamName, passHash, createdAt: Date.now() })
    .returning({ id: teams.id, name: teams.name });

  await setSession(inserted[0]);
  return Response.json({ ok: true, name: teamName });
}
