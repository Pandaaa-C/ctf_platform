import crypto from "node:crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { admins, adminChallenges } from "@/db/schema";
import type { Admin } from "@/db/schema";

const ADMIN_COOKIE = "ctf_admin";
const SECRET =
  process.env.SESSION_SECRET ||
  "dev-only-insecure-secret-change-me-in-production";

function sign(payloadObj: unknown): string {
  const payload = Buffer.from(JSON.stringify(payloadObj)).toString("base64url");
  const mac = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${mac}`;
}

function verify<T = unknown>(token: string | undefined): T | null {
  if (!token || !token.includes(".")) return null;
  const [payload, mac] = token.split(".");
  const expected = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

export type TeamSession = { id: number; name: string; ctfId: number };

function teamCookieName(ctfId: number): string {
  return `ctf_s_${ctfId}`;
}

export async function setTeamSession(team: { id: number; name: string; ctfId: number }): Promise<void> {
  cookies().set(teamCookieName(team.ctfId), sign(team), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearTeamSession(ctfId: number): Promise<void> {
  cookies().delete(teamCookieName(ctfId));
}

export async function getTeamSession(ctfId: number): Promise<TeamSession | null> {
  const token = cookies().get(teamCookieName(ctfId))?.value;
  const s = verify<TeamSession>(token);
  if (!s || s.ctfId !== ctfId) return null;
  return s;
}

export async function setAdminSession(adminId: number): Promise<void> {
  cookies().set(ADMIN_COOKIE, sign({ adminId }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearAdminSession(): Promise<void> {
  cookies().delete(ADMIN_COOKIE);
}

export async function getCurrentAdmin(): Promise<Admin | null> {
  const token = cookies().get(ADMIN_COOKIE)?.value;
  const payload = verify<{ adminId: number }>(token);
  if (!payload) return null;
  const rows = await db.select().from(admins).where(eq(admins.id, payload.adminId)).limit(1);
  return rows[0] ?? null;
}

export type AdminGuard = { admin: Admin } | { error: Response };

export async function requireAdmin(): Promise<AdminGuard> {
  const admin = await getCurrentAdmin();
  if (!admin) return { error: Response.json({ error: "Admin only." }, { status: 401 }) };
  return { admin };
}

export async function requireFullAdmin(): Promise<AdminGuard> {
  const admin = await getCurrentAdmin();
  if (!admin) return { error: Response.json({ error: "Admin only." }, { status: 401 }) };
  if (admin.role !== "full") {
    return { error: Response.json({ error: "Full admin access required." }, { status: 403 }) };
  }
  return { admin };
}

export async function canManageChallenge(admin: Admin, challengeId: number): Promise<boolean> {
  if (admin.role === "full") return true;
  const rows = await db
    .select({ challengeId: adminChallenges.challengeId })
    .from(adminChallenges)
    .where(eq(adminChallenges.adminId, admin.id));
  return rows.some((r) => r.challengeId === challengeId);
}

export async function scopedChallengeIds(admin: Admin): Promise<number[]> {
  const rows = await db
    .select({ challengeId: adminChallenges.challengeId })
    .from(adminChallenges)
    .where(eq(adminChallenges.adminId, admin.id));
  return rows.map((r) => r.challengeId);
}
