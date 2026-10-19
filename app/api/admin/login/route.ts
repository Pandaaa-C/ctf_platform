import { setAdmin, adminPassword } from "@/lib/auth";

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({}));
  if (!password || password !== adminPassword()) {
    await new Promise((r) => setTimeout(r, 400));
    return Response.json({ error: "Wrong admin password." }, { status: 401 });
  }
  await setAdmin();
  return Response.json({ ok: true });
}
