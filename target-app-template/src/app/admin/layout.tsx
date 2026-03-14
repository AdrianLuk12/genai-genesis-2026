"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const navItems = [
  {
    label: "Home",
    href: "/admin",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 2L3 8v10h5v-6h4v6h5V8l-7-6z" />
      </svg>
    ),
  },
  {
    label: "Orders",
    href: "/admin/orders",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0h8v12H6V4zm2 2h4v1H8V6zm0 3h4v1H8V9zm0 3h3v1H8v-1z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    label: "Products",
    href: "/admin/products",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 2l6 3.5v9L10 18l-6-3.5v-9L10 2zm0 1.15L5 6.5v7l5 3.35 5-3.35v-7L10 3.15z" clipRule="evenodd" />
      </svg>
    ),
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="admin-sidebar w-[240px] bg-[#1a1c1d] flex flex-col shrink-0 overflow-y-auto">
        {/* Store name */}
        <div className="px-4 py-4 border-b border-[#333]">
          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#008060] rounded-lg flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
            </div>
            <span className="text-white font-semibold text-sm truncate">Sandbox Store</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#2a2c2e] text-white"
                    : "text-[#a6acb2] hover:text-white hover:bg-[#2a2c2e]"
                }`}
              >
                <span className={isActive ? "text-white" : "text-[#8c9196]"}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="px-2 py-3 border-t border-[#333] space-y-0.5">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[#a6acb2] hover:text-white hover:bg-[#2a2c2e] transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-1a7 7 0 100-14 7 7 0 000 14z" clipRule="evenodd" />
            </svg>
            View Store
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[#a6acb2] hover:text-white hover:bg-[#2a2c2e] transition-colors w-full text-left"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 4.5A1.5 1.5 0 014.5 3h5A1.5 1.5 0 0111 4.5v2a.5.5 0 01-1 0v-2a.5.5 0 00-.5-.5h-5a.5.5 0 00-.5.5v11a.5.5 0 00.5.5h5a.5.5 0 00.5-.5v-2a.5.5 0 011 0v2A1.5 1.5 0 019.5 17h-5A1.5 1.5 0 013 15.5v-11z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M14.854 10.354a.5.5 0 000-.708l-3-3a.5.5 0 10-.708.708L13.293 9.5H7a.5.5 0 000 1h6.293l-2.147 2.146a.5.5 0 00.708.708l3-3z" clipRule="evenodd" />
            </svg>
            Log out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-[#e1e3e5] px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#8c9196" strokeWidth="1.5">
              <circle cx="9" cy="9" r="6" />
              <path d="M13.5 13.5L17 17" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Search..."
              className="flex-1 bg-[#f6f6f7] border border-[#e1e3e5] rounded-lg px-3 py-1.5 text-sm text-[#202223] placeholder-[#8c9196] focus:border-[#008060] focus:ring-1 focus:ring-[#008060] transition-colors"
            />
          </div>
          <div className="flex items-center gap-3 ml-4">
            <button className="relative p-2 text-[#5c5f62] hover:text-[#202223] transition-colors rounded-lg hover:bg-[#f6f6f7]">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zm0 16a2 2 0 01-2-2h4a2 2 0 01-2 2z" />
              </svg>
            </button>
            <div className="w-8 h-8 bg-[#008060] rounded-full flex items-center justify-center text-white text-xs font-bold">
              A
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-[#f6f6f7] p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
