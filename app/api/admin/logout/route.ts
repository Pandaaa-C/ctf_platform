import { clearAdmin } from "@/lib/auth";

export async function POST() {
  await clearAdmin();
  return Response.json({ ok: true });
}
