import type { ReactNode } from "react";
import { Bell, Building2, CalendarClock, LogOut, Network, UserRound, Users } from "lucide-react";
import { Navigate, NavLink, useLocation, useNavigate } from "react-router";

import { adminLogout } from "@/api/auth";
import { $tip } from "@/components/tip";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import PageTransition from "@/components/layout/PageTransition";
import { clearAdminSession, getAdminRole, getAdminToken, getAdminUsername } from "@/lib/session";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  description: string;
}

const navItems = [
  { to: "/admin/admins", label: "管理员", icon: Users },
  { to: "/admin/organizations", label: "组织", icon: Building2 },
  { to: "/admin/scheduled-tasks", label: "定时任务", icon: CalendarClock },
] as const;

export default function AdminLayout({ children, title, description }: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const token = getAdminToken();

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  async function handleLogout(): Promise<void> {
    try {
      await adminLogout();
      $tip("管理员已退出登录", "success");
    } catch (error) {
      $tip(error instanceof Error ? error.message : "退出登录失败", "error");
    } finally {
      clearAdminSession();
      void navigate("/admin/login", { replace: true });
    }
  }

  return (
    <div className="flex h-svh overflow-hidden bg-background text-foreground">
      <aside className="border-border bg-background flex h-full w-56 shrink-0 flex-col border-r">
        <NavLink to="/admin" className="flex h-14 items-center gap-2.5 border-b border-border px-5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Network className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
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
                  ? "bg-foreground text-background font-medium"
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
        <header className="border-border bg-background grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b px-4">
          <div />
          <span className="text-sm font-medium text-foreground">{title}</span>
          <div className="flex items-center justify-end gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="icon-sm" aria-label="通知" className="relative">
              <Bell className="h-4 w-4" />
              <span className="bg-destructive absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full" />
            </Button>
            <div className="group relative ml-1 border-l border-border pl-3">
              <button
                type="button"
                aria-label="打开管理员菜单"
                className="block rounded-full outline-none ring-offset-background transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Avatar>
                  <AvatarFallback>
                    <UserRound className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </button>
              <div className="pointer-events-none absolute right-0 top-full z-50 w-56 translate-y-2 rounded-xl border border-border bg-popover p-2 opacity-0 shadow-lg transition-[opacity,transform] duration-200 group-hover:pointer-events-auto group-hover:translate-y-1 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-1 group-focus-within:opacity-100">
                <div className="flex items-center gap-3 px-2 py-2.5">
                  <Avatar size="lg">
                    <AvatarFallback>
                      <UserRound className="h-5 w-5" />
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
              <h1 className="text-xl font-bold">{title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </div>
            {children}
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
