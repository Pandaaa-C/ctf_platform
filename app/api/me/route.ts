import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getSession();
  return Response.json({ team: s ? { name: s.name } : null });
}
