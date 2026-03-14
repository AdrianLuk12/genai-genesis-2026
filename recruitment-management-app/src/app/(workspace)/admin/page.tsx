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
    return <section className="panel" data-testid="admin-dashboard-loading">Loading admin dashboard...</section>;
  }

  return (
    <section className="stack" data-testid="admin-dashboard-page">
      <header className="page-head" data-testid="admin-dashboard-header">
        <div>
          <p className="eyebrow-light">Admin management surface</p>
          <h2 className="title title-contrast">Recruitment Admin Dashboard</h2>
        </div>
        <div className="link-group">
          <Link href="/admin/jobs" className="link-btn" data-testid="admin-manage-jobs-link">Manage Jobs</Link>
          <Link href="/admin/candidates" className="link-btn" data-testid="admin-manage-candidates-link">Manage Candidates</Link>
          <Link href="/admin/interviews" className="link-btn" data-testid="admin-manage-interviews-link">Manage Interviews</Link>
        </div>
      </header>

      <section className="metrics-grid" data-testid="admin-metrics-grid">
        <article className="panel" data-testid="metric-open-jobs"><p className="metric-label">Open Jobs</p><p className="metric-value">{stats.openJobs}</p></article>
        <article className="panel" data-testid="metric-candidates"><p className="metric-label">Candidates</p><p className="metric-value">{stats.candidates}</p></article>
        <article className="panel" data-testid="metric-scheduled-interviews"><p className="metric-label">Scheduled Interviews</p><p className="metric-value">{stats.interviewsScheduled}</p></article>
        <article className="panel" data-testid="metric-offers"><p className="metric-label">Offers</p><p className="metric-value">{stats.offers}</p></article>
        <article className="panel" data-testid="metric-hires"><p className="metric-label">Hires</p><p className="metric-value">{stats.hires}</p></article>
        <article className="panel" data-testid="metric-avg-score"><p className="metric-label">Avg Score</p><p className="metric-value">{stats.avgCandidateScore}</p></article>
      </section>

      <article className="panel" data-testid="candidate-stage-distribution">
        <h3 className="panel-title">Candidate Stage Distribution</h3>
        <table data-testid="candidate-stage-table">
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
