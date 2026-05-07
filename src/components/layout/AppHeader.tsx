import { Bell } from "lucide-react";
import { NavLink, useLocation } from "react-router";
import { Button } from "@/components/ui/button";
import ThemeToggle from "../theme/ThemeToggle";
import { cn } from "../../lib/utils";

const subMenus: Record<string, { to: string; label: string }[]> = {
  "/dashboard/planning": [
    { to: "/dashboard/workshop", label: "工坊" },
    { to: "/dashboard/planning", label: "项目列表" },
    { to: "/dashboard/planning/mine", label: "我的项目" },
  ],
  "/dashboard/todos": [{ to: "/dashboard/todos", label: "全部待办" }],
  "/dashboard/square": [{ to: "/dashboard/square", label: "可接取任务" }],
  "/dashboard/recommend": [
    { to: "/dashboard/recommend", label: "安利列表" },
    { to: "/dashboard/recommend/create", label: "发布安利" },
  ],
  "/dashboard/archive": [{ to: "/dashboard/archive", label: "已归档项目" }],
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
        <Button variant="ghost" size="icon-sm" aria-label="通知" className="relative">
          <Bell className="h-4 w-4" />
          <span className="bg-destructive absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full" />
        </Button>
      </div>
    </header>
  );
}
