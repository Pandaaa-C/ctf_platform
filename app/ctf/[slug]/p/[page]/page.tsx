import { notFound } from "next/navigation";
import { getCtfBySlug } from "@/lib/ctfs";
import { getPage, renderMarkdown } from "@/lib/pages";

export const dynamic = "force-dynamic";

type Ctx = { params: { slug: string; page: string } };

export default async function ContentPage({ params }: Ctx) {
  const ctf = await getCtfBySlug(params.slug);
  if (!ctf) notFound();
  const page = await getPage(ctf.id, params.page);
  if (!page) notFound();

  const html = renderMarkdown(page.body);

  return (
    <div className="wrap">
      <h1>{page.title}</h1>
      <article className="prose" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
