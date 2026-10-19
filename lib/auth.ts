import crypto from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "ctf_session";
const ADMIN_COOKIE = "ctf_admin";
const SECRET =
  process.env.SESSION_SECRET ||
  "dev-only-insecure-secret-change-me-in-production";

type SessionPayload = { id: number; name: string };

// signed token:  base64url(payload) + "." + base64url(hmac)
function sign(payloadObj: unknown): string {
  const payload = Buffer.from(JSON.stringify(payloadObj)).toString("base64url");
  const mac = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${mac}`;
}

function verify<T = unknown>(token: string | undefined): T | null {
  if (!token || !token.includes(".")) return null;
  const [payload, mac] = token.split(".");
  const expected = crypto
    .createHmac("sha256", SECRET)
    .update(payload)
    .digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

// --- team session ----------------------------------------------------------
export async function setSession(team: { id: number; name: string }): Promise<void> {
  cookies().set(COOKIE, sign({ id: team.id, name: team.name }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSession(): Promise<void> {
  cookies().delete(COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(COOKIE)?.value;
  return verify<SessionPayload>(token);
}

// --- admin session ---------------------------------------------------------
export function adminPassword(): string {
  return process.env.ADMIN_PASSWORD || "changeme";
}

export async function setAdmin(): Promise<void> {
  cookies().set(ADMIN_COOKIE, sign({ admin: true, ts: Date.now() }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearAdmin(): Promise<void> {
  cookies().delete(ADMIN_COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  const token = cookies().get(ADMIN_COOKIE)?.value;
  const payload = verify<{ admin?: boolean }>(token);
  return !!(payload && payload.admin === true);
}

export async function requireAdmin(): Promise<Response | null> {
  if (!(await isAdmin())) {
    return Response.json({ error: "Admin only." }, { status: 401 });
  }
  return null;
}
