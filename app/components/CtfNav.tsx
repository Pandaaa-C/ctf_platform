"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

function initials(name: string): string {
  const words = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "::";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

type PageLink = { slug: string; title: string };

export default function CtfNav({ slug, name }: { slug: string; name: string }) {
  const [team, setTeam] = useState<{ name: string } | null>(null);
  const [pages, setPages] = useState<PageLink[]>([]);
  const [loaded, setLoaded] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const base = `/ctf/${slug}`;

  async function refresh() {
    try {
      const r = await fetch(`/api/ctf/${slug}/me`, { cache: "no-store" });
      const d = await r.json();
      setTeam(d.team);
      setPages(Array.isArray(d.pages) ? d.pages : []);
    } catch {
      setTeam(null);
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    refresh();
  }, [pathname]);

  async function logout() {
    await fetch(`/api/ctf/${slug}/logout`, { method: "POST" });
    setTeam(null);
    router.push(base);
    router.refresh();
  }

  const link = (href: string, label: string) => (
    <a href={href} className={pathname === href ? "active" : ""}>{label}</a>
  );

  return (
    <nav className="nav">
      <a href={base} className="brand">
        <span className="mark">{initials(name)}</span>
        {name}
      </a>
      <div className="links">
        {link(`${base}/challenges`, "Challenges")}
        {link(`${base}/scoreboard`, "Scoreboard")}
        {pages.map((p) => link(`${base}/p/${p.slug}`, p.title))}
      </div>
      <div className="right">
        <a href="/" className="dim-link">All events</a>
        {!loaded ? null : team ? (
          <>
            <span className="team">Team&nbsp;<b>{team.name}</b></span>
            <button className="btn ghost" onClick={logout} style={{ padding: "8px 14px" }}>Log out</button>
          </>
        ) : (
          <>
            {link(`${base}/login`, "Log in")}
            <a href={`${base}/register`} className="btn" style={{ padding: "8px 16px" }}>Register</a>
          </>
        )}
      </div>
    </nav>
  );
}
