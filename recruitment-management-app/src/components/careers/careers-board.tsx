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
    <section className="stack" data-testid={previewMode ? "candidate-preview-board" : "careers-board"}>
      <header className="page-head" data-testid="careers-board-header">
        <div>
          <p className="eyebrow-light">
            {previewMode ? "Admin preview of candidate experience" : "User-facing candidate experience"}
          </p>
          <h2 className="title title-contrast">Careers</h2>
        </div>
        {previewMode ? (
          <span className="pill" data-testid="preview-mode-badge">Preview mode</span>
        ) : (
          <Link href="/careers/apply" className="link-btn" data-testid="careers-apply-now-button">
            Apply Now
          </Link>
        )}
      </header>

      {previewMode ? <p className="muted">This page mirrors the candidate jobs view for recruiter QA.</p> : null}

      <section className="product-grid" data-testid="careers-job-grid">
        {jobs.map((job) => (
          <article key={job.id} className="panel product-card" data-testid={`job-card-${job.id}`}>
            <h3>{job.title}</h3>
            <p className="muted">{job.department}</p>
            <p>
              <strong>Location:</strong> {job.location}
            </p>
            <p>
              <strong>Openings:</strong> {job.openings}
            </p>
            {previewMode ? (
              <span className="button-secondary" data-testid={`job-preview-cta-${job.id}`}>Candidate apply CTA</span>
            ) : (
              <Link href={`/careers/apply?jobId=${job.id}`} className="link-btn" data-testid={`job-apply-button-${job.id}`}>
                Apply for this role
              </Link>
            )}
          </article>
        ))}
      </section>
    </section>
  );
}