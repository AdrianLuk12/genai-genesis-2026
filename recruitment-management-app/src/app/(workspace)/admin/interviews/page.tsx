"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

const DEFAULT_SCHEDULED_AT = new Date(Date.now() + 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 16);

type Interview = {
  id: string;
  type: string;
  scheduledAt: string;
  interviewer: string;
  status: string;
};

type Candidate = {
  id: string;
  name: string;
  jobId: string;
};

export default function AdminInterviewsPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [form, setForm] = useState({
    candidateId: "",
    jobId: "",
    type: "Phone",
    scheduledAt: DEFAULT_SCHEDULED_AT,
    interviewer: "",
    status: "Scheduled",
  });

  const load = useCallback(async () => {
    const [interviewData, candidateData] = await Promise.all([
      fetch("/api/interviews").then((res) => res.json()),
      fetch("/api/candidates").then((res) => res.json()),
    ]);

    setInterviews(interviewData);
    setCandidates(candidateData);

    setForm((prev) => {
      if (prev.candidateId || candidateData.length === 0) {
        return prev;
      }
      return { ...prev, candidateId: candidateData[0].id, jobId: candidateData[0].jobId };
    });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function schedule(event: FormEvent) {
    event.preventDefault();
    await fetch("/api/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, scheduledAt: new Date(form.scheduledAt).toISOString() }),
    });
    setForm((prev) => ({ ...prev, interviewer: "" }));
    load();
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/interviews/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function removeInterview(id: string) {
    await fetch(`/api/interviews/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <section className="stack">
      <header>
        <p className="eyebrow-light">Protected admin area</p>
        <h2 className="title">Manage Interviews</h2>
      </header>

      <form className="panel form-grid" onSubmit={schedule}>
        <select
          value={form.candidateId}
          onChange={(event) => {
            const selected = candidates.find((candidate) => candidate.id === event.target.value);
            setForm((prev) => ({ ...prev, candidateId: event.target.value, jobId: selected?.jobId ?? "" }));
          }}
        >
          {candidates.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>{candidate.name}</option>
          ))}
        </select>
        <select value={form.type} onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}>
          <option>Phone</option><option>Technical</option><option>Panel</option><option>Final</option>
        </select>
        <input type="datetime-local" value={form.scheduledAt} onChange={(event) => setForm((prev) => ({ ...prev, scheduledAt: event.target.value }))} required />
        <input value={form.interviewer} placeholder="Interviewer" onChange={(event) => setForm((prev) => ({ ...prev, interviewer: event.target.value }))} required />
        <select value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}>
          <option>Scheduled</option><option>Completed</option><option>Canceled</option>
        </select>
        <button type="submit">Schedule Interview</button>
      </form>

      <article className="panel">
        <table>
          <thead><tr><th>When</th><th>Type</th><th>Interviewer</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {interviews.map((interview) => (
              <tr key={interview.id}>
                <td>{new Date(interview.scheduledAt).toLocaleString()}</td>
                <td>{interview.type}</td>
                <td>{interview.interviewer}</td>
                <td>
                  <select value={interview.status} onChange={(event) => updateStatus(interview.id, event.target.value)}>
                    <option>Scheduled</option><option>Completed</option><option>Canceled</option>
                  </select>
                </td>
                <td><button className="danger-btn" type="button" onClick={() => removeInterview(interview.id)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}
