"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function AuthForm({ slug, mode }: { slug: string; mode: "register" | "login" }) {
  const isRegister = mode === "register";
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const base = `/ctf/${slug}`;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const r = await fetch(`/api/ctf/${slug}/${isRegister ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || "Something went wrong.");
        setBusy(false);
        return;
      }
      router.push(`${base}/challenges`);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="wrap narrow">
      <h1>{isRegister ? "Register a team" : "Team log in"}</h1>
      <p className="sub" style={{ fontSize: 15 }}>
        {isRegister ? "Pick a team name and password for this event." : "Welcome back. Log in to keep playing."}
      </p>
      <div className="panel" style={{ marginTop: 18 }}>
        {error && <div className="flash wrong">{error}</div>}
        <form onSubmit={submit}>
          <label htmlFor="name">Team name</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" autoFocus />
          <label htmlFor="pw">Password</label>
          <input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" />
          <button className="btn block" style={{ marginTop: 22 }} disabled={busy}>
            {busy ? "Please wait..." : isRegister ? "Create team" : "Log in"}
          </button>
        </form>
      </div>
      <p className="sub" style={{ fontSize: 14, marginTop: 14 }}>
        {isRegister ? (
          <>Already have a team? <a href={`${base}/login`}>Log in</a>.</>
        ) : (
          <>No team yet? <a href={`${base}/register`}>Register</a>.</>
        )}
      </p>
    </div>
  );
}
