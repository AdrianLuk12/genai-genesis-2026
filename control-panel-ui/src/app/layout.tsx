import type { Metadata } from "next";
import { Geist, Syne } from "next/font/google";
import Link from "next/link";
import { ConfirmProvider } from "@/components/ui/confirm-modal";
import { EditProvider } from "@/components/ui/edit-name-modal";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Sandbox Platform",
  description: "On-demand sandbox environment platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${syne.variable} font-sans antialiased`}
      >
        <ConfirmProvider>
        <EditProvider>
          <nav className="sticky top-0 z-50 bg-[#F9F8F6]/70 backdrop-blur-xl border-b border-border/50 px-8 py-4 flex items-center gap-8">
            <Link href="/" className="font-display font-bold text-xl tracking-tight mr-2">
              SANDBOX
            </Link>
            <div className="flex items-center gap-6">
              <Link
                href="/"
                className="group relative text-sm uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors duration-300"
              >
                Dashboard
                <span className="absolute left-0 -bottom-1 h-px w-0 bg-foreground transition-all duration-300 ease-out group-hover:w-full" />
              </Link>
              <Link
                href="/scenarios"
                className="group relative text-sm uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors duration-300"
              >
                Scenarios
                <span className="absolute left-0 -bottom-1 h-px w-0 bg-foreground transition-all duration-300 ease-out group-hover:w-full" />
              </Link>
            </div>
          </nav>
          <main className="max-w-6xl mx-auto px-8 py-8">{children}</main>
        </EditProvider>
        </ConfirmProvider>
      </body>
    </html>
  );
}
