import { eventMeta } from "@/lib/data";

export default async function Home() {
  const ev = await eventMeta();
  return (
    <div className="wrap">
      <div className="hero">
        <h1 className="big">
          <span className="g">{ev.name}</span>
        </h1>
        <p className="sub" style={{ maxWidth: "52ch" }}>
          {ev.tagline} Register a team, work through the challenges, and submit
          each flag you capture to climb the leaderboard.
        </p>
        <div className="cta">
          <a href="/register" className="btn">Register your team</a>
          <a href="/challenges" className="btn ghost">View challenges</a>
          <a href="/scoreboard" className="btn ghost">Scoreboard</a>
        </div>
      </div>

      <div className="stat-row" style={{ marginTop: 44 }}>
        <div className="stat">
          <div className="k">How to play</div>
          <div className="v" style={{ fontSize: 17, fontFamily: "inherit", fontWeight: 600 }}>Find a flag</div>
          <p className="sub" style={{ fontSize: 14, marginTop: 6 }}>
            Flags look like <span className="mono">FLAG{"{...}"}</span>.
          </p>
        </div>
        <div className="stat">
          <div className="k">Then</div>
          <div className="v" style={{ fontSize: 17, fontFamily: "inherit", fontWeight: 600 }}>Submit it</div>
          <p className="sub" style={{ fontSize: 14, marginTop: 6 }}>
            Open the challenge, paste the flag, score the points.
          </p>
        </div>
        <div className="stat">
          <div className="k">Goal</div>
          <div className="v" style={{ fontSize: 17, fontFamily: "inherit", fontWeight: 600 }}>Top the board</div>
          <p className="sub" style={{ fontSize: 14, marginTop: 6 }}>
            Every team competes on one live leaderboard.
          </p>
        </div>
      </div>
    </div>
  );
}
