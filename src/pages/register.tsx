import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Layers, Mail, User, Lock, Eye, EyeOff, Building2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerByInvite, sendVerificationCode } from "@/api/auth";

const registerSchema = z
  .object({
    inviteToken: z.string().min(1, "邀请码不能为空"),
    orgName: z.string().optional(),
    nickname: z.string().max(20, "昵称最多20个字符"),
    username: z.string().min(4, "用户名至少4个字符").max(20, "用户名最多20个字符"),
    email: z.string().email("请输入有效的邮箱地址"),
    code: z.string().length(6, "验证码为6位数字"),
    password: z.string().min(6, "密码至少6个字符").max(20, "密码最多20个字符"),
    confirmPassword: z.string().min(6, "请确认密码"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const defaultInviteToken = searchParams.get("invite") || "";

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      inviteToken: defaultInviteToken,
      orgName: "",
      nickname: "",
      username: "",
      email: "",
      code: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      await registerByInvite(data);
      alert("注册成功！请登录");
      void navigate("/login");
    } catch (error) {
      alert(error instanceof Error ? error.message : "注册失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendCode = async () => {
    const email = form.getValues("email");
    const isValid = await form.trigger("email");
    if (!isValid) return;

    try {
      await sendVerificationCode(email);
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
    } catch (error) {
      alert(error instanceof Error ? error.message : "发送验证码失败");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-[380px]">
        {/* Logo and Title */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4">
            <Layers className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">注册</h1>
        </div>

        {/* Register Card */}
        <div className="bg-card rounded-2xl border p-6 shadow-sm">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* 邀请码 */}
            <div className="space-y-2">
              <Label htmlFor="inviteToken" className="text-xs text-muted-foreground">
                邀请码
              </Label>
              <div className="relative">
                <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="inviteToken"
                  placeholder="请输入邀请码"
                  className="pl-10 h-11"
                  {...form.register("inviteToken")}
                />
              </div>
              {form.formState.errors.inviteToken && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.inviteToken.message}
                </p>
              )}
            </div>

            {/* 组织名称 */}
            <div className="space-y-2">
              <Label htmlFor="orgName" className="text-xs text-muted-foreground">
                组织
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="orgName"
                  placeholder="请输入组织名称（选填）"
                  className="pl-10 h-11"
                  {...form.register("orgName")}
                />
              </div>
            </div>

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
                  placeholder="请输入用户名（4-20字符）"
                  className="pl-10 h-11"
                  {...form.register("username")}
                />
              </div>
              {form.formState.errors.username && (
                <p className="text-xs text-destructive">{form.formState.errors.username.message}</p>
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
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
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
                  placeholder="请输入验证码"
                  className="h-11"
                  maxLength={6}
                  {...form.register("code")}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 px-4 shrink-0"
                  onClick={handleSendCode}
                  disabled={countdown > 0}
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                className="text-primary hover:underline"
              >
                去登录
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
