"use client";

import { useEffect, useState } from "react";

type Candidate = {
  id: string;
  name: string;
  email: string;
  stage: string;
  score: number;
};

export default function AdminCandidatesPage() {
  const [items, setItems] = useState<Candidate[]>([]);

  async function load() {
    const data = await fetch("/api/candidates").then((res) => res.json());
    setItems(data);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function updateStage(id: string, stage: string) {
    await fetch(`/api/candidates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    load();
  }

  async function removeCandidate(id: string) {
    await fetch(`/api/candidates/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <section className="stack">
      <header>
        <p className="eyebrow-light">Protected admin area</p>
        <h2 className="title">Manage Candidates</h2>
      </header>

      <article className="panel">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Stage</th><th>Score</th><th>Actions</th></tr></thead>
          <tbody>
            {items.map((candidate) => (
              <tr key={candidate.id}>
                <td>{candidate.name}</td>
                <td>{candidate.email}</td>
                <td>
                  <select value={candidate.stage} onChange={(e) => updateStage(candidate.id, e.target.value)}>
                    <option>Applied</option><option>Screening</option><option>Interview</option><option>Offer</option><option>Hired</option><option>Rejected</option>
                  </select>
                </td>
                <td>{candidate.score}</td>
                <td><button className="danger-btn" type="button" onClick={() => removeCandidate(candidate.id)}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}
