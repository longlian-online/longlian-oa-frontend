import { Archive, Bell, BookOpen, CheckSquare, Megaphone, ShoppingBag } from "lucide-react";
import { NavLink } from "react-router";
import { cn } from "../../lib/utils";

const navItems = [
  { to: "/app/planning", label: "企划", icon: BookOpen },
  { to: "/app/todos", label: "待办", icon: CheckSquare },
  { to: "/app/square", label: "任务广场", icon: ShoppingBag },
  { to: "/app/recommend", label: "安利", icon: Megaphone },
  { to: "/app/archive", label: "归档", icon: Archive },
] as const;

export default function AppSidebar() {
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
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                isActive
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
