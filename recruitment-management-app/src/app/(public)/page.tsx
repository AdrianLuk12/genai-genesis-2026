import Link from "next/link";

export default function RoleGatewayPage() {
  return (
    <section className="stack auth-wrap home-wrap" data-testid="role-gateway-page">
      <article className="panel auth-card stack home-card" data-testid="role-gateway-card">
        <header>
          <p className="eyebrow-light">RecruitOps Platform</p>
          <h2 className="title">Welcome to your hiring command center</h2>
          <p className="muted">
            RecruitOps separates candidate and recruiter experiences for cleaner workflows,
            stronger access boundaries, and better day-to-day recruiting operations.
          </p>
        </header>

        <section className="role-grid">
          <article className="role-card" data-testid="candidate-role-card">
            <p className="pill">Candidate Experience</p>
            <h3>Careers portal</h3>
            <p className="muted">Browse open roles, review position details, and submit applications.</p>
            <Link href="/user-login" className="link-btn" data-testid="candidate-continue-button">
              Continue as Candidate
            </Link>
          </article>

          <article className="role-card" data-testid="recruiter-role-card">
            <p className="pill">Recruiter Operations</p>
            <h3>Admin workspace</h3>
            <p className="muted">Manage requisitions, candidate pipeline, interviews, and hiring metrics.</p>
            <Link href="/login" className="link-btn" data-testid="recruiter-continue-button">
              Continue as Recruiter
            </Link>
          </article>
        </section>
      </article>
    </section>
  );
}