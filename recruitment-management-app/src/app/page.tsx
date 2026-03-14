import Link from "next/link";

export default function RoleGatewayPage() {
  return (
    <section className="stack auth-wrap">
      <article className="panel auth-card stack">
        <header>
          <p className="eyebrow-light">Sandbox Target App</p>
          <h2 className="title">Choose access mode</h2>
          <p className="muted">
            This recruitment app has separated user and admin experiences. Select one to continue.
          </p>
        </header>

        <section className="role-grid">
          <article className="role-card">
            <h3>User side</h3>
            <p className="muted">Browse open roles and submit applications.</p>
            <Link href="/user-login" className="link-btn">
              Login as User
            </Link>
          </article>

          <article className="role-card">
            <h3>Admin side</h3>
            <p className="muted">Manage jobs, candidates, interviews, and metrics.</p>
            <Link href="/login" className="link-btn">
              Login as Admin
            </Link>
          </article>
        </section>
      </article>
    </section>
  );
}