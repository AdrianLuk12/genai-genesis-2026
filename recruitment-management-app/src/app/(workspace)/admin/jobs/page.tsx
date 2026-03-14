"use client";

import { FormEvent, useEffect, useState } from "react";

type Job = {
  id: string;
  title: string;
  department: string;
  location: string;
  status: string;
  openings: number;
};

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [form, setForm] = useState({
    title: "",
    department: "",
    location: "",
    status: "Open",
    openings: 1,
  });

  async function load() {
    const data = await fetch("/api/jobs").then((res) => res.json());
    setJobs(data);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function createJob(event: FormEvent) {
    event.preventDefault();
    await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, openings: Number(form.openings) }),
    });
    setForm({ title: "", department: "", location: "", status: "Open", openings: 1 });
    load();
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/jobs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function removeJob(id: string) {
    await fetch(`/api/jobs/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <section className="stack" data-testid="admin-jobs-page">
      <header>
        <p className="eyebrow-light">Protected admin area</p>
        <h2 className="title title-contrast">Manage Jobs</h2>
      </header>

      <form className="panel form-grid" onSubmit={createJob} data-testid="admin-jobs-create-form">
        <input value={form.title} placeholder="Title" onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required data-testid="job-form-title" />
        <input value={form.department} placeholder="Department" onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))} required data-testid="job-form-department" />
        <input value={form.location} placeholder="Location" onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} required data-testid="job-form-location" />
        <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} data-testid="job-form-status">
          <option>Open</option><option>Paused</option><option>Closed</option>
        </select>
        <input type="number" min={1} value={form.openings} onChange={(e) => setForm((p) => ({ ...p, openings: Number(e.target.value) }))} data-testid="job-form-openings" />
        <button type="submit" data-testid="job-form-submit">Create Job</button>
      </form>

      <article className="panel" data-testid="admin-jobs-table-panel">
        <table data-testid="admin-jobs-table">
          <thead><tr><th>Title</th><th>Department</th><th>Location</th><th>Status</th><th>Openings</th><th>Actions</th></tr></thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id}>
                <td>{job.title}</td>
                <td>{job.department}</td>
                <td>{job.location}</td>
                <td>
                  <select value={job.status} onChange={(e) => updateStatus(job.id, e.target.value)} data-testid={`job-status-select-${job.id}`}>
                    <option>Open</option><option>Paused</option><option>Closed</option>
                  </select>
                </td>
                <td>{job.openings}</td>
                <td><button className="danger-btn" type="button" onClick={() => removeJob(job.id)} data-testid={`job-delete-${job.id}`}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}
