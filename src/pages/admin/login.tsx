import { useState } from "react";
import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff } from "lucide-react";

import { useApiMutation } from "@/hooks/queries/useApiQuery";
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
  const loginMutation = useApiMutation({ scope: "public", mutationFn: adminLogin });
  const isLoading = loginMutation.isPending;
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<AdminLoginFormData>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const handleSubmit = async (data: AdminLoginFormData): Promise<void> => {
    try {
      const result = await loginMutation.mutateAsync(data);
      saveAdminSession(result);
      $tip("管理员登录成功", "success");
      void navigate("/admin", { replace: true });
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
          <h1 className="text-xl font-semibold text-foreground">管理员登录</h1>
        </div>

        <div className="rounded-xl border bg-card p-6">
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-username" className="text-xs text-muted-foreground">
                管理员账号
              </Label>
              <Input
                id="admin-username"
                placeholder="请输入管理员账号"
                {...form.register("username")}
              />
              {form.formState.errors.username && (
                <p className="text-xs text-destructive">{form.formState.errors.username.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-password" className="text-xs text-muted-foreground">
                密码
              </Label>
              <div className="relative">
                <Input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="请输入密码"
                  className="pr-10"
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
              className="cursor-pointer text-primary hover:underline"
            >
              返回用户端登录
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
