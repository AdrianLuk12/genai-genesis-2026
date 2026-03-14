"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const adminNavItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/jobs", label: "Jobs" },
  { href: "/admin/candidates", label: "Candidates" },
  { href: "/admin/interviews", label: "Interviews" },
  { href: "/admin/candidate-preview", label: "Candidate Preview" },
];

const candidateNavItems = [
  { href: "/careers", label: "Open Roles" },
  { href: "/careers/apply", label: "Apply" },
];

const titleMap: Record<string, { title: string; subtitle: string }> = {
  "/admin": { title: "Recruitment Command Center", subtitle: "Track hiring health and prioritize actions" },
  "/admin/jobs": { title: "Job Requisitions", subtitle: "Open, pause, and close hiring plans" },
  "/admin/candidates": { title: "Candidate Pipeline", subtitle: "Move candidates through hiring stages" },
  "/admin/interviews": { title: "Interview Operations", subtitle: "Coordinate interview loops and outcomes" },
  "/admin/candidate-preview": {
    title: "Candidate Experience Preview",
    subtitle: "Preview what candidates see without switching sessions",
  },
  "/careers": { title: "Careers Experience", subtitle: "Review the candidate-facing job portal" },
  "/careers/apply": { title: "Application Flow", subtitle: "Submit candidate applications in the public flow" },
};

type Props = {
  children: React.ReactNode;
};

export function WorkspaceShell({ children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const isCandidateView = pathname?.startsWith("/careers") ?? false;
  const navItems = isCandidateView ? candidateNavItems : adminNavItems;

  const heading = useMemo(() => {
    if (!pathname) {
      return titleMap["/admin"];
    }
    const exact = titleMap[pathname];
    if (exact) {
      return exact;
    }
    const match = Object.entries(titleMap).find(([key]) => pathname.startsWith(key));
    return match ? match[1] : titleMap["/admin"];
  }, [pathname]);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="workspace-shell" data-testid="workspace-shell">
      <aside className="workspace-sidebar" data-testid="workspace-sidebar">
        <div className="brand-block">
          <p className="eyebrow">{isCandidateView ? "Candidate Portal" : "Recruitment OS"}</p>
          <h1 className="brand">RecruitOps</h1>
          <p className="muted">
            {isCandidateView
              ? "Explore opportunities and submit applications."
              : "A polished hiring workspace for modern recruiting teams."}
          </p>
        </div>

        <nav className="nav-list" data-testid={isCandidateView ? "candidate-nav" : "admin-nav"}>
          {navItems.map((item) => {
            const exactOnly = item.href === "/admin" || item.href === "/careers" || item.href === "/careers/apply";
            const active =
              exactOnly
                ? pathname === item.href
                : pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${active ? "is-active" : ""}`}
                aria-current={active ? "page" : undefined}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="workspace-main" data-testid="workspace-main">
        <header className="workspace-topbar" data-testid="workspace-topbar">
          <div>
            <p className="eyebrow-light">Operations Workspace</p>
            <h2 className="workspace-title">{heading.title}</h2>
            <p className="muted">{heading.subtitle}</p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="button-secondary"
            disabled={loggingOut}
            data-testid="signout-button"
          >
            {loggingOut ? "Signing out..." : "Sign out"}
          </button>
        </header>

        <main className="main-content" data-testid="workspace-content">{children}</main>
      </div>
    </div>
  );
}