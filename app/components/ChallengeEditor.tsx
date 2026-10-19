"use client";
import { useState, useEffect, type FormEvent } from "react";
import type { AdminChallenge } from "./types";

type Props = {
  challenge: AdminChallenge | null; // null = new
  onClose: () => void;
  onSaved: () => void;
};

export default function ChallengeEditor({ challenge, onClose, onSaved }: Props) {
  const isNew = !challenge;
  const [form, setForm] = useState({
    id: challenge?.id || "",
    title: challenge?.title || "",
    category: challenge?.category || "",
    points: challenge?.points ?? 100,
    flag: challenge?.flag || "",
    description: challenge?.description || "",
    hints: (challenge?.hints || []).join("\n"),
    scoring: challenge?.scoring === "dynamic" ? "dynamic" : "static",
    initial: challenge?.initial ?? 500,
    minimum: challenge?.minimum ?? 100,
    decay: challenge?.decay ?? 20,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function esc(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const url = isNew ? "/api/admin/challenges" : `/api/admin/challenges/${challenge!.id}`;
    const method = isNew ? "POST" : "PUT";
    try {
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error || "Save failed."); setBusy(false); return; }
      onSaved();
    } catch {
      setError("Network error."); setBusy(false);
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="x" onClick={onClose} aria-label="Close">×</button>
        <h3 style={{ marginTop: 0 }}>{isNew ? "New challenge" : "Edit challenge"}</h3>

        {error && <div className="flash wrong">{error}</div>}

        <form onSubmit={save}>
          <label>Title</label>
          <input value={form.title} onChange={(e) => set("title", e.target.value)} autoFocus />

          <label>Scoring</label>
          <div className="seg">
            <button type="button" className={form.scoring === "static" ? "on" : ""} onClick={() => set("scoring", "static")}>
              Static — fixed points
            </button>
            <button type="button" className={form.scoring === "dynamic" ? "on" : ""} onClick={() => set("scoring", "dynamic")}>
              Dynamic — points drop as teams solve
            </button>
          </div>

          {form.scoring === "static" ? (
            <>
              <label>Points</label>
              <input type="number" min="0" value={form.points} onChange={(e) => set("points", Number(e.target.value))} />
            </>
          ) : (
            <>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label>Initial</label>
                  <input type="number" min="1" value={form.initial} onChange={(e) => set("initial", Number(e.target.value))} />
                </div>
                <div style={{ flex: 1 }}>
                  <label>Minimum</label>
                  <input type="number" min="0" value={form.minimum} onChange={(e) => set("minimum", Number(e.target.value))} />
                </div>
                <div style={{ flex: 1 }}>
                  <label>Decay</label>
                  <input type="number" min="1" value={form.decay} onChange={(e) => set("decay", Number(e.target.value))} />
                </div>
              </div>
              <p className="sub" style={{ fontSize: 12.5, margin: "4px 0 0" }}>
                Worth <b>{form.initial}</b> at first, falling to <b>{form.minimum}</b> by
                about <b>{form.decay}</b> solves. Every solver is worth the current value.
              </p>
            </>
          )}

          <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
            <div style={{ flex: 1 }}>
              <label>Category</label>
              <input value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="Web, Crypto, …" />
            </div>
            <div style={{ flex: 1 }}>
              <label>ID {isNew ? "(optional — from title)" : "(fixed)"}</label>
              <input className="mono" value={form.id} disabled={!isNew} onChange={(e) => set("id", e.target.value)} placeholder="auto" />
            </div>
          </div>

          <label>Flag</label>
          <input className="mono" value={form.flag} onChange={(e) => set("flag", e.target.value)} placeholder="FLAG{...}" />

          <label>Description</label>
          <textarea rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} />

          <label>Hints (one per line)</label>
          <textarea rows={3} value={form.hints} onChange={(e) => set("hints", e.target.value)} placeholder={"First nudge\nStronger nudge"} />

          <div className="submit-row" style={{ marginTop: 18 }}>
            <button className="btn" disabled={busy}>{busy ? "Saving…" : isNew ? "Create" : "Save changes"}</button>
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
