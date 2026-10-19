"use client";
import { useState, useEffect, type FormEvent } from "react";
import type { ChallengeView, SubmitResult } from "./types";

type Props = {
  slug: string;
  challenge: ChallengeView;
  onClose: () => void;
  onSolved: () => void;
};

export default function ChallengeModal({ slug, challenge, onClose, onSolved }: Props) {
  const [flag, setFlag] = useState("");
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [showHints, setShowHints] = useState(0);

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!flag.trim()) return;
    setBusy(true);
    setResult(null);
    try {
      const r = await fetch(`/api/ctf/${slug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: challenge.id, flag }),
      });
      const d: SubmitResult = await r.json();
      setResult(d);
      if (d.status === "correct") {
        setFlag("");
        onSolved();
      }
    } catch {
      setResult({ status: "wrong", message: "Network error. Try again." });
    } finally {
      setBusy(false);
    }
  }

  const hints = challenge.hints || [];

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="x" onClick={onClose} aria-label="Close">×</button>
        <span className="cat-pill">{challenge.category}</span>
        <h3>{challenge.title}</h3>
        <div className="pts-big">
          {challenge.value} pts · {challenge.solves} solve{challenge.solves === 1 ? "" : "s"}
          {challenge.dynamic && <span className="tag-dyn">DYNAMIC - drops toward {challenge.minimum}</span>}
        </div>

        <div className="desc">{challenge.description}</div>

        {hints.length > 0 && (
          <div style={{ margin: "14px 0" }}>
            {Array.from({ length: showHints }).map((_, i) => (
              <div className="hint" key={i}>💡 {hints[i]}</div>
            ))}
            {showHints < hints.length && (
              <button className="btn ghost" style={{ padding: "7px 13px", fontSize: 13 }} onClick={() => setShowHints((n) => n + 1)}>
                Show hint {showHints + 1} of {hints.length}
              </button>
            )}
          </div>
        )}

        {challenge.solved ? (
          <div className="flash correct">✓ Your team has solved this challenge.</div>
        ) : (
          <>
            {result && (
              <div className={`flash ${result.status}`}>
                {result.status === "correct" && result.firstBlood ? "🩸 FIRST BLOOD! " : ""}
                {result.message}
              </div>
            )}
            <form className="submit-row" onSubmit={submit}>
              <input placeholder="FLAG{...}" value={flag} onChange={(e) => setFlag(e.target.value)} autoFocus />
              <button className="btn" disabled={busy}>{busy ? "..." : "Submit"}</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
