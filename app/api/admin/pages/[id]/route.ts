import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { pages } from "@/db/schema";
import { requireFullAdmin } from "@/lib/auth";
import { uniquePageSlug } from "@/lib/pages";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export async function PUT(req: Request, { params }: Ctx) {
  const guard = await requireFullAdmin();
  if ("error" in guard) return guard.error;

  const id = Number(params.id);
  const rows = await db.select().from(pages).where(eq(pages.id, id)).limit(1);
  if (!rows.length) return Response.json({ error: "Not found." }, { status: 404 });
  const existing = rows[0];

  const body = await req.json().catch(() => ({}));
  const title = String(body?.title ?? "").trim();
  if (!title) return Response.json({ error: "A page title is required." }, { status: 400 });

  const slug =
    body?.slug && String(body.slug).trim()
      ? await uniquePageSlug(existing.ctfId, String(body.slug), existing.id)
      : existing.slug;

  await db
    .update(pages)
    .set({ title, slug, body: String(body?.body ?? ""), updatedAt: Date.now() })
    .where(eq(pages.id, id));

  return Response.json({ ok: true, slug });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const guard = await requireFullAdmin();
  if ("error" in guard) return guard.error;

  await db.delete(pages).where(eq(pages.id, Number(params.id)));
  return Response.json({ ok: true });
}
