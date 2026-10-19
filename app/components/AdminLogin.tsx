"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || "Login failed.");
        setBusy(false);
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Network error.");
      setBusy(false);
    }
  }

  return (
    <>
      <nav className="nav">
        <a href="/" className="brand"><span className="mark">::</span>CTF Platform</a>
      </nav>
      <div className="wrap narrow">
        <h1>Organiser sign in</h1>
        <p className="sub" style={{ fontSize: 15 }}>Admin and organiser accounts only.</p>
        <div className="panel" style={{ marginTop: 18 }}>
          {error && <div className="flash wrong">{error}</div>}
          <form onSubmit={submit}>
            <label htmlFor="u">Username</label>
            <input id="u" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus autoComplete="off" />
            <label htmlFor="pw">Password</label>
            <input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" />
            <button className="btn block" style={{ marginTop: 22 }} disabled={busy}>
              {busy ? "Checking..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
