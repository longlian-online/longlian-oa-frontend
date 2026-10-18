import { useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Mail, User, Lock, Eye, EyeOff, Building2, Sparkles } from "lucide-react";

import { useApiMutation, useApiQuery } from "@/hooks/queries/useApiQuery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  registerCreateOrganization,
  registerJoinOrganization,
  sendVerificationCode,
} from "@/api/auth";
import { getInviteInfo } from "@/api/user";
import { $tip } from "@/components/tip";
import { cn } from "@/lib/utils";

type RegisterMode = "join" | "create";

/** 创建组织时邀请码由平台下发，文案与加入组织区分。 */
const INVITE_CODE_LABELS: Record<RegisterMode, string> = {
  join: "邀请码",
  create: "组织邀请码",
};

const registerObjectSchema = z.object({
  inviteCode: z.string().min(1, `${INVITE_CODE_LABELS.join}不能为空`),
  orgName: z.string().optional(),
  nickname: z
    .string()
    .max(20, "昵称最多20个字符")
    .refine((value) => value.trim().length > 0, "昵称不能为空"),
  username: z
    .string()
    .min(4, "用户名至少4个字符")
    .max(20, "用户名最多20个字符")
    .regex(/^[A-Za-z_]+$/, "用户名只能包含英文字母和下划线"),
  email: z.string().email("请输入有效的邮箱地址"),
  code: z.string().regex(/^[A-Z0-9]{6}$/, "请输入 6 位大写字母或数字验证码"),
  password: z.string().min(6, "密码至少6个字符").max(20, "密码最多20个字符"),
  confirmPassword: z.string().min(6, "请确认密码"),
});

const joinOrganizationSchema = registerObjectSchema.refine(
  (data) => data.password === data.confirmPassword,
  { message: "两次输入的密码不一致", path: ["confirmPassword"] },
);

const createOrganizationSchema = registerObjectSchema
  .extend({ inviteCode: z.string().min(1, `${INVITE_CODE_LABELS.create}不能为空`) })
  .refine((data) => data.password === data.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
  });

const joinOrganizationResolver = zodResolver(joinOrganizationSchema);
const createOrganizationResolver = zodResolver(createOrganizationSchema);

type RegisterFormData = z.infer<typeof registerObjectSchema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const createOrg = useApiMutation({ scope: "public", mutationFn: registerCreateOrganization });
  const joinOrg = useApiMutation({ scope: "public", mutationFn: registerJoinOrganization });
  const sendCode = useApiMutation({ scope: "public", mutationFn: sendVerificationCode });
  const isLoading = createOrg.isPending || joinOrg.isPending;
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [mode, setMode] = useState<RegisterMode>("join");
  const [isJoinSubmitted, setIsJoinSubmitted] = useState(false);
  // react-hook-form 只在首次渲染捕获 resolver，校验时通过 ref 判断当前模式。
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const [modeDirection, setModeDirection] = useState<"left" | "right">("right");
  const [queriedInvite, setQueriedInvite] = useState("");
  const inviteQuery = useApiQuery({
    scope: "public",
    key: ["inviteInfo", queriedInvite],
    queryFn: () => getInviteInfo(queriedInvite),
    enabled: Boolean(queriedInvite),
  });
  const inviteInfo = queriedInvite ? inviteQuery.data : undefined;
  const isInviteLoading = inviteQuery.isFetching;

  const defaultInviteCode = searchParams.get("invite") || searchParams.get("inviteCode") || "";

  const form = useForm<RegisterFormData>({
    resolver: async (values, context, options) => {
      const resolver =
        modeRef.current === "create" ? createOrganizationResolver : joinOrganizationResolver;
      return resolver(values, context, options);
    },
    defaultValues: {
      inviteCode: defaultInviteCode,
      orgName: "",
      nickname: "",
      username: "",
      email: "",
      code: "",
      password: "",
      confirmPassword: "",
    },
  });

  const handleModeChange = (value: string): void => {
    const nextMode = value as RegisterMode;
    setModeDirection(nextMode === "create" ? "right" : "left");
    setMode(nextMode);
    setQueriedInvite("");
    form.clearErrors("inviteCode");
  };

  const modePanelClassName = cn(
    "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300 motion-safe:ease-out motion-reduce:animate-none",
    modeDirection === "right"
      ? "motion-safe:slide-in-from-right-4"
      : "motion-safe:slide-in-from-left-4",
  );

  const onSubmit = async (data: RegisterFormData) => {
    try {
      if (mode === "create") {
        await createOrg.mutateAsync(data);
        $tip("注册成功，请登录", "success");
        void navigate("/login");
      } else {
        await joinOrg.mutateAsync(data);
        setIsJoinSubmitted(true);
      }
    } catch {
      /* 共享 Mutation 负责错误提示。 */
    }
  };

  const handleQueryInviteInfo = async (): Promise<void> => {
    if (mode !== "join") return;

    const isValid = await form.trigger("inviteCode");
    if (!isValid) return;

    const code = form.getValues("inviteCode").trim();
    if (queriedInvite === code) await inviteQuery.refetch();
    else setQueriedInvite(code);
  };

  const handleSendCode = async () => {
    const email = form.getValues("email");
    const isValid = await form.trigger("email");
    if (!isValid) return;

    try {
      await sendCode.mutateAsync({ email, businessType: "REGISTER" });
    } catch {
      return;
    }
    $tip("验证码已发送", "success");
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-[380px]">
        {/* Logo and Title */}
        <div className="flex flex-col items-center mb-8">
          <img
            src="/logo-full.webp"
            alt="白箱"
            width={48}
            height={48}
            className="mb-4 h-12 w-12 object-contain"
          />
          <h1 className="text-xl font-semibold text-foreground">注册</h1>
        </div>

        {/* Register Card */}
        <div className="bg-card rounded-2xl border p-6 shadow-sm">
          {isJoinSubmitted ? (
            <div role="status" className="space-y-3 text-center">
              <h2 className="text-lg font-semibold text-foreground">申请已提交，等待审核</h2>
              <p className="text-sm text-muted-foreground">请等待组织管理员审核，通过后再登录。</p>
            </div>
          ) : (
            <>
              <Tabs value={mode} onValueChange={handleModeChange}>
                <TabsList className="mb-6 grid w-full grid-cols-2">
                  <TabsTrigger value="join">加入组织</TabsTrigger>
                  <TabsTrigger value="create">创建组织</TabsTrigger>
                </TabsList>
              </Tabs>
              <form
                key={mode}
                onSubmit={form.handleSubmit(onSubmit)}
                className={cn("space-y-4", modePanelClassName)}
              >
                {/* 邀请码 */}
                <div className="space-y-2">
                  <Label htmlFor="inviteCode" className="text-xs text-muted-foreground">
                    {INVITE_CODE_LABELS[mode]}
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative min-w-0 flex-1">
                      <Sparkles className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="inviteCode"
                        placeholder={`请输入${INVITE_CODE_LABELS[mode]}`}
                        className="h-11 pl-10"
                        {...form.register("inviteCode", {
                          onChange: () => setQueriedInvite(""),
                        })}
                      />
                    </div>
                    {mode === "join" && (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 shrink-0 px-3"
                        onClick={handleQueryInviteInfo}
                        disabled={isInviteLoading}
                      >
                        {isInviteLoading ? "查询中" : "查询"}
                      </Button>
                    )}
                  </div>
                  {form.formState.errors.inviteCode && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.inviteCode.message}
                    </p>
                  )}
                  {mode === "join" && inviteInfo && (
                    <p className="text-xs text-muted-foreground">将加入：{inviteInfo.orgName}</p>
                  )}
                </div>

                {/* 组织名称 */}
                {mode === "create" && (
                  <div className="space-y-2">
                    <Label htmlFor="orgName" className="text-xs text-muted-foreground">
                      组织
                    </Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="orgName"
                        placeholder="请输入组织名称"
                        className="h-11 pl-10"
                        {...form.register("orgName")}
                      />
                    </div>
                  </div>
                )}

                {/* 昵称 */}
                <div className="space-y-2">
                  <Label htmlFor="nickname" className="text-xs text-muted-foreground">
                    昵称
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="nickname"
                      placeholder="请输入昵称"
                      className="pl-10 h-11"
                      {...form.register("nickname")}
                    />
                  </div>
                  {form.formState.errors.nickname && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.nickname.message}
                    </p>
                  )}
                </div>

                {/* 用户名 */}
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-xs text-muted-foreground">
                    用户名
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="username"
                      placeholder="4-20位英文字母或下划线"
                      className="pl-10 h-11"
                      {...form.register("username")}
                    />
                  </div>
                  {form.formState.errors.username && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.username.message}
                    </p>
                  )}
                </div>

                {/* 邮箱 */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs text-muted-foreground">
                    邮箱
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="请输入邮箱"
                      className="pl-10 h-11"
                      {...form.register("email")}
                    />
                  </div>
                  {form.formState.errors.email && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>

                {/* 验证码 */}
                <div className="space-y-2">
                  <Label htmlFor="code" className="text-xs text-muted-foreground">
                    验证码
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="code"
                      placeholder="请输入 6 位大写字母或数字验证码"
                      className="h-11"
                      maxLength={6}
                      {...form.register("code")}
                      onChange={(event) => {
                        event.target.value = event.target.value.toUpperCase();
                        void form.register("code").onChange(event);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 px-4 shrink-0"
                      onClick={handleSendCode}
                      disabled={countdown > 0 || sendCode.isPending}
                    >
                      {countdown > 0 ? `${countdown}s` : "发送"}
                    </Button>
                  </div>
                  {form.formState.errors.code && (
                    <p className="text-xs text-destructive">{form.formState.errors.code.message}</p>
                  )}
                </div>

                {/* 密码 */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs text-muted-foreground">
                    密码
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="请输入密码（6-20字符）"
                      className="pl-10 pr-10 h-11"
                      {...form.register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {form.formState.errors.password && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.password.message}
                    </p>
                  )}
                </div>

                {/* 确认密码 */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-xs text-muted-foreground">
                    确认密码
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="请再次输入密码"
                      className="pl-10 pr-10 h-11"
                      {...form.register("confirmPassword")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {form.formState.errors.confirmPassword && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full h-11 mt-2" disabled={isLoading}>
                  {isLoading ? "注册中..." : "注册"}
                </Button>

                <div className="text-center text-sm text-muted-foreground mt-4">
                  已有账号？{" "}
                  <button
                    type="button"
                    onClick={() => void navigate("/login")}
                    className="cursor-pointer text-primary hover:underline"
                  >
                    去登录
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
