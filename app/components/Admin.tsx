"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ChallengeEditor from "./ChallengeEditor";
import type { AdminChallenge, AdminTeam } from "./types";

type Tab = "challenges" | "teams" | "settings";

export default function Admin() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("challenges");
  const router = useRouter();

  useEffect(() => {
    fetch("/api/admin/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setAuthed(!!d.admin))
      .catch(() => setAuthed(false));
  }, []);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  if (authed === null) return <div className="wrap"><p className="empty">Loading…</p></div>;
  if (!authed) {
    return (
      <div className="wrap narrow">
        <div className="panel" style={{ textAlign: "center" }}>
          <h2 style={{ marginTop: 0 }}>Admin access required</h2>
          <p className="sub" style={{ fontSize: 15 }}>Log in to manage the event.</p>
          <a className="btn" href="/admin/login">Go to admin login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ marginBottom: 0 }}>Admin</h1>
        <span className="cat-pill" style={{ background: "#3a1526", color: "#fda4af" }}>organiser</span>
        <button className="btn ghost" style={{ marginLeft: "auto", padding: "8px 14px" }} onClick={logout}>Exit admin</button>
      </div>
      <p className="sub" style={{ fontSize: 15 }}>Manage challenges, teams and the scoreboard.</p>

      <div className="tabs">
        {([["challenges", "Challenges"], ["teams", "Teams"], ["settings", "Settings"]] as [Tab, string][]).map(([k, label]) => (
          <button key={k} className={`tab ${tab === k ? "active" : ""}`} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      {tab === "challenges" && <ChallengesTab />}
      {tab === "teams" && <TeamsTab />}
      {tab === "settings" && <SettingsTab />}
    </div>
  );
}

/* ---------------- Challenges tab ---------------- */
function ChallengesTab() {
  const [list, setList] = useState<AdminChallenge[] | null>(null);
  const [editing, setEditing] = useState<AdminChallenge | "new" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const d = await fetch("/api/admin/challenges", { cache: "no-store" }).then((r) => r.json());
    setList(d.challenges || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function remove(c: AdminChallenge) {
    if (!confirm(`Delete "${c.title}"? This also removes all solves for it.`)) return;
    await fetch(`/api/admin/challenges/${c.id}`, { method: "DELETE" });
    setMsg(`Deleted "${c.title}".`);
    load();
  }

  if (!list) return <p className="empty">Loading challenges…</p>;

  const byCat: Record<string, AdminChallenge[]> = {};
  list.forEach((c) => (byCat[c.category] ||= []).push(c));

  return (
    <div>
      {msg && <div className="flash info">{msg}</div>}
      <div style={{ display: "flex", margin: "6px 0 16px" }}>
        <button className="btn" onClick={() => setEditing("new")}>+ New challenge</button>
      </div>

      {Object.entries(byCat).map(([cat, cs]) => (
        <div key={cat}>
          <div className="cat-head"><span className="dot" /><h2>{cat}</h2></div>
          <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
            <table className="board">
              <thead>
                <tr><th>Title</th><th>Scoring</th><th>Flag</th><th>Solves</th><th></th></tr>
              </thead>
              <tbody>
                {cs.map((c) => (
                  <tr key={c.id}>
                    <td>{c.title}<div style={{ color: "var(--dim-2)", fontSize: 12 }} className="mono">{c.id}</div></td>
                    <td className="mono" style={{ fontSize: 13 }}>
                      {c.scoring === "dynamic"
                        ? <>{c.initial}→{c.minimum}<span className="tag-dyn">DYN</span></>
                        : <>{c.points}</>}
                    </td>
                    <td className="mono" style={{ fontSize: 12, color: "var(--dim)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.flag}</td>
                    <td className="sv">{c.solves}</td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <button className="btn ghost" style={{ padding: "6px 11px", fontSize: 13 }} onClick={() => setEditing(c)}>Edit</button>
                      <button className="btn ghost danger" style={{ padding: "6px 11px", fontSize: 13, marginLeft: 6 }} onClick={() => remove(c)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {editing && (
        <ChallengeEditor
          challenge={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); setMsg("Saved."); load(); }}
        />
      )}
    </div>
  );
}

/* ---------------- Teams tab ---------------- */
function TeamsTab() {
  const [teams, setTeams] = useState<AdminTeam[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const d = await fetch("/api/admin/teams", { cache: "no-store" }).then((r) => r.json());
    setTeams(d.teams || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function reset(t: AdminTeam) {
    if (!confirm(`Reset "${t.name}"? Clears all their solves (score back to 0).`)) return;
    await fetch(`/api/admin/teams/${t.id}`, { method: "PATCH" });
    setMsg(`Reset "${t.name}".`); load();
  }
  async function del(t: AdminTeam) {
    if (!confirm(`Delete team "${t.name}" entirely? This cannot be undone.`)) return;
    await fetch(`/api/admin/teams/${t.id}`, { method: "DELETE" });
    setMsg(`Deleted "${t.name}".`); load();
  }

  if (!teams) return <p className="empty">Loading teams…</p>;

  return (
    <div>
      {msg && <div className="flash info">{msg}</div>}
      <div className="panel" style={{ padding: 0, overflow: "hidden", marginTop: 8 }}>
        {teams.length === 0 ? (
          <p className="empty">No teams registered yet.</p>
        ) : (
          <table className="board">
            <thead>
              <tr><th>Team</th><th className="sv">Solved</th><th style={{ textAlign: "right" }}>Score</th><th></th></tr>
            </thead>
            <tbody>
              {teams.map((t) => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td className="sv">{t.solved}</td>
                  <td className="sc">{t.score}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button className="btn ghost" style={{ padding: "6px 11px", fontSize: 13 }} onClick={() => reset(t)}>Reset</button>
                    <button className="btn ghost danger" style={{ padding: "6px 11px", fontSize: 13, marginLeft: 6 }} onClick={() => del(t)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ---------------- Settings tab ---------------- */
type SettingsState = {
  frozen: boolean;
  frozenAt: number | null;
  stats: { teams: number; challenges: number; solves: number };
  event: { name: string; tagline: string };
};

function SettingsTab() {
  const [state, setState] = useState<SettingsState | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [evName, setEvName] = useState("");
  const [evTag, setEvTag] = useState("");
  const [json, setJson] = useState("");
  const [replace, setReplace] = useState(false);

  const load = useCallback(async () => {
    const d: SettingsState = await fetch("/api/admin/settings", { cache: "no-store" }).then((r) => r.json());
    setState(d);
    setEvName(d.event?.name || "");
    setEvTag(d.event?.tagline || "");
  }, []);
  useEffect(() => { load(); }, [load]);

  async function post(payload: Record<string, unknown>) {
    return fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then((r) => r.json());
  }
  async function act(action: string, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    const d = await post({ action });
    if (action === "reimport") setMsg(`Re-imported ${d.imported} challenges from the bundled file.`);
    else if (action === "wipe_challenges") setMsg("All challenges deleted.");
    else if (action === "wipe_teams") setMsg("All teams deleted.");
    else setMsg(d.frozen ? "Scoreboard is now FROZEN." : "Scoreboard is now live.");
    load();
  }
  async function saveEvent() {
    await post({ action: "event", name: evName, tagline: evTag });
    setMsg("Event details saved. Reload to see the new name in the header.");
    load();
  }
  async function importJson() {
    let parsed: unknown;
    try { parsed = JSON.parse(json); }
    catch { setMsg("That isn't valid JSON — check the text and try again."); return; }
    const payload = Array.isArray(parsed)
      ? { action: "import", challenges: parsed, replace }
      : { action: "import", challenges: (parsed as { challenges?: unknown }).challenges, event: (parsed as { event?: unknown }).event, replace };
    if (replace && !confirm("Replace the entire current challenge set? This deletes all existing challenges and their solves.")) return;
    const d = await post(payload);
    if (d.error) { setMsg(d.error); return; }
    setMsg(`Imported ${d.imported} challenge${d.imported === 1 ? "" : "s"}.`);
    setJson("");
    load();
  }

  if (!state) return <p className="empty">Loading…</p>;

  return (
    <div>
      {msg && <div className="flash info">{msg}</div>}

      <div className="stat-row" style={{ marginTop: 8 }}>
        <div className="stat"><div className="k">Teams</div><div className="v">{state.stats.teams}</div></div>
        <div className="stat"><div className="k">Challenges</div><div className="v">{state.stats.challenges}</div></div>
        <div className="stat"><div className="k">Total solves</div><div className="v">{state.stats.solves}</div></div>
      </div>

      <div className="cat-head"><span className="dot" /><h2>Event details</h2></div>
      <div className="panel">
        <label>Event name</label>
        <input value={evName} onChange={(e) => setEvName(e.target.value)} placeholder="e.g. Autumn CTF 2026" />
        <label>Tagline</label>
        <input value={evTag} onChange={(e) => setEvTag(e.target.value)} placeholder="One line shown on the home page" />
        <div style={{ marginTop: 16 }}>
          <button className="btn" onClick={saveEvent}>Save event details</button>
        </div>
      </div>

      <div className="cat-head"><span className="dot" /><h2>Scoreboard freeze</h2></div>
      <div className="panel">
        <p className="sub" style={{ fontSize: 14, marginTop: 0 }}>
          Freezing hides new solves from the public scoreboard while teams keep
          playing. Unfreeze to reveal the final results.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className={`statuslamp ${state.frozen ? "on" : ""}`} />
          <b>{state.frozen ? "Frozen" : "Live"}</b>
          {state.frozen ? (
            <button className="btn" style={{ marginLeft: "auto" }} onClick={() => act("unfreeze")}>Unfreeze &amp; reveal</button>
          ) : (
            <button className="btn" style={{ marginLeft: "auto" }} onClick={() => act("freeze")}>Freeze now</button>
          )}
        </div>
      </div>

      <div className="cat-head"><span className="dot" /><h2>Import challenges</h2></div>
      <div className="panel">
        <p className="sub" style={{ fontSize: 14, marginTop: 0 }}>
          Paste a challenge pack as JSON — either a bare array of challenges, or an
          object with <span className="mono">{"{ event, challenges }"}</span>. Entries
          are matched by <span className="mono">id</span> (overwriting duplicates).
          Example packs are in <span className="mono">data/examples/</span>.
        </p>
        <textarea rows={8} className="mono" style={{ fontSize: 12.5 }} value={json}
          onChange={(e) => setJson(e.target.value)}
          placeholder={'[\n  { "id": "crypto1", "title": "ROT13", "category": "Crypto", "points": 100, "flag": "FLAG{...}" }\n]'} />
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 12 }}>
          <label style={{ margin: 0, display: "flex", alignItems: "center", gap: 7, color: "var(--ink)", fontWeight: 500 }}>
            <input type="checkbox" style={{ width: "auto" }} checked={replace} onChange={(e) => setReplace(e.target.checked)} />
            Replace existing set (wipe first)
          </label>
          <button className="btn" style={{ marginLeft: "auto" }} onClick={importJson}>Import</button>
        </div>
        <p className="sub" style={{ fontSize: 13, marginBottom: 0 }}>
          Or re-import the bundled <span className="mono">data/challenges.json</span>:{" "}
          <button className="linkbtn" onClick={() => act("reimport", "Re-import from the bundled file?")}>re-import file</button>
        </p>
      </div>

      <div className="cat-head"><span className="dot" /><h2 style={{ color: "#fda4af" }}>Danger zone</h2></div>
      <div className="panel" style={{ borderColor: "#5a2230" }}>
        <p className="sub" style={{ fontSize: 14, marginTop: 0 }}>Resetting the event for a new CTF. These cannot be undone.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn ghost danger" onClick={() => act("wipe_teams", "Delete ALL teams and their solves? This cannot be undone.")}>Delete all teams</button>
          <button className="btn ghost danger" onClick={() => act("wipe_challenges", "Delete ALL challenges and their solves? This cannot be undone.")}>Delete all challenges</button>
        </div>
      </div>
    </div>
  );
}
