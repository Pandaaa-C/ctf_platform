"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ChallengeEditor from "./ChallengeEditor";
import OrganiserEditor from "./OrganiserEditor";
import type { AdminChallenge, AdminTeam, AdminCtf, Organiser, OrganiserChallenge } from "./types";

type Me = { username: string; role: string } | null;

export default function Admin() {
  const [me, setMe] = useState<Me>(null);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("challenges");
  const router = useRouter();

  useEffect(() => {
    fetch("/api/admin/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { setMe(d.admin); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  if (!loaded) return <div className="wrap"><p className="empty">Loading…</p></div>;
  if (!me) {
    return (
      <div className="wrap narrow">
        <div className="panel" style={{ textAlign: "center" }}>
          <h2 style={{ marginTop: 0 }}>Organiser access required</h2>
          <p className="sub" style={{ fontSize: 15 }}>Sign in to manage events.</p>
          <a className="btn" href="/admin/login">Go to sign in</a>
        </div>
      </div>
    );
  }

  const full = me.role === "full";
  const tabs: [string, string][] = full
    ? [["ctfs", "CTFs"], ["challenges", "Challenges"], ["teams", "Teams"], ["organisers", "Organisers"]]
    : [["challenges", "My challenges"]];
  const activeTab = tabs.some(([k]) => k === tab) ? tab : tabs[0][0];

  return (
    <>
      <nav className="nav">
        <a href="/" className="brand"><span className="mark">::</span>CTF Platform</a>
        <div className="right">
          <span className="team">{me.username} · <b>{full ? "full admin" : "organiser"}</b></span>
          <button className="btn ghost" style={{ padding: "8px 14px" }} onClick={logout}>Sign out</button>
        </div>
      </nav>
      <div className="wrap">
        <h1>Admin</h1>
        <p className="sub" style={{ fontSize: 15 }}>
          {full ? "Manage events, challenges, teams and organisers." : "Manage the challenges you've been assigned."}
        </p>

        <div className="tabs">
          {tabs.map(([k, label]) => (
            <button key={k} className={`tab ${activeTab === k ? "active" : ""}`} onClick={() => setTab(k)}>{label}</button>
          ))}
        </div>

        {activeTab === "ctfs" && full && <CtfsTab />}
        {activeTab === "challenges" && <ChallengesTab full={full} />}
        {activeTab === "teams" && full && <TeamsTab />}
        {activeTab === "organisers" && full && <OrganisersTab />}
      </div>
    </>
  );
}

function CtfSelector({ value, onChange }: { value: number | null; onChange: (id: number, slug: string) => void }) {
  const [ctfs, setCtfs] = useState<AdminCtf[]>([]);
  useEffect(() => {
    fetch("/api/admin/ctfs", { cache: "no-store" }).then((r) => r.json()).then((d) => {
      const list: AdminCtf[] = d.ctfs || [];
      setCtfs(list);
      if (value === null && list.length) onChange(list[0].id, list[0].slug);
    });
  }, []);
  if (!ctfs.length) return <p className="sub" style={{ fontSize: 14 }}>No CTFs yet — create one in the CTFs tab.</p>;
  return (
    <select
      className="select"
      value={value ?? ""}
      onChange={(e) => {
        const c = ctfs.find((x) => x.id === Number(e.target.value));
        if (c) onChange(c.id, c.slug);
      }}
    >
      {ctfs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
    </select>
  );
}

function CtfsTab() {
  const [ctfs, setCtfs] = useState<AdminCtf[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");

  const load = useCallback(async () => {
    const d = await fetch("/api/admin/ctfs", { cache: "no-store" }).then((r) => r.json());
    setCtfs(d.ctfs || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function create() {
    if (!name.trim()) return;
    const d = await fetch("/api/admin/ctfs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, tagline }),
    }).then((r) => r.json());
    if (d.error) { setMsg(d.error); return; }
    setMsg(`Created "${name}".`); setName(""); setTagline(""); load();
  }
  async function freeze(c: AdminCtf) {
    await fetch(`/api/admin/ctfs/${c.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: c.frozen ? "unfreeze" : "freeze" }),
    });
    load();
  }
  async function del(c: AdminCtf) {
    if (!confirm(`Delete "${c.name}" and ALL its challenges, teams and solves? This cannot be undone.`)) return;
    await fetch(`/api/admin/ctfs/${c.id}`, { method: "DELETE" });
    setMsg(`Deleted "${c.name}".`); load();
  }

  if (!ctfs) return <p className="empty">Loading…</p>;

  return (
    <div>
      {msg && <div className="flash info">{msg}</div>}
      <div className="cat-head"><span className="dot" /><h2>Create a CTF</h2></div>
      <div className="panel">
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}><label>Name</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Autumn CTF 2026" /></div>
          <div style={{ flex: 2 }}><label>Tagline</label><input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="One line shown on the event page" /></div>
        </div>
        <div style={{ marginTop: 16 }}><button className="btn" onClick={create}>Create CTF</button></div>
      </div>

      <div className="cat-head"><span className="dot" /><h2>Events</h2></div>
      <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
        {ctfs.length === 0 ? <p className="empty">No CTFs yet.</p> : (
          <table className="board">
            <thead><tr><th>Name</th><th>URL</th><th>Challenges</th><th>Teams</th><th>Board</th><th></th></tr></thead>
            <tbody>
              {ctfs.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}<div className="mono" style={{ color: "var(--dim-2)", fontSize: 12 }}>{c.tagline}</div></td>
                  <td className="mono" style={{ fontSize: 12 }}><a href={`/ctf/${c.slug}`} target="_blank">/ctf/{c.slug}</a></td>
                  <td className="sv">{c.challenges}</td>
                  <td className="sv">{c.teams}</td>
                  <td>{c.frozen ? <span className="tag-dyn">FROZEN</span> : <span style={{ color: "var(--ok)", fontSize: 13 }}>live</span>}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button className="btn ghost" style={{ padding: "6px 11px", fontSize: 13 }} onClick={() => freeze(c)}>{c.frozen ? "Unfreeze" : "Freeze"}</button>
                    <button className="btn ghost danger" style={{ padding: "6px 11px", fontSize: 13, marginLeft: 6 }} onClick={() => del(c)}>Delete</button>
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

function ChallengesTab({ full }: { full: boolean }) {
  const [ctfId, setCtfId] = useState<number | null>(null);
  const [list, setList] = useState<AdminChallenge[] | null>(null);
  const [editing, setEditing] = useState<AdminChallenge | "new" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [json, setJson] = useState("");
  const [replace, setReplace] = useState(false);

  const load = useCallback(async (id: number | null) => {
    if (id === null) { setList([]); return; }
    const d = await fetch(`/api/admin/challenges?ctf=${id}`, { cache: "no-store" }).then((r) => r.json());
    setList(d.challenges || []);
  }, []);
  useEffect(() => { if (ctfId !== null) load(ctfId); }, [ctfId, load]);

  async function remove(c: AdminChallenge) {
    if (!confirm(`Delete "${c.title}"? This also removes its solves.`)) return;
    await fetch(`/api/admin/challenges/${c.id}`, { method: "DELETE" });
    setMsg(`Deleted "${c.title}".`); load(ctfId);
  }
  async function importJson() {
    if (ctfId === null) return;
    let parsed: unknown;
    try { parsed = JSON.parse(json); } catch { setMsg("That isn't valid JSON."); return; }
    const rows = Array.isArray(parsed) ? parsed : (parsed as { challenges?: unknown }).challenges;
    if (!Array.isArray(rows)) { setMsg("Expected a challenges array (or an object with a 'challenges' array)."); return; }
    if (replace && !confirm("Replace all challenges in this CTF? This deletes existing challenges and their solves.")) return;
    const d = await fetch("/api/admin/challenges", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "import", ctfId, challenges: rows, replace }),
    }).then((r) => r.json());
    if (d.error) { setMsg(d.error); return; }
    setMsg(`Imported ${d.imported} challenge${d.imported === 1 ? "" : "s"}.`); setJson(""); load(ctfId);
  }

  const byCat: Record<string, AdminChallenge[]> = {};
  (list || []).forEach((c) => (byCat[c.category] ||= []).push(c));

  return (
    <div>
      {msg && <div className="flash info">{msg}</div>}

      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "6px 0 14px", flexWrap: "wrap" }}>
        <span className="sub" style={{ fontSize: 14 }}>Event:</span>
        <CtfSelector value={ctfId} onChange={(id) => setCtfId(id)} />
        {full && ctfId !== null && <button className="btn" style={{ marginLeft: "auto" }} onClick={() => setEditing("new")}>+ New challenge</button>}
      </div>

      {list === null ? <p className="empty">Loading…</p> : list.length === 0 ? (
        <p className="empty">{full ? "No challenges in this event yet." : "You haven't been assigned any challenges in this event."}</p>
      ) : (
        Object.entries(byCat).map(([cat, cs]) => (
          <div key={cat}>
            <div className="cat-head"><span className="dot" /><h2>{cat}</h2></div>
            <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
              <table className="board">
                <thead><tr><th>Title</th><th>Scoring</th><th>Flag</th><th>Solves</th><th></th></tr></thead>
                <tbody>
                  {cs.map((c) => (
                    <tr key={c.id}>
                      <td>{c.title}<div className="mono" style={{ color: "var(--dim-2)", fontSize: 12 }}>{c.slug}</div></td>
                      <td className="mono" style={{ fontSize: 13 }}>{c.scoring === "dynamic" ? <>{c.initial}→{c.minimum}<span className="tag-dyn">DYN</span></> : <>{c.points}</>}</td>
                      <td className="mono" style={{ fontSize: 12, color: "var(--dim)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.flag}</td>
                      <td className="sv">{c.solves}</td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        {c.canManage ? (
                          <>
                            <button className="btn ghost" style={{ padding: "6px 11px", fontSize: 13 }} onClick={() => setEditing(c)}>Edit</button>
                            <button className="btn ghost danger" style={{ padding: "6px 11px", fontSize: 13, marginLeft: 6 }} onClick={() => remove(c)}>Delete</button>
                          </>
                        ) : <span className="sub" style={{ fontSize: 12 }}>read-only</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {full && ctfId !== null && (
        <>
          <div className="cat-head"><span className="dot" /><h2>Import challenges</h2></div>
          <div className="panel">
            <p className="sub" style={{ fontSize: 14, marginTop: 0 }}>Paste a JSON array of challenges (or an object with a <span className="mono">challenges</span> array) to bulk-add them to this event. Example packs are in <span className="mono">data/examples/</span>.</p>
            <textarea rows={7} className="mono" style={{ fontSize: 12.5 }} value={json} onChange={(e) => setJson(e.target.value)} placeholder={'[\n  { "title": "ROT13", "category": "Crypto", "points": 100, "flag": "FLAG{...}" }\n]'} />
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 12 }}>
              <label style={{ margin: 0, display: "flex", alignItems: "center", gap: 7, color: "var(--ink)", fontWeight: 500 }}>
                <input type="checkbox" style={{ width: "auto" }} checked={replace} onChange={(e) => setReplace(e.target.checked)} />
                Replace this event's challenges
              </label>
              <button className="btn" style={{ marginLeft: "auto" }} onClick={importJson}>Import</button>
            </div>
          </div>
        </>
      )}

      {editing && ctfId !== null && (
        <ChallengeEditor
          ctfId={ctfId}
          challenge={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); setMsg("Saved."); load(ctfId); }}
        />
      )}
    </div>
  );
}

function TeamsTab() {
  const [ctfId, setCtfId] = useState<number | null>(null);
  const [teams, setTeams] = useState<AdminTeam[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async (id: number | null) => {
    if (id === null) { setTeams([]); return; }
    const d = await fetch(`/api/admin/teams?ctf=${id}`, { cache: "no-store" }).then((r) => r.json());
    setTeams(d.teams || []);
  }, []);
  useEffect(() => { if (ctfId !== null) load(ctfId); }, [ctfId, load]);

  async function reset(t: AdminTeam) {
    if (!confirm(`Reset "${t.name}"? Clears all their solves.`)) return;
    await fetch(`/api/admin/teams/${t.id}`, { method: "PATCH" });
    setMsg(`Reset "${t.name}".`); load(ctfId);
  }
  async function del(t: AdminTeam) {
    if (!confirm(`Delete team "${t.name}"? This cannot be undone.`)) return;
    await fetch(`/api/admin/teams/${t.id}`, { method: "DELETE" });
    setMsg(`Deleted "${t.name}".`); load(ctfId);
  }

  return (
    <div>
      {msg && <div className="flash info">{msg}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "6px 0 14px" }}>
        <span className="sub" style={{ fontSize: 14 }}>Event:</span>
        <CtfSelector value={ctfId} onChange={(id) => setCtfId(id)} />
      </div>
      <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
        {teams === null ? <p className="empty">Loading…</p> : teams.length === 0 ? <p className="empty">No teams registered yet.</p> : (
          <table className="board">
            <thead><tr><th>Team</th><th className="sv">Solved</th><th style={{ textAlign: "right" }}>Score</th><th></th></tr></thead>
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

function OrganisersTab() {
  const [organisers, setOrganisers] = useState<Organiser[] | null>(null);
  const [challenges, setChallenges] = useState<OrganiserChallenge[]>([]);
  const [editing, setEditing] = useState<Organiser | "new" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const d = await fetch("/api/admin/organisers", { cache: "no-store" }).then((r) => r.json());
    setOrganisers(d.organisers || []);
    setChallenges(d.challenges || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function del(o: Organiser) {
    if (!confirm(`Delete organiser "${o.username}"?`)) return;
    const d = await fetch(`/api/admin/organisers/${o.id}`, { method: "DELETE" }).then((r) => r.json());
    if (d.error) { setMsg(d.error); return; }
    setMsg(`Deleted "${o.username}".`); load();
  }

  if (!organisers) return <p className="empty">Loading…</p>;

  return (
    <div>
      {msg && <div className="flash info">{msg}</div>}
      <div style={{ display: "flex", margin: "6px 0 14px" }}>
        <button className="btn" onClick={() => setEditing("new")}>+ New organiser</button>
      </div>
      <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
        <table className="board">
          <thead><tr><th>Username</th><th>Access</th><th>Scope</th><th></th></tr></thead>
          <tbody>
            {organisers.map((o) => (
              <tr key={o.id}>
                <td>{o.username}</td>
                <td>{o.role === "full" ? <b style={{ color: "var(--brand)" }}>full admin</b> : "scoped"}</td>
                <td className="sv">{o.role === "full" ? "all" : `${o.scope.length} challenge${o.scope.length === 1 ? "" : "s"}`}</td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <button className="btn ghost" style={{ padding: "6px 11px", fontSize: 13 }} onClick={() => setEditing(o)}>Edit</button>
                  <button className="btn ghost danger" style={{ padding: "6px 11px", fontSize: 13, marginLeft: 6 }} onClick={() => del(o)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <OrganiserEditor
          organiser={editing === "new" ? null : editing}
          challenges={challenges}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); setMsg("Saved."); load(); }}
        />
      )}
    </div>
  );
}
