import { useRef, useState, type ChangeEvent } from "react";
import { Bell, Check, LogOut, Pencil, Plus, UserRound } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router";

import { logout } from "@/api/auth";
import { getInviteInfo, joinOrganizationByInvite, updateMyInfo } from "@/api/user";
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
import { useTheme } from "@/hooks/useTheme";
import { useUploadFile } from "@/hooks/useUploadFile";
import { showApiError } from "@/lib/apiError";
import { clearSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import type { InviteInfoVO } from "@/types/auth";
import OrganizationIdentity from "./OrganizationIdentity";

const subMenus: Record<string, { to: string; label: string; adminOnly?: boolean }[]> = {
  "/dashboard/planning": [
    { to: "/dashboard/planning", label: "浏览" },
    { to: "/dashboard/workshop", label: "工坊" },
    { to: "/dashboard/org-admin", label: "管理", adminOnly: true },
  ],
  "/dashboard/org-admin": [
    { to: "/dashboard/org-admin/projects", label: "企划" },
    { to: "/dashboard/org-admin/project-types", label: "企划类型" },
    { to: "/dashboard/org-admin/members", label: "成员" },
    { to: "/dashboard/org-admin/applications", label: "入组申请" },
    { to: "/dashboard/org-admin/invites", label: "组织邀请" },
    { to: "/dashboard/org-admin/tasks", label: "原子任务" },
    { to: "/dashboard/org-admin/workflows", label: "工作流" },
    { to: "/dashboard/org-admin/settings", label: "组织设置" },
  ],
};

const themeOptions = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "pink", label: "Pink" },
] as const;

function isSubMenuActive(pathname: string, targetPath: string): boolean {
  return pathname === targetPath || pathname.startsWith(`${targetPath}/`);
}

export default function AppHeader() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, roles, refresh } = useCurrentUser();
  const { theme, setTheme } = useTheme();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const { uploading: isUploadingAvatar, uploadFile } = useUploadFile();
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isInviteConfirmOpen, setIsInviteConfirmOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [inviteInfo, setInviteInfo] = useState<InviteInfoVO | null>(null);
  const [isLoadingInviteInfo, setIsLoadingInviteInfo] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const section = pathname.startsWith("/dashboard/org-admin")
    ? "/dashboard/org-admin"
    : pathname.startsWith("/dashboard/workshop")
      ? "/dashboard/planning"
      : "/" + pathname.split("/").slice(1, 3).join("/");
  const isWorkshop = pathname.startsWith("/dashboard/workshop");
  const items =
    section === "/dashboard/org-admin" && !roles.includes("ORG_ADMIN")
      ? []
      : (subMenus[section] ?? []);

  const handleJoinOrganization = async (): Promise<void> => {
    const normalizedInviteCode = inviteCode.trim();
    if (!normalizedInviteCode) {
      $tip("请输入邀请码", "error");
      return;
    }

    setIsLoadingInviteInfo(true);
    try {
      const result = await getInviteInfo(normalizedInviteCode);
      setInviteInfo(result);
      setIsJoinOpen(false);
      setIsInviteConfirmOpen(true);
    } catch (error) {
      showApiError(error, "邀请码查询失败");
    } finally {
      setIsLoadingInviteInfo(false);
    }
  };

  const handleConfirmJoinOrganization = async (): Promise<void> => {
    if (!inviteInfo || !inviteCode.trim()) return;

    setIsJoining(true);
    try {
      await joinOrganizationByInvite({ inviteCode: inviteCode.trim() });
      $tip("已加入组织", "success");
      setInviteCode("");
      setInviteInfo(null);
      setIsInviteConfirmOpen(false);
    } catch (error) {
      showApiError(error, "加入组织失败");
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
      showApiError(error, "退出登录失败");
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
      <div className="min-w-0">{isWorkshop && <OrganizationIdentity />}</div>

      <nav className="flex items-center gap-1">
        {items
          .filter((item) => !item.adminOnly || roles.includes("ORG_ADMIN"))
          .map(({ to, label }) => (
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
            <div className="px-2 py-2">
              <div className="mb-1.5 text-xs text-muted-foreground">主题</div>
              <div className="grid grid-cols-3 gap-1">
                {themeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={cn(
                      "flex items-center justify-center gap-1 rounded-md px-1.5 py-1.5 text-xs transition-colors",
                      theme === option.value
                        ? "bg-secondary font-medium text-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                    onClick={() => setTheme(option.value)}
                  >
                    {theme === option.value && <Check className="h-3 w-3" />}
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
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
            <Button onClick={handleJoinOrganization} disabled={isJoining || isLoadingInviteInfo}>
              {isLoadingInviteInfo ? "查询中..." : "下一步"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isInviteConfirmOpen}
        onOpenChange={(open) => {
          setIsInviteConfirmOpen(open);
          if (!open) setInviteInfo(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认加入组织</DialogTitle>
            <DialogDescription>请确认邀请码对应的组织信息。</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
            <div>
              <p className="text-xs text-muted-foreground">组织名称</p>
              <p className="mt-1 text-base font-semibold text-foreground">
                {inviteInfo?.orgName ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">组织 ID</p>
              <p className="mt-1 break-all text-sm text-foreground">{inviteInfo?.orgId ?? "—"}</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsInviteConfirmOpen(false);
                setIsJoinOpen(true);
              }}
            >
              返回修改
            </Button>
            <Button onClick={() => void handleConfirmJoinOrganization()} disabled={isJoining}>
              {isJoining ? "加入中..." : "确认加入"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
