import { useRef, useState, type ChangeEvent } from "react";
import { Bell, LogOut, Pencil, Plus, UserRound } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router";

import { logout } from "@/api/auth";
import { joinOrganizationByInvite, updateMyInfo } from "@/api/user";
import { $tip } from "@/components/tip";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { useUploadFile } from "@/hooks/useUploadFile";
import { clearSession } from "@/lib/session";
import { cn } from "@/lib/utils";

const subMenus: Record<string, { to: string; label: string }[]> = {
  "/dashboard/planning": [
    { to: "/dashboard/planning", label: "浏览" },
    { to: "/dashboard/workshop", label: "工坊" },
  ],
};

function isSubMenuActive(pathname: string, targetPath: string): boolean {
  return pathname === targetPath || pathname.startsWith(`${targetPath}/`);
}

export default function AppHeader() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, roles, refresh } = useCurrentUser();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const { uploading: isUploadingAvatar, uploadFile } = useUploadFile();
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

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !user) return;

    try {
      const uploadedFile = await uploadFile(file, {
        bizType: "avatar",
        bizId: user.id,
        accept: ["jpg", "jpeg", "png", "gif"],
        maxSize: 5 * 1024 * 1024,
      });
      await updateMyInfo({
        nickname: user.nickname || user.username,
        avatarFileId: uploadedFile.fileId,
      });
      await refresh();
      $tip("头像已更新", "success");
    } catch {
      // 上传和保存失败均由对应请求显示全局提示。
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
            className={() =>
              cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                isSubMenuActive(pathname, to)
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
        <div className="group relative ml-1 border-l border-border pl-3">
          <input
            ref={avatarInputRef}
            type="file"
            className="hidden"
            accept=".jpg,.jpeg,.png,.gif"
            onChange={handleAvatarChange}
          />
          <button
            type="button"
            aria-label="打开个人菜单"
            className="block rounded-full outline-none ring-offset-background transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Avatar>
              <AvatarImage src={user?.avatarUrl} alt="" />
              <AvatarFallback>
                <UserRound className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
          </button>

          <div className="pointer-events-none absolute right-0 top-full z-50 w-56 translate-y-2 rounded-xl border border-border bg-popover p-2 opacity-0 shadow-lg transition-[opacity,transform] duration-200 group-hover:pointer-events-auto group-hover:translate-y-1 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-1 group-focus-within:opacity-100">
            <div className="flex items-center gap-3 px-2 py-2.5">
              <div className="group/avatar-edit relative shrink-0">
                <Avatar size="lg">
                  <AvatarImage src={user?.avatarUrl} alt="" />
                  <AvatarFallback>
                    <UserRound className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  aria-label="更换头像"
                  title="更换头像"
                  disabled={isUploadingAvatar}
                  className="absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full border border-background bg-foreground text-background transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => avatarInputRef.current?.click()}
                >
                  <Pencil className="h-2.5 w-2.5" />
                </button>
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-foreground">
                  {user?.nickname || user?.username || "用户"}
                </div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">
                  {roles.join(" / ") || "MEMBER"}
                </div>
              </div>
            </div>
            <div className="my-1 border-t border-border" />
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
              onClick={() => setIsJoinOpen(true)}
            >
              <Plus className="h-4 w-4" />
              加入组织
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
              disabled={isLoggingOut}
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              退出登录
            </Button>
          </div>
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
    </header>
  );
}
