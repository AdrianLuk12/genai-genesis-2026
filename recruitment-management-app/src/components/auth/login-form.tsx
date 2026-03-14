"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  accent: "admin" | "user";
  title: string;
  subtitle: string;
  endpoint: "/api/auth/login" | "/api/auth/user-login";
  successRedirect: "/admin" | "/careers";
};

export function LoginForm({ accent, title, subtitle, endpoint, successRedirect }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState(
    accent === "admin" ? "admin@recruitops.local" : "candidate@recruitops.local",
  );
  const [password, setPassword] = useState(
    accent === "admin" ? "R3cruitOps!Admin#2026" : "R3cruitOps!Candidate#2026",
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch(endpoint, {
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

    router.push(successRedirect);
    router.refresh();
  }

  return (
    <section className="stack auth-wrap">
      <article className={`panel auth-card auth-card-${accent}`}>
        <p className="eyebrow-light">Secure Access</p>
        <h2 className="title">{title}</h2>
        <p className="muted">{subtitle}</p>

        <form className="stack" onSubmit={onSubmit}>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Work email"
            autoComplete="email"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            autoComplete="current-password"
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