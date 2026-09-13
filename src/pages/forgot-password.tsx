import { useState } from "react";
import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Layers, Mail } from "lucide-react";

import { resetPassword, sendVerificationCode } from "@/api/auth";
import { $tip } from "@/components/tip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const forgotPasswordSchema = z
  .object({
    email: z.string().email("请输入有效的邮箱地址"),
    code: z.string().regex(/^[a-zA-Z0-9]{6}$/, "请输入 6 位验证码"),
    password: z.string().min(6, "密码至少 6 位").max(20, "密码最多 20 位"),
    confirmPassword: z.string().min(1, "请再次输入新密码"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
  });

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [isSending, setIsSending] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [hasSent, setHasSent] = useState(false);

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
      code: "",
      password: "",
      confirmPassword: "",
    },
  });

  const handleSendCode = async (): Promise<void> => {
    const isEmailValid = await form.trigger("email");
    if (!isEmailValid) return;

    setIsSending(true);
    try {
      await sendVerificationCode({
        email: form.getValues("email"),
        businessType: "FORGOT_PASSWORD",
      });
      setHasSent(true);
      $tip("验证码已发送", "success");
    } catch (error) {
      $tip(error instanceof Error ? error.message : "发送验证码失败", "error");
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = async (data: ForgotPasswordFormData): Promise<void> => {
    setIsResetting(true);
    try {
      await resetPassword({
        email: data.email,
        code: data.code.toUpperCase(),
        password: data.password,
      });
      $tip("密码已重置，请使用新密码登录", "success");
      void navigate("/login", { replace: true });
    } catch (error) {
      $tip(error instanceof Error ? error.message : "重置密码失败", "error");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-[380px]">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Layers className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">找回密码</h1>
          <p className="mt-1 text-sm text-muted-foreground">验证邮箱后设置新的登录密码</p>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs text-muted-foreground">
                邮箱
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="请输入邮箱"
                  className="h-11 pl-10"
                  {...form.register("email")}
                />
              </div>
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="code" className="text-xs text-muted-foreground">
                  验证码
                </Label>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto px-0 text-xs"
                  disabled={isSending}
                  onClick={() => void handleSendCode()}
                >
                  {isSending ? "发送中..." : hasSent ? "重新发送" : "发送验证码"}
                </Button>
              </div>
              <Input
                id="code"
                placeholder="请输入 6 位验证码"
                maxLength={6}
                className="h-11 uppercase"
                {...form.register("code")}
              />
              {form.formState.errors.code && (
                <p className="text-xs text-destructive">{form.formState.errors.code.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs text-muted-foreground">
                新密码
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="6 至 20 位密码"
                className="h-11"
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-xs text-muted-foreground">
                确认新密码
              </Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                placeholder="再次输入新密码"
                className="h-11"
                {...form.register("confirmPassword")}
              />
              {form.formState.errors.confirmPassword && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            {hasSent && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-muted-foreground">
                验证码已发送至邮箱，请在有效期内完成重置。
              </div>
            )}

            <Button type="submit" className="h-11 w-full" disabled={isResetting}>
              {isResetting ? "重置中..." : "确认重置密码"}
            </Button>
          </form>

          <Button
            type="button"
            variant="ghost"
            className="mt-4 h-9 w-full"
            onClick={() => void navigate("/login")}
          >
            <ArrowLeft className="h-4 w-4" />
            返回登录
          </Button>
        </div>
      </div>
    </div>
  );
}
