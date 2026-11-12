import { useState } from "react";
import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { useApiMutation } from "@/hooks/queries/useApiQuery";
import { resetPassword, sendVerificationCode } from "@/api/auth";
import { NEW_PASSWORD_HINT, newPasswordSchema } from "@/lib/password";
import { $tip } from "@/components/tip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const forgotPasswordSchema = z
  .object({
    email: z.string().email("请输入有效的邮箱地址"),
    code: z.string().regex(/^[A-Z0-9]{6}$/, "请输入 6 位大写字母或数字验证码"),
    password: newPasswordSchema,
    confirmPassword: z.string().min(1, "请再次输入新密码"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
  });

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const sendCode = useApiMutation({ scope: "public", mutationFn: sendVerificationCode });
  const isSending = sendCode.isPending;
  const reset = useApiMutation({ scope: "public", mutationFn: resetPassword });
  const isResetting = reset.isPending;
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

    try {
      await sendCode.mutateAsync({
        email: form.getValues("email"),
        businessType: "FORGOT_PASSWORD",
      });
      setHasSent(true);
      $tip("验证码已发送", "success");
    } catch {
      /* 共享 Mutation 负责错误提示。 */
    }
  };

  const handleSubmit = async (data: ForgotPasswordFormData): Promise<void> => {
    try {
      await reset.mutateAsync({
        email: data.email,
        code: data.code,
        password: data.password,
      });
      $tip("密码已重置，请使用新密码登录", "success");
      void navigate("/login", { replace: true });
    } catch {
      /* 共享 Mutation 负责错误提示。 */
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-[380px]">
        <div className="mb-8 flex flex-col items-center">
          <img
            src="/logo-full.webp"
            alt="白箱"
            width={48}
            height={48}
            className="mb-4 h-12 w-12 object-contain"
          />
          <h1 className="text-xl font-semibold text-foreground">找回密码</h1>
        </div>

        <div className="rounded-xl border bg-card p-6">
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs text-muted-foreground">
                邮箱
              </Label>
              <Input id="email" type="email" placeholder="请输入邮箱" {...form.register("email")} />
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
                placeholder="请输入 6 位大写字母或数字验证码"
                maxLength={6}
                {...form.register("code")}
                onChange={(event) => {
                  event.target.value = event.target.value.toUpperCase();
                  void form.register("code").onChange(event);
                }}
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
                placeholder="6-20位，含大写、小写和数字"
                {...form.register("password")}
              />
              <p className="text-xs text-muted-foreground">{NEW_PASSWORD_HINT}</p>
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
                {...form.register("confirmPassword")}
              />
              {form.formState.errors.confirmPassword && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button type="submit" className="h-11 w-full" disabled={isResetting}>
              {isResetting ? "重置中..." : "确认重置密码"}
            </Button>
          </form>

          <div className="mt-6 border-t pt-4 text-center text-sm text-muted-foreground">
            <button
              type="button"
              onClick={() => void navigate("/login")}
              className="cursor-pointer text-primary hover:underline"
            >
              返回登录
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
