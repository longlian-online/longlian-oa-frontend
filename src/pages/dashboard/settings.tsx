import { useEffect, useRef, useState, type ChangeEvent, type ReactElement } from "react";
import { z } from "zod";
import { useNavigate } from "react-router";
import { UserRound } from "lucide-react";

import { sendVerificationCode } from "@/api/auth";
import { bindEmail, changePassword, updateMyInfo } from "@/api/user";
import NotificationPreferences from "@/components/settings/NotificationPreferences";
import OrganizationFileSettings from "@/components/settings/OrganizationFileSettings";
import { $tip } from "@/components/tip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApiMutation } from "@/hooks/queries/useApiQuery";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useUploadFile } from "@/hooks/useUploadFile";
import { nicknameFieldError, normalizeNickname } from "@/lib/nickname";
import { NEW_PASSWORD_HINT, newPasswordError } from "@/lib/password";
import { clearSession, getSessionSnapshot } from "@/lib/session";

const bindEmailSchema = z.string().email("请输入有效的邮箱地址");
const bindCodeSchema = z.string().regex(/^[A-Z0-9]{6}$/, "请输入 6 位大写字母或数字验证码");

export default function PersonalSettingsPage(): ReactElement {
  const navigate = useNavigate();
  const { user, isLoading } = useCurrentUser();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const { uploading: isUploadingAvatar, uploadFile } = useUploadFile();
  const updateProfile = useApiMutation({
    scope: "account",
    mutationFn: updateMyInfo,
    invalidate: [["currentUser"]],
  });
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [editingPassword, setEditingPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const passwordMutation = useApiMutation({ scope: "account", mutationFn: changePassword });
  const [bindingEmail, setBindingEmail] = useState(false);
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
  const bindEmailReady = bindEmailSchema.safeParse(bindEmailAddress).success;
  const emailBound = Boolean(user?.email?.trim());

  useEffect(() => {
    setNicknameDraft(user?.nickname ?? "");
  }, [user?.nickname]);

  useEffect(() => {
    return () => {
      clearInterval(bindCountdownTimer.current);
    };
  }, []);

  const handleChangeNickname = async (): Promise<void> => {
    const error = nicknameFieldError(nicknameDraft);
    setNicknameError(error);
    if (error) return;
    try {
      await updateProfile.mutateAsync({ nickname: normalizeNickname(nicknameDraft) });
    } catch {
      /* 共享 Mutation 负责提示。 */
      return;
    }
    $tip("昵称已更新", "success");
    setEditingNickname(false);
  };

  const handleStartNickname = (): void => {
    setNicknameDraft(user?.nickname ?? "");
    setNicknameError(null);
    setEditingNickname(true);
  };

  const handleCancelNickname = (): void => {
    setNicknameDraft(user?.nickname ?? "");
    setNicknameError(null);
    setEditingNickname(false);
  };

  const handleCancelPassword = (): void => {
    setOldPassword("");
    setNewPassword("");
    setEditingPassword(false);
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
      /* 上传和保存失败均由对应请求显示全局提示。 */
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
    const started = getSessionSnapshot();
    try {
      await passwordMutation.mutateAsync({ oldPassword, newPassword });
    } catch {
      return;
    }
    $tip("密码已修改", "success");
    if (getSessionSnapshot().appScope === started.appScope) {
      clearSession();
      void navigate("/login", { replace: true });
    }
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
    setBindEmailAddress("");
    setBindCode("");
    setBindErrors({});
    setBindingEmail(false);
  };

  const handleCancelBindEmail = (): void => {
    setBindEmailAddress("");
    setBindCode("");
    setBindErrors({});
    setBindingEmail(false);
  };

  if (isLoading || !user) {
    return <p className="text-sm text-muted-foreground">正在加载个人设置</p>;
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">个人设置</h1>

      <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex items-start gap-4">
          <input
            ref={avatarInputRef}
            type="file"
            className="hidden"
            accept=".jpg,.jpeg,.png,.gif,.avif"
            onChange={handleAvatarChange}
          />
          <Avatar size="lg" className="size-14">
            <AvatarImage src={user.avatarUrl} alt="" />
            <AvatarFallback>
              <UserRound className="size-6" />
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            {editingNickname ? (
              <div className="flex flex-col gap-3">
                <Input
                  id="nickname"
                  aria-label="昵称"
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
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => void handleChangeNickname()}
                    disabled={updateProfile.isPending || isUploadingAvatar}
                  >
                    {updateProfile.isPending ? "保存中..." : "保存"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancelNickname}
                    disabled={updateProfile.isPending}
                  >
                    取消
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-base font-medium">
                  {user.nickname?.trim() || "未设置昵称"}
                </span>
                <Button size="sm" variant="outline" onClick={handleStartNickname}>
                  修改昵称
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">用户名 {user.username}</p>
            <p className="flex items-center text-xs text-muted-foreground">
              邮箱 {user.email?.trim() || "未绑定"}
              {emailBound || bindingEmail ? null : (
                <Button
                  size="xs"
                  variant="link"
                  className="ml-1 h-auto p-0 text-xs"
                  onClick={() => setBindingEmail(true)}
                >
                  绑定
                </Button>
              )}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-fit"
              disabled={isUploadingAvatar || updateProfile.isPending}
              onClick={() => avatarInputRef.current?.click()}
            >
              更换头像
            </Button>
          </div>
        </div>
        {!emailBound && bindingEmail ? (
          <div className="flex flex-col gap-3 rounded-lg bg-muted/40 p-3">
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
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => void handleBindEmail()}
                disabled={bindEmailMutation.isPending}
              >
                {bindEmailMutation.isPending ? "绑定中..." : "绑定邮箱"}
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancelBindEmail}>
                取消
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-medium">修改密码</h2>
          {editingPassword ? null : (
            <Button variant="outline" onClick={() => setEditingPassword(true)}>
              修改
            </Button>
          )}
        </div>
        {editingPassword ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              {NEW_PASSWORD_HINT}。修改成功后，全部设备需要重新登录。
            </p>
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
            <div className="flex gap-2">
              <Button
                onClick={() => void handleChangePassword()}
                disabled={passwordMutation.isPending}
              >
                {passwordMutation.isPending ? "修改中..." : "保存"}
              </Button>
              <Button
                variant="ghost"
                onClick={handleCancelPassword}
                disabled={passwordMutation.isPending}
              >
                取消
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        <h2 className="text-base font-medium">通知</h2>
        <NotificationPreferences />
      </section>

      <OrganizationFileSettings />
    </div>
  );
}
