import { clearTeamSession } from "@/lib/auth";
import { getCtfBySlug } from "@/lib/ctfs";

type Ctx = { params: { slug: string } };

export async function POST(_req: Request, { params }: Ctx) {
  const ctf = await getCtfBySlug(params.slug);
  if (ctf) await clearTeamSession(ctf.id);
  return Response.json({ ok: true });
}
