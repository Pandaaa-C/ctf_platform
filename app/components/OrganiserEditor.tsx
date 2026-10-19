"use client";
import { useState, useEffect, type FormEvent } from "react";
import type { Organiser, OrganiserChallenge } from "./types";

type Props = {
  organiser: Organiser | null;
  challenges: OrganiserChallenge[];
  onClose: () => void;
  onSaved: () => void;
};

export default function OrganiserEditor({ organiser, challenges, onClose, onSaved }: Props) {
  const isNew = !organiser;
  const [username, setUsername] = useState(organiser?.username || "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(organiser?.role === "full" ? "full" : "scoped");
  const [scope, setScope] = useState<Set<number>>(new Set(organiser?.scope || []));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function esc(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  function toggle(id: number) {
    setScope((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const url = isNew ? "/api/admin/organisers" : `/api/admin/organisers/${organiser!.id}`;
    const method = isNew ? "POST" : "PATCH";
    const payload: Record<string, unknown> = { role, scope: Array.from(scope) };
    if (isNew) payload.username = username;
    if (password.trim()) payload.password = password.trim();
    try {
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error || "Save failed."); setBusy(false); return; }
      onSaved();
    } catch {
      setError("Network error."); setBusy(false);
    }
  }

  const byCtf: Record<string, OrganiserChallenge[]> = {};
  challenges.forEach((c) => (byCtf[c.ctf || "-"] ||= []).push(c));

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="x" onClick={onClose} aria-label="Close">×</button>
        <h3 style={{ marginTop: 0 }}>{isNew ? "New organiser" : `Edit ${organiser!.username}`}</h3>
        {error && <div className="flash wrong">{error}</div>}
        <form onSubmit={save}>
          <label>Username</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} disabled={!isNew} autoFocus={isNew} />

          <label>Password {isNew ? "" : "(leave blank to keep current)"}</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />

          <label>Access level</label>
          <div className="seg">
            <button type="button" className={role === "full" ? "on" : ""} onClick={() => setRole("full")}>Full - everything</button>
            <button type="button" className={role === "scoped" ? "on" : ""} onClick={() => setRole("scoped")}>Scoped - only chosen challenges</button>
          </div>

          {role === "scoped" && (
            <>
              <label>Challenges this organiser can manage</label>
              {challenges.length === 0 ? (
                <p className="sub" style={{ fontSize: 13 }}>No challenges exist yet. Create some first, then assign them.</p>
              ) : (
                <div className="scope-box">
                  {Object.entries(byCtf).map(([ctf, list]) => (
                    <div key={ctf} style={{ marginBottom: 10 }}>
                      <div className="scope-ctf">{ctf}</div>
                      {list.map((c) => (
                        <label key={c.id} className="scope-item">
                          <input type="checkbox" checked={scope.has(c.id)} onChange={() => toggle(c.id)} />
                          {c.title}
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="submit-row" style={{ marginTop: 18 }}>
            <button className="btn" disabled={busy}>{busy ? "Saving..." : isNew ? "Create organiser" : "Save changes"}</button>
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
