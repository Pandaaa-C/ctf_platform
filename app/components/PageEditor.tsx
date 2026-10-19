"use client";
import { useState, useEffect, type FormEvent } from "react";
import { marked } from "marked";
import type { AdminPage } from "./types";

type Props = {
  ctfId: number;
  page: AdminPage | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function PageEditor({ ctfId, page, onClose, onSaved }: Props) {
  const isNew = !page;
  const [title, setTitle] = useState(page?.title || "");
  const [body, setBody] = useState(page?.body || "");
  const [view, setView] = useState<"write" | "preview">("write");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function esc(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const url = isNew ? "/api/admin/pages" : `/api/admin/pages/${page!.id}`;
    const method = isNew ? "POST" : "PUT";
    const payload = isNew ? { ctfId, title, body } : { title, body };
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

  const previewHtml = marked.parse(body || "_Nothing to preview yet._", { async: false }) as string;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <button className="x" onClick={onClose} aria-label="Close">×</button>
        <h3 style={{ marginTop: 0 }}>{isNew ? "New page" : `Edit "${page!.title}"`}</h3>
        {error && <div className="flash wrong">{error}</div>}
        <form onSubmit={save}>
          <label>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Rules" autoFocus />

          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0 6px" }}>
            <label style={{ margin: 0 }}>Content (Markdown)</label>
            <div className="seg" style={{ marginLeft: "auto", maxWidth: 220 }}>
              <button type="button" className={view === "write" ? "on" : ""} onClick={() => setView("write")}>Write</button>
              <button type="button" className={view === "preview" ? "on" : ""} onClick={() => setView("preview")}>Preview</button>
            </div>
          </div>

          {view === "write" ? (
            <textarea rows={16} className="mono" style={{ fontSize: 13 }} value={body} onChange={(e) => setBody(e.target.value)}
              placeholder={"# Rules\n\n- Be nice\n- No attacking the scoreboard\n\n## Scoring\n\nFlags look like `FLAG{...}`."} />
          ) : (
            <div className="prose preview-pane" dangerouslySetInnerHTML={{ __html: previewHtml }} />
          )}

          <div className="submit-row" style={{ marginTop: 18 }}>
            <button className="btn" disabled={busy}>{busy ? "Saving…" : isNew ? "Create page" : "Save changes"}</button>
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
