import { Archive, Bell, BookOpen, CheckSquare, Megaphone, ShoppingBag } from "lucide-react";
import { NavLink, useLocation } from "react-router";

import { cn } from "@/lib/utils";

const navItems = [
  {
    to: "/dashboard/planning",
    label: "企划",
    icon: BookOpen,
    activePrefixes: ["/dashboard/planning", "/dashboard/workshop"],
  },
  {
    to: "/dashboard/todos",
    label: "待办",
    icon: CheckSquare,
    activePrefixes: ["/dashboard/todos"],
  },
  {
    to: "/dashboard/square",
    label: "任务广场",
    icon: ShoppingBag,
    activePrefixes: ["/dashboard/square"],
  },
  {
    to: "/dashboard/recommend",
    label: "安利",
    icon: Megaphone,
    activePrefixes: ["/dashboard/recommend"],
  },
  {
    to: "/dashboard/archive",
    label: "归档",
    icon: Archive,
    activePrefixes: ["/dashboard/archive"],
  },
] as const;

function isPathActive(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export default function AppSidebar() {
  const { pathname } = useLocation();

  return (
    <aside className="border-border bg-background flex h-full w-56 shrink-0 flex-col border-r">
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-5">
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
          style={{ background: "var(--theme-accent-gradient)" }}
        >
          <Bell className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-foreground truncate text-sm font-semibold">汉化组名称</span>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-3">
        {navItems.map(({ to, label, icon: Icon, activePrefixes }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                isActive || isPathActive(pathname, activePrefixes)
                  ? "bg-foreground text-background font-medium"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
