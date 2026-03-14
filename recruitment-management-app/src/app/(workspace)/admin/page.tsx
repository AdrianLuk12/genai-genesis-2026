"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Stats = {
  openJobs: number;
  candidates: number;
  interviewsScheduled: number;
  offers: number;
  hires: number;
  avgCandidateScore: number;
  stageCounts: {
    Applied: number;
    Screening: number;
    Interview: number;
    Offer: number;
    Hired: number;
    Rejected: number;
  };
};

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  async function load() {
    const data = await fetch("/api/metrics").then((res) => res.json());
    setStats(data);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  if (!stats) {
    return <section className="panel">Loading admin dashboard...</section>;
  }

  return (
    <section className="stack">
      <header className="page-head">
        <div>
          <p className="eyebrow-light">Admin management surface</p>
          <h2 className="title">Recruitment Admin Dashboard</h2>
        </div>
        <div className="link-group">
          <Link href="/admin/jobs" className="link-btn">Manage Jobs</Link>
          <Link href="/admin/candidates" className="link-btn">Manage Candidates</Link>
          <Link href="/admin/interviews" className="link-btn">Manage Interviews</Link>
        </div>
      </header>

      <section className="metrics-grid">
        <article className="panel"><p className="metric-label">Open Jobs</p><p className="metric-value">{stats.openJobs}</p></article>
        <article className="panel"><p className="metric-label">Candidates</p><p className="metric-value">{stats.candidates}</p></article>
        <article className="panel"><p className="metric-label">Scheduled Interviews</p><p className="metric-value">{stats.interviewsScheduled}</p></article>
        <article className="panel"><p className="metric-label">Offers</p><p className="metric-value">{stats.offers}</p></article>
        <article className="panel"><p className="metric-label">Hires</p><p className="metric-value">{stats.hires}</p></article>
        <article className="panel"><p className="metric-label">Avg Score</p><p className="metric-value">{stats.avgCandidateScore}</p></article>
      </section>

      <article className="panel">
        <h3 className="panel-title">Candidate Stage Distribution</h3>
        <table>
          <thead>
            <tr><th>Stage</th><th>Count</th></tr>
          </thead>
          <tbody>
            {Object.entries(stats.stageCounts).map(([stage, count]) => (
              <tr key={stage}>
                <td>{stage}</td>
                <td>{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}
