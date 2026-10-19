import { and, eq, sql } from "drizzle-orm";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { db } from "@/db/client";
import { pages } from "@/db/schema";

export function slugify(s: string): string {
  return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
}

export async function uniquePageSlug(ctfId: number, base: string, ignoreId?: number): Promise<string> {
  const root = slugify(base) || "page";
  let candidate = root;
  let n = 1;
  while (true) {
    const existing = await db
      .select({ id: pages.id })
      .from(pages)
      .where(and(eq(pages.ctfId, ctfId), eq(pages.slug, candidate)))
      .limit(1);
    if (!existing.length || existing[0].id === ignoreId) return candidate;
    n += 1;
    candidate = `${root}-${n}`;
  }
}

export async function listPages(ctfId: number) {
  return db
    .select({ id: pages.id, slug: pages.slug, title: pages.title, sortOrder: pages.sortOrder })
    .from(pages)
    .where(eq(pages.ctfId, ctfId))
    .orderBy(pages.sortOrder, pages.title);
}

export async function getPage(ctfId: number, slug: string) {
  const rows = await db
    .select()
    .from(pages)
    .where(and(eq(pages.ctfId, ctfId), eq(pages.slug, slug)))
    .limit(1);
  return rows[0] ?? null;
}

export async function nextPageOrder(ctfId: number): Promise<number> {
  const r = await db
    .select({ m: sql<number>`coalesce(max(${pages.sortOrder}), -1)` })
    .from(pages)
    .where(eq(pages.ctfId, ctfId));
  return Number(r[0].m) + 1;
}

export function renderMarkdown(body: string): string {
  const raw = marked.parse(body ?? "", { async: false }) as string;
  return sanitizeHtml(raw, {
    allowedTags: [
      "h1", "h2", "h3", "h4", "h5", "h6", "p", "a", "ul", "ol", "li", "blockquote",
      "code", "pre", "strong", "em", "del", "hr", "br", "table", "thead", "tbody",
      "tr", "th", "td", "img", "span",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title"],
      code: ["class"],
      span: ["class"],
      th: ["align"],
      td: ["align"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer" },
      }),
    },
  });
}
