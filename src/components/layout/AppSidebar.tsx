import { useState } from "react";
import {
  // Archive,
  Bell,
  BookOpen,
  // CheckSquare,
  LogOut,
  // Megaphone,
  Plus,
  // ShoppingBag,
  UserRound,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router";

import { logout } from "@/api/auth";
import { joinOrganizationByInvite } from "@/api/user";
import { $tip } from "@/components/tip";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { clearSession } from "@/lib/session";
import { cn } from "@/lib/utils";

const navItems = [
  {
    to: "/dashboard/planning",
    label: "企划",
    icon: BookOpen,
    activePrefixes: ["/dashboard/planning", "/dashboard/workshop"],
  },
  // {
  //   to: "/dashboard/todos",
  //   label: "待办",
  //   icon: CheckSquare,
  //   activePrefixes: ["/dashboard/todos"],
  // },
  // {
  //   to: "/dashboard/square",
  //   label: "任务广场",
  //   icon: ShoppingBag,
  //   activePrefixes: ["/dashboard/square"],
  // },
  // {
  //   to: "/dashboard/recommend",
  //   label: "安利",
  //   icon: Megaphone,
  //   activePrefixes: ["/dashboard/recommend"],
  // },
  // {
  //   to: "/dashboard/archive",
  //   label: "归档",
  //   icon: Archive,
  //   activePrefixes: ["/dashboard/archive"],
  // },
] as const;

function isPathActive(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export default function AppSidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, roles } = useCurrentUser();
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleJoinOrganization = async (): Promise<void> => {
    const normalizedInviteCode = inviteCode.trim();
    if (!normalizedInviteCode) {
      $tip("请输入邀请码", "error");
      return;
    }

    setIsJoining(true);
    try {
      await joinOrganizationByInvite({ inviteCode: normalizedInviteCode });
      $tip("已加入组织", "success");
      setInviteCode("");
      setIsJoinOpen(false);
    } catch (error) {
      $tip(error instanceof Error ? error.message : "加入组织失败", "error");
    } finally {
      setIsJoining(false);
    }
  };

  const handleLogout = async (): Promise<void> => {
    setIsLoggingOut(true);
    try {
      await logout();
      $tip("已退出登录", "success");
    } catch (error) {
      $tip(error instanceof Error ? error.message : "退出登录失败", "error");
    } finally {
      clearSession();
      setIsLoggingOut(false);
      void navigate("/login", { replace: true });
    }
  };

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

      <div className="border-t border-border px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background">
            <UserRound className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-sm font-medium text-foreground">
              {user?.nickname || user?.username || "用户"}
            </div>
            <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {roles.join(" / ") || "MEMBER"}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="加入组织"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => setIsJoinOpen(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="退出登录"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
            disabled={isLoggingOut}
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={isJoinOpen} onOpenChange={setIsJoinOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>加入组织</DialogTitle>
            <DialogDescription>输入管理员提供的邀请码，加入新的协作组织。</DialogDescription>
          </DialogHeader>
          <Input
            value={inviteCode}
            placeholder="请输入邀请码"
            className="h-10"
            onChange={(event) => setInviteCode(event.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsJoinOpen(false)}>
              取消
            </Button>
            <Button onClick={handleJoinOrganization} disabled={isJoining}>
              {isJoining ? "加入中..." : "加入"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
