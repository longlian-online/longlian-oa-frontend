import { Bell } from "lucide-react";
import { NavLink, useLocation } from "react-router";
import ThemeToggle from "../theme/ThemeToggle";
import { cn } from "../../lib/utils";

const subMenus: Record<string, { to: string; label: string }[]> = {
  "/app/planning": [
    { to: "/app/planning", label: "项目列表" },
    { to: "/app/planning/mine", label: "我的项目" },
  ],
  "/app/todos": [{ to: "/app/todos", label: "全部待办" }],
  "/app/square": [{ to: "/app/square", label: "可接取任务" }],
  "/app/recommend": [
    { to: "/app/recommend", label: "安利列表" },
    { to: "/app/recommend/create", label: "发布安利" },
  ],
  "/app/archive": [{ to: "/app/archive", label: "已归档项目" }],
};

export default function AppHeader() {
  const { pathname } = useLocation();
  const section = "/" + pathname.split("/").slice(1, 3).join("/");
  const items = subMenus[section] ?? [];

  return (
    <header className="border-border bg-background grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b px-4">
      <div />

      <nav className="flex items-center gap-1">
        {items.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                isActive
                  ? "bg-secondary text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground",
              )
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="flex items-center justify-end gap-1">
        <ThemeToggle />
        <button
          type="button"
          className="text-muted-foreground hover:bg-secondary hover:text-foreground relative rounded-lg p-2 transition-colors"
          aria-label="通知"
        >
          <Bell className="h-4 w-4" />
          <span className="bg-destructive absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full" />
        </button>
      </div>
    </header>
  );
}
