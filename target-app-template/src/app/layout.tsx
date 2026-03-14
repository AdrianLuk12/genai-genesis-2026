import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";

export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sandbox Store",
  description: "Target app template for sandbox platform",
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
          <span className="font-bold text-lg mr-4">Sandbox Store</span>
          <Link
            href="/"
            data-testid="nav-products"
            className="text-gray-700 hover:text-black"
          >
            Products
          </Link>
          <Link
            href="/cart"
            data-testid="nav-cart"
            className="text-gray-700 hover:text-black"
          >
            Cart
            <CartCount />
          </Link>
          <Link
            href="/admin"
            data-testid="nav-admin"
            className="text-gray-700 hover:text-black"
          >
            Admin
          </Link>
        </nav>
        <main className="p-6">{children}</main>
      </body>
    </html>
  );
}

async function CartCount() {
  try {
    const db = (await import("@/lib/db")).default;
    const result = db
      .prepare("SELECT COALESCE(SUM(quantity), 0) as count FROM cart_items")
      .get() as { count: number };
    if (result.count > 0) {
      return (
        <span className="ml-1 bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
          {result.count}
        </span>
      );
    }
  } catch {
    // DB not ready yet
  }
  return null;
}
