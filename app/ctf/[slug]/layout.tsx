import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import CtfNav from "@/app/components/CtfNav";
import { getCtfBySlug } from "@/lib/ctfs";

export const dynamic = "force-dynamic";

export default async function CtfLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { slug: string };
}) {
  const ctf = await getCtfBySlug(params.slug);
  if (!ctf) notFound();

  return (
    <>
      <CtfNav slug={ctf.slug} name={ctf.name} />
      {children}
      <div className="foot">{ctf.name} · scoreboard &amp; flag submission</div>
    </>
  );
}
