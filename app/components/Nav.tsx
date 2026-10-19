"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

function initials(name: string): string {
  const words = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "::";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

type Team = { name: string } | null;

export default function Nav({ eventName }: { eventName: string }) {
  const [team, setTeam] = useState<Team>(null);
  const [loaded, setLoaded] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  async function refresh() {
    try {
      const r = await fetch("/api/me", { cache: "no-store" });
      const d = await r.json();
      setTeam(d.team);
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
    await fetch("/api/logout", { method: "POST" });
    setTeam(null);
    router.push("/");
    router.refresh();
  }

  const link = (href: string, label: string) => (
    <a href={href} className={pathname === href ? "active" : ""}>
      {label}
    </a>
  );

  return (
    <nav className="nav">
      <a href="/" className="brand">
        <span className="mark">{initials(eventName)}</span>
        {eventName}
      </a>
      <div className="links">
        {link("/challenges", "Challenges")}
        {link("/scoreboard", "Scoreboard")}
      </div>
      <div className="right">
        {!loaded ? null : team ? (
          <>
            <span className="team">
              Team&nbsp;<b>{team.name}</b>
            </span>
            <button className="btn ghost" onClick={logout} style={{ padding: "8px 14px" }}>
              Log out
            </button>
          </>
        ) : (
          <>
            {link("/login", "Log in")}
            <a href="/register" className="btn" style={{ padding: "8px 16px" }}>
              Register
            </a>
          </>
        )}
      </div>
    </nav>
  );
}
