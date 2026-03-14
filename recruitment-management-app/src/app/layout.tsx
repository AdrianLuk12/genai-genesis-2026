import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";

export const metadata: Metadata = {
    title: "RecruitOps Control Center",
    description: "Recruitment workflow and talent pipeline management",
};

const navItems = [
    { href: "/", label: "Home" },
    { href: "/careers", label: "Careers" },
    { href: "/admin", label: "Admin" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>
                <div className="app-shell">
                    <aside className="sidebar">
                        <div>
                            <p className="eyebrow">Enterprise Suite</p>
                            <h1 className="brand">RecruitOps</h1>
                        </div>

                        <nav className="nav-list">
                            {navItems.map((item) => (
                                <Link key={item.href} href={item.href} className="nav-link">
                                    {item.label}
                                </Link>
                            ))}
                        </nav>
                    </aside>

                    <main className="main-content">{children}</main>
                </div>
            </body>
        </html>
    );
}