import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { admins } from "@/db/schema";
import { setAdminSession } from "@/lib/auth";

export async function POST(req: Request) {
  const { username, password } = await req.json().catch(() => ({}));
  const uname = String(username ?? "").trim();
  const pw = String(password ?? "").trim();

  const rows = await db.select().from(admins).where(eq(admins.username, uname)).limit(1);
  const admin = rows[0];

  if (!admin || !bcrypt.compareSync(pw, admin.passHash)) {
    await new Promise((r) => setTimeout(r, 400));
    return Response.json({ error: "Wrong username or password." }, { status: 401 });
  }

  await setAdminSession(admin.id);
  return Response.json({ ok: true, username: admin.username, role: admin.role });
}
