import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { pages } from "@/db/schema";
import { requireFullAdmin } from "@/lib/auth";
import { getCtfById } from "@/lib/ctfs";
import { uniquePageSlug, nextPageOrder } from "@/lib/pages";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await requireFullAdmin();
  if ("error" in guard) return guard.error;

  const url = new URL(req.url);
  const ctfId = Number(url.searchParams.get("ctf"));
  if (!ctfId) return Response.json({ error: "A ctf id is required." }, { status: 400 });

  const rows = await db
    .select()
    .from(pages)
    .where(eq(pages.ctfId, ctfId))
    .orderBy(pages.sortOrder, pages.title);

  return Response.json({ pages: rows });
}

export async function POST(req: Request) {
  const guard = await requireFullAdmin();
  if ("error" in guard) return guard.error;

  const body = await req.json().catch(() => ({}));
  const ctfId = Number(body?.ctfId);
  if (!ctfId || !(await getCtfById(ctfId))) {
    return Response.json({ error: "A valid ctfId is required." }, { status: 400 });
  }

  const title = String(body?.title ?? "").trim();
  if (!title) return Response.json({ error: "A page title is required." }, { status: 400 });

  const slug = await uniquePageSlug(ctfId, body?.slug ? String(body.slug) : title);
  const now = Date.now();
  const inserted = await db
    .insert(pages)
    .values({
      ctfId,
      slug,
      title,
      body: String(body?.body ?? ""),
      sortOrder: await nextPageOrder(ctfId),
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: pages.id, slug: pages.slug });

  return Response.json({ ok: true, id: inserted[0].id, slug: inserted[0].slug });
}
