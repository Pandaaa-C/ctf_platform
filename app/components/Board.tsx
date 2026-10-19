"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ChallengeModal from "./ChallengeModal";
import type { ChallengesResponse, ChallengeView } from "./types";

export default function Board() {
  const [data, setData] = useState<ChallengesResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "unauth">("loading");
  const [active, setActive] = useState<ChallengeView | null>(null);
  const router = useRouter();

  const load = useCallback(async () => {
    const r = await fetch("/api/challenges", { cache: "no-store" });
    if (r.status === 401) {
      setStatus("unauth");
      return;
    }
    const d: ChallengesResponse = await r.json();
    setData(d);
    setStatus("ready");
    setActive((cur) => {
      if (!cur) return cur;
      for (const list of Object.values(d.categories)) {
        const found = list.find((c) => c.id === cur.id);
        if (found) return found;
      }
      return cur;
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (status === "loading") {
    return <div className="wrap"><p className="empty">Loading challenges…</p></div>;
  }
  if (status === "unauth" || !data) {
    return (
      <div className="wrap narrow">
        <div className="panel" style={{ textAlign: "center" }}>
          <h2 style={{ marginTop: 0 }}>Log in to play</h2>
          <p className="sub" style={{ fontSize: 15 }}>Register a team or log in to see the challenges.</p>
          <div className="cta" style={{ justifyContent: "center" }}>
            <a className="btn" href="/register">Register</a>
            <a className="btn ghost" href="/login">Log in</a>
          </div>
        </div>
      </div>
    );
  }

  const cats = Object.entries(data.categories);

  return (
    <div className="wrap">
      <h1>Challenges</h1>
      <p className="sub" style={{ fontSize: 15 }}>Click a challenge to read it and submit a flag.</p>

      <div className="stat-row">
        <div className="stat"><div className="k">Your score</div><div className="v brand">{data.myScore}</div></div>
        <div className="stat"><div className="k">Solved</div><div className="v">{data.solvedCount}<span style={{ color: "var(--dim-2)", fontSize: 16 }}> / {data.totalCount}</span></div></div>
        <div className="stat"><div className="k">Points available</div><div className="v accent">{data.totalPoints}</div></div>
      </div>

      {cats.map(([cat, list]) => (
        <section key={cat}>
          <div className="cat-head">
            <span className="dot" />
            <h2>{cat}</h2>
            <span className="count">{list.filter((c) => c.solved).length} / {list.length} solved</span>
          </div>
          <div className="grid">
            {list.map((c) => (
              <button key={c.id} className={`chal ${c.solved ? "solved" : ""}`} onClick={() => setActive(c)}>
                {c.solved ? (
                  <span className="tick">✓</span>
                ) : c.firstBlood ? (
                  <span className="blood" title={`First blood: ${c.firstBlood}`}>🩸</span>
                ) : null}
                <div className="title">{c.title}</div>
                <div className="pts">{c.value}</div>
                <div className="meta">
                  {c.solves} solve{c.solves === 1 ? "" : "s"}
                  {c.dynamic && <span className="tag-dyn">DYNAMIC</span>}
                </div>
              </button>
            ))}
          </div>
        </section>
      ))}

      {active && (
        <ChallengeModal
          challenge={active}
          onClose={() => setActive(null)}
          onSolved={() => { load(); router.refresh(); }}
        />
      )}
    </div>
  );
}
