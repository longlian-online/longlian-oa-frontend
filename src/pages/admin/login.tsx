import { useState } from "react";
import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, Layers, Lock, ShieldCheck, User } from "lucide-react";

import { adminLogin } from "@/api/auth";
import { $tip } from "@/components/tip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveAdminSession } from "@/lib/session";

const adminLoginSchema = z.object({
  username: z.string().min(1, "请输入管理员账号").max(32, "账号最多32个字符"),
  password: z.string().min(6, "密码至少6个字符").max(64, "密码最多64个字符"),
});

type AdminLoginFormData = z.infer<typeof adminLoginSchema>;

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<AdminLoginFormData>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const handleSubmit = async (data: AdminLoginFormData): Promise<void> => {
    setIsLoading(true);
    try {
      const result = await adminLogin(data);
      saveAdminSession(result);
      $tip("管理员登录成功", "success");
      void navigate("/admin", { replace: true });
    } catch (error) {
      $tip(error instanceof Error ? error.message : "管理员登录失败", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-[380px]">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <ShieldCheck className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">管理员登录</h1>
          <p className="mt-1 text-sm text-muted-foreground">进入系统管理端</p>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-username" className="text-xs text-muted-foreground">
                管理员账号
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="admin-username"
                  placeholder="请输入管理员账号"
                  className="h-11 pl-10"
                  {...form.register("username")}
                />
              </div>
              {form.formState.errors.username && (
                <p className="text-xs text-destructive">{form.formState.errors.username.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-password" className="text-xs text-muted-foreground">
                密码
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="请输入密码"
                  className="h-11 pl-10 pr-10"
                  {...form.register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="mt-2 h-11 w-full" disabled={isLoading}>
              {isLoading ? "登录中..." : "登录管理端"}
            </Button>
          </form>

          <div className="mt-6 border-t pt-4 text-center text-sm text-muted-foreground">
            <button
              type="button"
              onClick={() => void navigate("/login")}
              className="inline-flex cursor-pointer items-center gap-1 text-primary hover:underline"
            >
              <Layers className="h-3.5 w-3.5" />
              返回用户端登录
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
