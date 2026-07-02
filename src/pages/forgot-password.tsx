import { useState } from "react";
import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Layers, Mail } from "lucide-react";

import { sendVerificationCode } from "@/api/auth";
import { $tip } from "@/components/tip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const forgotPasswordSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [hasSent, setHasSent] = useState(false);

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const handleSubmit = async (data: ForgotPasswordFormData): Promise<void> => {
    setIsLoading(true);
    try {
      await sendVerificationCode({
        email: data.email,
        businessType: "FORGOT_PASSWORD",
      });
      setHasSent(true);
      $tip("验证码已发送", "success");
    } catch (error) {
      $tip(error instanceof Error ? error.message : "发送验证码失败", "error");
    } finally {
      setIsLoading(false);
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
          <p className="mt-1 text-sm text-muted-foreground">先通过邮箱接收找回密码验证码</p>
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

            {hasSent && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-muted-foreground">
                验证码已发送。当前后端尚未提供重置密码提交接口，暂不能在前端完成改密。
              </div>
            )}

            <Button type="submit" className="h-11 w-full" disabled={isLoading}>
              {isLoading ? "发送中..." : "发送验证码"}
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
