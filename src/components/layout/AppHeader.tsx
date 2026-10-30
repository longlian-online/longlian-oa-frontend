import { useEffect, useRef, useState, type ChangeEvent, type ReactElement } from "react";
import {
  Check,
  KeyRound,
  LogOut,
  Mail,
  Pencil,
  ScrollText,
  UserPen,
  UserRound,
} from "lucide-react";
import { z } from "zod";
import { Link, useNavigate } from "react-router";

import { nicknameFieldError, normalizeNickname } from "@/lib/nickname";
import { isOrganizationManagerRole } from "@/lib/organizationRole";
import { newPasswordError } from "@/lib/password";
import { getSessionSnapshot } from "@/lib/session";
import { useApiMutation, useApiQuery } from "@/hooks/queries/useApiQuery";
import { logout, sendVerificationCode } from "@/api/auth";
import {
  bindEmail,
  changePassword,
  getInviteInfo,
  joinOrganizationByInvite,
  updateMyInfo,
} from "@/api/user";
import { $tip } from "@/components/tip";
import ThemeToggle from "@/components/theme/ThemeToggle";
import NotificationCenter from "@/components/NotificationCenter";
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
import { Label } from "@/components/ui/label";
import { usePendingPathname } from "@/hooks/usePendingPathname";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTheme } from "@/hooks/useTheme";
import { useUploadFile } from "@/hooks/useUploadFile";
import { clearSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import OrganizationIdentity from "./OrganizationIdentity";

import type { UseOrganizationSwitcherResult } from "@/hooks/useOrganizationSwitcher";

const navigationItems = [
  { to: "/dashboard/planning", label: "广场" },
  { to: "/dashboard/workshop", label: "工坊" },
  { to: "/dashboard/org-admin", label: "管理", adminOnly: true },
];

const ROLE_LABELS: Record<string, string> = {
  ORG_OWNER: "组织所有者",
  ORG_ADMIN: "组织管理",
  ORG_USER: "平台用户",
};

const themeOptions = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "pink", label: "Pink" },
] as const;

function isSubMenuActive(pathname: string, targetPath: string): boolean {
  if (targetPath === "/dashboard/planning" && pathname === "/dashboard/task-plaza") return true;
  return pathname === targetPath || pathname.startsWith(`${targetPath}/`);
}

interface AppHeaderProps {
  switcher: UseOrganizationSwitcherResult;
  onMore: () => void;
}

const bindEmailSchema = z.string().email("请输入有效的邮箱地址");
const bindCodeSchema = z.string().regex(/^[A-Z0-9]{6}$/, "请输入 6 位大写字母或数字验证码");

export default function AppHeader({ switcher, onMore }: AppHeaderProps): ReactElement {
  const pathname = usePendingPathname();
  const navigate = useNavigate();
  const { user, role } = useCurrentUser();
  const { theme, setTheme } = useTheme();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const { uploading: isUploadingAvatar, uploadFile } = useUploadFile();
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isInviteConfirmOpen, setIsInviteConfirmOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [queriedInvite, setQueriedInvite] = useState("");
  const inviteQuery = useApiQuery({
    scope: "account",
    key: ["inviteInfo", queriedInvite],
    queryFn: () => getInviteInfo(queriedInvite),
    enabled: Boolean(queriedInvite),
  });
  const inviteInfo = queriedInvite ? inviteQuery.data : undefined;
  const isLoadingInviteInfo = inviteQuery.isFetching;
  const joinMutation = useApiMutation({
    scope: "account",
    mutationFn: joinOrganizationByInvite,
    invalidate: [["organizations"], ["currentUser"]],
  });
  const isJoining = joinMutation.isPending;
  const logoutMutation = useApiMutation({ scope: "account", mutationFn: logout });
  const isLoggingOut = logoutMutation.isPending;
  const updateProfile = useApiMutation({
    scope: "account",
    mutationFn: updateMyInfo,
    invalidate: [["currentUser"]],
  });
  const [isChangeNicknameOpen, setIsChangeNicknameOpen] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const passwordMutation = useApiMutation({ scope: "account", mutationFn: changePassword });
  const isChangingPassword = passwordMutation.isPending;
  const [isBindEmailOpen, setIsBindEmailOpen] = useState(false);
  const [bindEmailAddress, setBindEmailAddress] = useState("");
  const [bindCode, setBindCode] = useState("");
  const [bindErrors, setBindErrors] = useState<{ email?: string; code?: string }>({});
  const [bindCountdown, setBindCountdown] = useState(0);
  const bindCountdownTimer = useRef<number | undefined>(undefined);
  const sendBindCode = useApiMutation({ scope: "account", mutationFn: sendVerificationCode });
  const bindEmailMutation = useApiMutation({
    scope: "account",
    mutationFn: bindEmail,
    invalidate: [["currentUser"]],
  });
  const isBindingEmail = bindEmailMutation.isPending;
  const bindEmailReady = bindEmailSchema.safeParse(bindEmailAddress).success;

  useEffect(() => {
    return () => {
      clearInterval(bindCountdownTimer.current);
    };
  }, []);

  useEffect((): void => {
    if (
      isJoinOpen &&
      queriedInvite &&
      inviteQuery.isSuccess &&
      inviteQuery.data &&
      !inviteQuery.isFetching
    ) {
      setIsJoinOpen(false);
      setIsInviteConfirmOpen(true);
    }
  }, [isJoinOpen, queriedInvite, inviteQuery.isSuccess, inviteQuery.data, inviteQuery.isFetching]);

  const handleJoinOrganization = async (): Promise<void> => {
    const normalizedInviteCode = inviteCode.trim();
    if (!normalizedInviteCode) {
      $tip("请输入邀请码", "error");
      return;
    }

    if (queriedInvite === normalizedInviteCode) await inviteQuery.refetch();
    else setQueriedInvite(normalizedInviteCode);
  };

  const handleConfirmJoinOrganization = async (): Promise<void> => {
    if (!inviteInfo || !inviteCode.trim()) return;

    try {
      await joinMutation.mutateAsync({ inviteCode: inviteCode.trim() });
      $tip("已加入组织", "success");
      setInviteCode("");
      setQueriedInvite("");
      setIsInviteConfirmOpen(false);
    } catch {
      /* 共享 Mutation 负责提示。 */
    }
  };

  const handleChangePassword = async (): Promise<void> => {
    if (!oldPassword.trim() || !newPassword.trim()) {
      $tip("请输入原密码和新密码", "error");
      return;
    }
    if (oldPassword.length < 6 || oldPassword.length > 20) {
      $tip("密码长度必须在6-20位之间", "error");
      return;
    }
    const newPasswordMessage = newPasswordError(newPassword);
    if (newPasswordMessage) {
      $tip(newPasswordMessage, "error");
      return;
    }

    try {
      await passwordMutation.mutateAsync({ oldPassword, newPassword });
      $tip("密码已修改", "success");
      setOldPassword("");
      setNewPassword("");
      setIsChangePasswordOpen(false);
    } catch {
      /* 共享 Mutation 负责提示。 */
    }
  };

  const openNicknameDialog = (): void => {
    setNicknameDraft(user?.nickname ?? "");
    setNicknameError(null);
    setIsChangeNicknameOpen(true);
  };

  const handleNicknameDialogOpenChange = (open: boolean): void => {
    if (open) {
      openNicknameDialog();
      return;
    }
    setIsChangeNicknameOpen(false);
    setNicknameError(null);
  };

  const handleChangeNickname = async (): Promise<void> => {
    const error = nicknameFieldError(nicknameDraft);
    setNicknameError(error);
    if (error) return;

    try {
      await updateProfile.mutateAsync({ nickname: normalizeNickname(nicknameDraft) });
      $tip("昵称已更新", "success");
      setIsChangeNicknameOpen(false);
    } catch {
      /* 共享 Mutation 负责提示。 */
    }
  };

  const handlePasswordDialogOpenChange = (open: boolean): void => {
    setIsChangePasswordOpen(open);
    if (!open) {
      setOldPassword("");
      setNewPassword("");
    }
  };

  const resetBindEmailForm = (): void => {
    clearInterval(bindCountdownTimer.current);
    bindCountdownTimer.current = undefined;
    setBindEmailAddress("");
    setBindCode("");
    setBindErrors({});
    setBindCountdown(0);
  };

  const handleBindDialogOpenChange = (open: boolean): void => {
    setIsBindEmailOpen(open);
    if (!open) resetBindEmailForm();
  };

  const handleSendBindCode = async (): Promise<void> => {
    const parsed = bindEmailSchema.safeParse(bindEmailAddress);
    if (!parsed.success) {
      setBindErrors((current) => ({
        ...current,
        email: parsed.error.issues[0]?.message ?? "请输入有效的邮箱地址",
      }));
      return;
    }
    try {
      await sendBindCode.mutateAsync({ email: parsed.data, businessType: "BIND_EMAIL" });
    } catch {
      return;
    }
    $tip("验证码已发送", "success");
    setBindErrors((current) => ({ ...current, email: undefined }));
    clearInterval(bindCountdownTimer.current);
    setBindCountdown(60);
    bindCountdownTimer.current = window.setInterval(() => {
      setBindCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(bindCountdownTimer.current);
          bindCountdownTimer.current = undefined;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleBindEmail = async (): Promise<void> => {
    const parsedEmail = bindEmailSchema.safeParse(bindEmailAddress);
    const parsedCode = bindCodeSchema.safeParse(bindCode);
    if (!parsedEmail.success || !parsedCode.success) {
      setBindErrors({
        email: parsedEmail.success ? undefined : parsedEmail.error.issues[0]?.message,
        code: parsedCode.success ? undefined : parsedCode.error.issues[0]?.message,
      });
      return;
    }
    try {
      await bindEmailMutation.mutateAsync({ email: parsedEmail.data, code: parsedCode.data });
    } catch {
      return;
    }
    $tip("邮箱已绑定", "success");
    setIsBindEmailOpen(false);
    resetBindEmailForm();
  };

  const handleLogout = async (): Promise<void> => {
    const started = getSessionSnapshot();
    try {
      await logoutMutation.mutateAsync();
      $tip("已退出登录", "success");
    } catch {
      /* 全局处理退出失败。 */
    } finally {
      if (getSessionSnapshot().appScope === started.appScope) {
        clearSession();
        void navigate("/login", { replace: true });
      }
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
        accept: ["jpg", "jpeg", "png", "gif", "avif"],
        maxSize: 5 * 1024 * 1024,
      });
      await updateProfile.mutateAsync({
        nickname: user.nickname || user.username,
        avatarFileId: uploadedFile.fileId,
      });
      $tip("头像已更新", "success");
    } catch {
      // 上传和保存失败均由对应请求显示全局提示。
    }
  };

  return (
    <header className="border-border bg-sidebar grid h-14 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center border-b px-4">
      <div className="min-w-0">
        <OrganizationIdentity
          switcher={switcher}
          onMore={onMore}
          onJoin={() => {
            setQueriedInvite("");
            setIsJoinOpen(true);
          }}
        />
      </div>

      <nav aria-label="主导航" className="flex items-center gap-1">
        {navigationItems
          .filter((item) => !item.adminOnly || isOrganizationManagerRole(role))
          .map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              aria-current={isSubMenuActive(pathname, to) ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                isSubMenuActive(pathname, to)
                  ? "bg-secondary text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </Link>
          ))}
      </nav>

      <div className="flex items-center justify-end gap-1">
        <ThemeToggle />
        <NotificationCenter />
        <div className="group relative ml-1 border-l border-border pl-3">
          <input
            ref={avatarInputRef}
            type="file"
            className="hidden"
            accept=".jpg,.jpeg,.png,.gif,.avif"
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
                  disabled={isUploadingAvatar || updateProfile.isPending}
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
                  {(role ? (ROLE_LABELS[role.toUpperCase()] ?? role) : "") || "平台用户"}
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
            {user && !user.email?.trim() ? (
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
                onClick={() => setIsBindEmailOpen(true)}
              >
                <Mail className="h-4 w-4" />
                绑定邮箱
              </Button>
            ) : null}
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
              onClick={openNicknameDialog}
            >
              <UserPen className="h-4 w-4" />
              修改昵称
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
              onClick={() => void navigate("/dashboard/updates")}
            >
              <ScrollText className="h-4 w-4" />
              更新记录
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
              onClick={() => setIsChangePasswordOpen(true)}
            >
              <KeyRound className="h-4 w-4" />
              修改密码
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
            onChange={(event) => {
              setInviteCode(event.target.value);
              setQueriedInvite("");
            }}
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
          if (!open) setQueriedInvite("");
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

      <Dialog open={isChangeNicknameOpen} onOpenChange={handleNicknameDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>修改</DialogTitle>
            <DialogDescription>最多 20 个字符。</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="nickname">昵称</Label>
            <Input
              id="nickname"
              value={nicknameDraft}
              autoComplete="nickname"
              aria-invalid={Boolean(nicknameError)}
              aria-describedby={nicknameError ? "nickname-error" : undefined}
              onChange={(event) => {
                const next = event.target.value;
                setNicknameDraft(next);
                if (nicknameError) setNicknameError(nicknameFieldError(next));
              }}
            />
            {nicknameError ? (
              <p id="nickname-error" className="text-xs text-destructive">
                {nicknameError}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleNicknameDialogOpenChange(false)}
              disabled={updateProfile.isPending}
            >
              取消
            </Button>
            <Button
              onClick={() => void handleChangeNickname()}
              disabled={updateProfile.isPending || isUploadingAvatar}
            >
              {updateProfile.isPending ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isChangePasswordOpen} onOpenChange={handlePasswordDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>修改密码</DialogTitle>
            <DialogDescription>
              输入原密码后设置新的登录密码。新密码为 6-20 位，且同时包含大写字母、小写字母和数字。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="old-password">原密码</Label>
              <Input
                id="old-password"
                type="password"
                value={oldPassword}
                autoComplete="current-password"
                onChange={(event) => setOldPassword(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">新密码</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                autoComplete="new-password"
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handlePasswordDialogOpenChange(false)}
              disabled={isChangingPassword}
            >
              取消
            </Button>
            <Button onClick={() => void handleChangePassword()} disabled={isChangingPassword}>
              {isChangingPassword ? "修改中..." : "修改密码"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBindEmailOpen} onOpenChange={handleBindDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>绑定邮箱</DialogTitle>
            <DialogDescription>
              验证邮箱后即可使用验证码登录和找回密码。不绑定也可以继续使用。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bind-email">邮箱</Label>
              <Input
                id="bind-email"
                type="email"
                value={bindEmailAddress}
                autoComplete="email"
                onChange={(event) => {
                  setBindEmailAddress(event.target.value);
                  setBindErrors((current) => ({ ...current, email: undefined }));
                }}
              />
              {bindErrors.email ? (
                <p className="text-xs text-destructive">{bindErrors.email}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="bind-code">验证码</Label>
              <div className="flex gap-2">
                <Input
                  id="bind-code"
                  value={bindCode}
                  maxLength={6}
                  autoComplete="one-time-code"
                  placeholder="请输入 6 位大写字母或数字验证码"
                  onChange={(event) => {
                    setBindCode(event.target.value.toUpperCase());
                    setBindErrors((current) => ({ ...current, code: undefined }));
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleSendBindCode()}
                  disabled={!bindEmailReady || bindCountdown > 0 || sendBindCode.isPending}
                >
                  {bindCountdown > 0 ? `${bindCountdown}s` : "发送"}
                </Button>
              </div>
              {bindErrors.code ? (
                <p className="text-xs text-destructive">{bindErrors.code}</p>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleBindDialogOpenChange(false)}
              disabled={isBindingEmail}
            >
              取消
            </Button>
            <Button onClick={() => void handleBindEmail()} disabled={isBindingEmail}>
              {isBindingEmail ? "绑定中..." : "绑定邮箱"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
