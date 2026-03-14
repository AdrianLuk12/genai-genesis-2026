"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Job = {
  id: string;
  title: string;
  department: string;
  location: string;
  status: "Open" | "Paused" | "Closed";
  openings: number;
};

type Props = {
  previewMode?: boolean;
};

export function CareersBoard({ previewMode = false }: Props) {
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    fetch("/api/jobs")
      .then((res) => res.json())
      .then((data: Job[]) => setJobs(data.filter((job) => job.status === "Open")));
  }, []);

  return (
    <section className="stack">
      <header className="page-head">
        <div>
          <p className="eyebrow-light">
            {previewMode ? "Admin preview of candidate experience" : "User-facing candidate experience"}
          </p>
          <h2 className="title">Careers</h2>
        </div>
        {previewMode ? (
          <span className="pill">Preview mode</span>
        ) : (
          <Link href="/careers/apply" className="link-btn">
            Apply Now
          </Link>
        )}
      </header>

      {previewMode ? <p className="muted">This page mirrors the candidate jobs view for recruiter QA.</p> : null}

      <section className="product-grid">
        {jobs.map((job) => (
          <article key={job.id} className="panel product-card">
            <h3>{job.title}</h3>
            <p className="muted">{job.department}</p>
            <p>
              <strong>Location:</strong> {job.location}
            </p>
            <p>
              <strong>Openings:</strong> {job.openings}
            </p>
            {previewMode ? (
              <span className="button-secondary">Candidate apply CTA</span>
            ) : (
              <Link href={`/careers/apply?jobId=${job.id}`} className="link-btn">
                Apply for this role
              </Link>
            )}
          </article>
        ))}
      </section>
    </section>
  );
}