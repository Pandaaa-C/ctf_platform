import { notFound } from "next/navigation";
import { getCtfBySlug } from "@/lib/ctfs";

export const dynamic = "force-dynamic";

export default async function CtfHome({ params }: { params: { slug: string } }) {
  const ctf = await getCtfBySlug(params.slug);
  if (!ctf) notFound();
  const base = `/ctf/${ctf.slug}`;

  return (
    <div className="wrap">
      <div className="hero">
        <h1 className="big"><span className="g">{ctf.name}</span></h1>
        {ctf.tagline && <p className="sub" style={{ maxWidth: "54ch" }}>{ctf.tagline}</p>}
        <div className="cta">
          <a href={`${base}/register`} className="btn">Register your team</a>
          <a href={`${base}/challenges`} className="btn ghost">View challenges</a>
          <a href={`${base}/scoreboard`} className="btn ghost">Scoreboard</a>
        </div>
      </div>
    </div>
  );
}
