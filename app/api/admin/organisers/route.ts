import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { admins, adminChallenges, challenges, ctfs } from "@/db/schema";
import { requireFullAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireFullAdmin();
  if ("error" in guard) return guard.error;

  const rows = await db.select().from(admins).orderBy(admins.username);
  const scopeRows = await db.select().from(adminChallenges);
  const scopeByAdmin: Record<number, number[]> = {};
  for (const s of scopeRows) (scopeByAdmin[s.adminId] ||= []).push(s.challengeId);

  const chalRows = await db
    .select({ id: challenges.id, title: challenges.title, ctfId: challenges.ctfId })
    .from(challenges);
  const ctfRows = await db.select({ id: ctfs.id, name: ctfs.name }).from(ctfs);
  const ctfName: Record<number, string> = {};
  for (const c of ctfRows) ctfName[c.id] = c.name;
  const challengeList = chalRows.map((c) => ({ id: c.id, title: c.title, ctf: ctfName[c.ctfId] ?? "" }));

  return Response.json({
    organisers: rows.map((a) => ({
      id: a.id,
      username: a.username,
      role: a.role,
      scope: scopeByAdmin[a.id] ?? [],
    })),
    challenges: challengeList,
  });
}

export async function POST(req: Request) {
  const guard = await requireFullAdmin();
  if ("error" in guard) return guard.error;

  const body = await req.json().catch(() => ({}));
  const username = String(body?.username ?? "").trim();
  const pw = String(body?.password ?? "").trim();
  const role = body?.role === "full" ? "full" : "scoped";
  const scope: number[] = Array.isArray(body?.scope) ? body.scope.map((n: unknown) => Number(n)).filter(Boolean) : [];

  if (username.length < 2) return Response.json({ error: "Username must be at least 2 characters." }, { status: 400 });
  if (pw.length < 4) return Response.json({ error: "Password must be at least 4 characters." }, { status: 400 });

  const exists = await db.select({ id: admins.id }).from(admins).where(eq(admins.username, username)).limit(1);
  if (exists.length) return Response.json({ error: "That username is taken." }, { status: 409 });

  const inserted = await db
    .insert(admins)
    .values({ username, passHash: bcrypt.hashSync(pw, 10), role, createdAt: Date.now() })
    .returning({ id: admins.id });

  if (role === "scoped" && scope.length) {
    await db.insert(adminChallenges).values(scope.map((cid) => ({ adminId: inserted[0].id, challengeId: cid })));
  }

  return Response.json({ ok: true, id: inserted[0].id });
}
