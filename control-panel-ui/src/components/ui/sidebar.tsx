"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FlaskConical,
  ChevronLeft,
  ChevronRight,
  Beaker,
} from "lucide-react";

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Scenarios",
    href: "/scenarios",
    icon: FlaskConical,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-200 ease-out ${
        collapsed ? "w-[60px]" : "w-[220px]"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center h-14 px-4 border-b border-sidebar-border shrink-0">
        <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
          <div className="size-7 rounded-none bg-sauce-green flex items-center justify-center shrink-0">
            <Beaker className="size-4 text-sauce-dark" />
          </div>
          {!collapsed && (
            <span className="text-sm font-semibold text-white tracking-wide whitespace-nowrap">
              SAUCE LABS
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.disabled ? "#" : item.href}
              className={`flex items-center gap-2.5 h-9 rounded-none transition-colors duration-150 ${
                collapsed ? "justify-center px-0" : "px-2.5"
              } ${
                item.disabled
                  ? "opacity-40 pointer-events-none"
                  : isActive
                  ? "bg-sidebar-accent text-white"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-white"
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="size-[18px] shrink-0" />
              {!collapsed && (
                <span className="text-[13px] font-medium whitespace-nowrap">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-sidebar-border p-2 shrink-0">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className={`flex items-center gap-2.5 h-9 w-full rounded-none text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-white transition-colors duration-150 ${
            collapsed ? "justify-center px-0" : "px-2.5"
          }`}
        >
          {collapsed ? (
            <ChevronRight className="size-[18px] shrink-0" />
          ) : (
            <>
              <ChevronLeft className="size-[18px] shrink-0" />
              <span className="text-[13px] font-medium">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}