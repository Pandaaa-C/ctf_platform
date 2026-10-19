"use client";
import { useEffect, useState } from "react";
import ScoreGraph from "./ScoreGraph";
import type { ScoreboardResponse } from "./types";

export default function Scoreboard({ slug }: { slug: string }) {
  const [data, setData] = useState<ScoreboardResponse | null>(null);
  const [me, setMe] = useState<string | null>(null);

  async function load() {
    const [sb, meR] = await Promise.all([
      fetch(`/api/ctf/${slug}/scoreboard`, { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/ctf/${slug}/me`, { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
    ]);
    setData(sb);
    setMe(meR?.team?.name || null);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [slug]);

  if (!data) return <div className="wrap"><p className="empty">Loading scoreboard…</p></div>;

  const hasTeams = data.standings.length > 0;

  return (
    <div className="wrap">
      <h1>Scoreboard</h1>
      <p className="sub" style={{ fontSize: 15 }}>
        {data.frozen ? "Standings are frozen." : "Live standings — refreshes automatically."}
      </p>

      {data.frozen && (
        <div className="freeze-banner">
          ❄️ The scoreboard is frozen — new solves won&apos;t show here until the organisers reveal the results.
        </div>
      )}

      {data.series.length > 0 && (
        <div className="panel" style={{ marginTop: 18 }}>
          <ScoreGraph series={data.series} />
        </div>
      )}

      <div className="panel board" style={{ marginTop: 18, padding: 0, overflow: "hidden" }}>
        {hasTeams ? (
          <table>
            <thead>
              <tr><th>#</th><th>Team</th><th className="sv">Solved</th><th style={{ textAlign: "right" }}>Score</th></tr>
            </thead>
            <tbody>
              {data.standings.map((t) => (
                <tr key={t.rank} className={t.name === me ? "me" : ""}>
                  <td className={`rank r${t.rank <= 3 ? t.rank : ""}`}>{t.rank}</td>
                  <td>{t.name}{t.name === me ? " (you)" : ""}</td>
                  <td className="sv">{t.solved}</td>
                  <td className="sc">{t.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty">No teams have registered yet.</p>
        )}
      </div>
    </div>
  );
}
