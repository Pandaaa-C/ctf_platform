import TopBar from "./components/TopBar";
import { listCtfsPublic } from "@/lib/ctfs";

export const dynamic = "force-dynamic";

export default async function Home() {
  const ctfs = await listCtfsPublic();
  return (
    <>
      <TopBar title="CTF Platform">
        <a href="/admin" className="dim-link">Admin</a>
      </TopBar>
      <div className="wrap">
        <div className="hero">
          <h1 className="big"><span className="g">Capture The Flag</span></h1>
          <p className="sub" style={{ maxWidth: "54ch" }}>
            Pick an event below, register your team, and start solving challenges.
          </p>
        </div>

        {ctfs.length === 0 ? (
          <div className="panel" style={{ textAlign: "center", marginTop: 20 }}>
            <p className="sub" style={{ fontSize: 15, margin: 0 }}>
              No events are running yet. Organisers can create one in the{" "}
              <a href="/admin">admin panel</a>.
            </p>
          </div>
        ) : (
          <div className="grid" style={{ marginTop: 24 }}>
            {ctfs.map((c) => (
              <a key={c.slug} href={`/ctf/${c.slug}`} className="ctf-card">
                <div className="ctf-name">{c.name}</div>
                {c.tagline && <div className="ctf-tag">{c.tagline}</div>}
                <div className="ctf-meta">
                  {c.challenges} challenge{c.challenges === 1 ? "" : "s"} · {c.teams} team{c.teams === 1 ? "" : "s"}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
