"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const body = await response.json();
      setError(body.error || "Login failed");
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <section className="stack auth-wrap">
      <article className="panel auth-card">
        <p className="eyebrow-light">Admin Access</p>
        <h2 className="title">Recruitment Admin Sign in</h2>
        <p className="muted">Use configured admin credentials to access protected recruitment operations pages.</p>
        <p className="muted">Default (if env is not set): admin@recruitops.local / R3cruitOps!Admin#2026</p>

        <form className="stack" onSubmit={onSubmit}>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            required
          />
          {error ? <p className="error-text">{error}</p> : null}
          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </article>
    </section>
  );
}
