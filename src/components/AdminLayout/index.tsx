import type { ReactNode } from "react";
import {
  Building2,
  CalendarClock,
  HardDrive,
  LogOut,
  MonitorCog,
  Network,
  ScrollText,
  UserRound,
  Users,
} from "lucide-react";
import { Navigate, NavLink, useLocation, useNavigate } from "react-router";

import { getSessionSnapshot } from "@/lib/session";
import { useApiMutation, useSessionSnapshot } from "@/hooks/queries/useApiQuery";
import { adminLogout } from "@/api/auth";
import { $tip } from "@/components/tip";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import PageTransition from "@/components/layout/PageTransition";
import { clearAdminSession, getAdminRole, getAdminUsername } from "@/lib/session";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
}

const navItems = [
  { to: "/admin/admins", label: "管理员", icon: Users },
  { to: "/admin/organizations", label: "组织", icon: Building2 },
  { to: "/admin/storage-stats", label: "存储", icon: HardDrive },
  { to: "/admin/scheduled-tasks", label: "定时任务", icon: CalendarClock },
  { to: "/admin/system-info", label: "系统信息", icon: MonitorCog },
  { to: "/admin/product-releases", label: "产品版本", icon: ScrollText },
] as const;

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const token = useSessionSnapshot().adminToken;
  const logoutMutation = useApiMutation({ scope: "admin", mutationFn: adminLogout });

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  async function handleLogout(): Promise<void> {
    const started = getSessionSnapshot();
    try {
      await logoutMutation.mutateAsync();
      $tip("管理员已退出登录", "success");
    } catch {
      /* 全局处理退出失败。 */
    } finally {
      if (getSessionSnapshot().adminScope === started.adminScope) {
        clearAdminSession();
        void navigate("/admin/login", { replace: true });
      }
    }
  }

  return (
    <div className="flex h-svh overflow-hidden bg-background text-foreground">
      <aside className="border-border bg-sidebar flex h-full w-56 shrink-0 flex-col border-r">
        <NavLink to="/admin" className="flex h-14 items-center gap-2.5 border-b border-border px-5">
          <Network className="h-4 w-4 shrink-0" />
          <span className="text-foreground truncate text-sm font-semibold">平台管理</span>
        </NavLink>
        <nav className="flex-1 space-y-0.5 px-3 py-3">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                location.pathname === to || location.pathname.startsWith(`${to}/`)
                  ? "bg-secondary font-medium text-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="border-border bg-sidebar flex h-14 shrink-0 items-center justify-end border-b px-4">
          <div className="flex items-center justify-end gap-1">
            <ThemeToggle />
            <div className="group relative ml-1 border-l border-border pl-3">
              <button
                type="button"
                aria-label="打开管理员菜单"
                className="block rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Avatar>
                  <AvatarFallback>
                    <UserRound className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </button>
              <div className="pointer-events-none absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border border-border bg-popover p-2 opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
                <div className="flex items-center gap-3 px-2 py-2.5">
                  <Avatar>
                    <AvatarFallback>
                      <UserRound className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">
                      {getAdminUsername() ?? "管理员"}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      {getAdminRole() ?? "ADMIN"}
                    </div>
                  </div>
                </div>
                <div className="my-1 border-t border-border" />
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
                  disabled={logoutMutation.isPending}
                  onClick={() => void handleLogout()}
                >
                  <LogOut className="h-4 w-4" />
                  退出管理端
                </Button>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <PageTransition>
            <div className="mb-5">
              <h1 className="text-xl font-semibold">{title}</h1>
            </div>
            {children}
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
