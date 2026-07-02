import { useState } from "react";
import { Bell, LogOut, Plus, UserRound } from "lucide-react";
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
import ThemeToggle from "@/components/theme/ThemeToggle";

const subMenus: Record<string, { to: string; label: string }[]> = {
  "/dashboard/planning": [
    { to: "/dashboard/planning", label: "浏览" },
    { to: "/dashboard/workshop", label: "工坊" },
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
  const navigate = useNavigate();
  const { user, roles } = useCurrentUser();
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const section = pathname.startsWith("/dashboard/workshop")
    ? "/dashboard/planning"
    : "/" + pathname.split("/").slice(1, 3).join("/");
  const items = subMenus[section] ?? [];

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
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="加入组织"
          onClick={() => setIsJoinOpen(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label="通知" className="relative">
          <Bell className="h-4 w-4" />
          <span className="bg-destructive absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full" />
        </Button>
        <div className="hidden items-center gap-2 rounded-lg px-2 py-1 sm:flex">
          <UserRound className="h-4 w-4 text-muted-foreground" />
          <div className="leading-tight">
            <div className="max-w-24 truncate text-xs font-medium text-foreground">
              {user?.nickname || user?.username || "用户"}
            </div>
            <div className="max-w-24 truncate text-[11px] text-muted-foreground">
              {roles.join(" / ") || "MEMBER"}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="退出登录"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          <LogOut className="h-4 w-4" />
        </Button>
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
    </header>
  );
}
