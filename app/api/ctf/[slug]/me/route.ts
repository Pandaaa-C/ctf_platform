import { getTeamSession } from "@/lib/auth";
import { getCtfBySlug } from "@/lib/ctfs";

export const dynamic = "force-dynamic";

type Ctx = { params: { slug: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const ctf = await getCtfBySlug(params.slug);
  if (!ctf) return Response.json({ team: null, ctf: null });
  const s = await getTeamSession(ctf.id);
  return Response.json({
    team: s ? { name: s.name } : null,
    ctf: { slug: ctf.slug, name: ctf.name, tagline: ctf.tagline ?? "" },
  });
}
