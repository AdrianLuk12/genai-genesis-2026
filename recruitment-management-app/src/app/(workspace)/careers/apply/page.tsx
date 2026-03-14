"use client";

import { FormEvent, useEffect, useState } from "react";

type Job = {
  id: string;
  title: string;
};

export default function ApplyPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    jobId: "",
    score: 70,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const jobId = params.get("jobId") ?? "";

    fetch("/api/jobs")
      .then((res) => res.json())
      .then((data: Job[]) => {
        const openJobs = data;
        setJobs(openJobs);
        if (jobId) {
          setForm((prev) => ({ ...prev, jobId }));
        } else if (openJobs[0]?.id) {
          setForm((prev) => ({ ...prev, jobId: openJobs[0].id }));
        }
      });
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    await fetch("/api/candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        stage: "Applied",
        jobId: form.jobId,
        score: Number(form.score),
      }),
    });
    setSubmitted(true);
  }

  return (
    <section className="stack auth-wrap" data-testid="candidate-apply-page">
      <article className="panel auth-card" data-testid="candidate-apply-card">
        <p className="eyebrow-light">Candidate application</p>
        <h2 className="title">Apply</h2>

        {submitted ? (
          <p data-testid="application-submitted-message">Thanks! Your application has been submitted.</p>
        ) : (
          <form className="stack" onSubmit={onSubmit} data-testid="candidate-apply-form">
            <input
              placeholder="Full name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
              data-testid="candidate-apply-name"
            />
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              required
              data-testid="candidate-apply-email"
            />
            <select
              value={form.jobId}
              onChange={(event) => setForm((prev) => ({ ...prev, jobId: event.target.value }))}
              required
              data-testid="candidate-apply-job"
            >
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
            <button type="submit" data-testid="candidate-apply-submit">Submit Application</button>
          </form>
        )}
      </article>
    </section>
  );
}
