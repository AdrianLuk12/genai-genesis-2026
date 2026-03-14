import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
    title: "RecruitOps Control Center",
    description: "Recruitment workflow and talent pipeline management",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className="root-body">{children}</body>
        </html>
    );
}