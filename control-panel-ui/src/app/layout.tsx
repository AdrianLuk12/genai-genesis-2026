import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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
      <body className={`${geistSans.variable} font-sans antialiased`}>
        <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6">
          <span className="font-bold text-lg mr-4">Sandbox Platform</span>
          <Link href="/" className="text-gray-700 hover:text-black">
            Dashboard
          </Link>
          <Link href="/scenarios" className="text-gray-700 hover:text-black">
            Scenarios
          </Link>
        </nav>
        <main className="p-6">{children}</main>
      </body>
    </html>
  );
}
