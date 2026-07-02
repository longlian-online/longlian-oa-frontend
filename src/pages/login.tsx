import { useState } from "react";
import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Layers, Mail, User, Lock, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { loginByPassword, loginByCode, sendVerificationCode } from "@/api/auth";
import { $tip } from "@/components/tip";
import { saveSession } from "@/lib/session";
import { cn } from "@/lib/utils";

const passwordSchema = z.object({
  username: z.string().min(1, "请输入用户名"),
  password: z.string().min(1, "请输入密码"),
});

const codeSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  code: z.string().length(6, "验证码为6位数字"),
});

type PasswordFormData = z.infer<typeof passwordSchema>;
type CodeFormData = z.infer<typeof codeSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [activeTab, setActiveTab] = useState<"password" | "code">("password");
  const [tabDirection, setTabDirection] = useState<"left" | "right">("right");

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { username: "", password: "" },
  });

  const codeForm = useForm<CodeFormData>({
    resolver: zodResolver(codeSchema),
    defaultValues: { email: "", code: "" },
  });

  const handleTabChange = (value: string): void => {
    const nextTab = value as "password" | "code";
    setTabDirection(nextTab === "code" ? "right" : "left");
    setActiveTab(nextTab);
  };

  const tabPanelClassName = cn(
    "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300 motion-safe:ease-out motion-reduce:animate-none",
    tabDirection === "right"
      ? "motion-safe:slide-in-from-right-4"
      : "motion-safe:slide-in-from-left-4",
  );

  const onPasswordSubmit = async (data: PasswordFormData) => {
    setIsLoading(true);
    try {
      const result = await loginByPassword(data);
      saveSession(result);
      $tip("登录成功", "success");
      void navigate("/dashboard/planning");
    } catch (error) {
      $tip(error instanceof Error ? error.message : "登录失败", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const onCodeSubmit = async (data: CodeFormData) => {
    setIsLoading(true);
    try {
      const result = await loginByCode(data);
      saveSession(result);
      $tip("登录成功", "success");
      void navigate("/dashboard/planning");
    } catch (error) {
      $tip(error instanceof Error ? error.message : "登录失败", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendCode = async () => {
    const email = codeForm.getValues("email");
    const isValid = await codeForm.trigger("email");
    if (!isValid) return;

    try {
      await sendVerificationCode({ email, businessType: "LOGIN" });
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
    } catch (error) {
      $tip(error instanceof Error ? error.message : "发送验证码失败", "error");
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
          <h1 className="text-xl font-semibold text-foreground">欢迎回来</h1>
          <p className="text-sm text-muted-foreground mt-1">请输入您的账号密码</p>
        </div>

        {/* Login Card */}
        <div className="bg-card rounded-2xl border p-6 shadow-sm">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="password">密码</TabsTrigger>
              <TabsTrigger value="code">邮箱</TabsTrigger>
            </TabsList>

            {/* Password Login */}
            <TabsContent value="password" className={tabPanelClassName}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-xs text-muted-foreground">
                    用户名
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="username"
                      placeholder="请输入用户名"
                      className="pl-10 h-11"
                      {...passwordForm.register("username")}
                    />
                  </div>
                  {passwordForm.formState.errors.username && (
                    <p className="text-xs text-destructive">
                      {passwordForm.formState.errors.username.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs text-muted-foreground">
                    密码
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="请输入密码"
                      className="pl-10 pr-10 h-11"
                      {...passwordForm.register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordForm.formState.errors.password && (
                    <p className="text-xs text-destructive">
                      {passwordForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full h-11 mt-2" disabled={isLoading}>
                  {isLoading ? "登录中..." : "登录"}
                </Button>
                <button
                  type="button"
                  onClick={() => void navigate("/forgot-password")}
                  className="block w-full cursor-pointer text-center text-xs text-muted-foreground hover:text-primary"
                >
                  忘记密码？
                </button>
              </form>
            </TabsContent>

            {/* Code Login */}
            <TabsContent value="code" className={tabPanelClassName}>
              <form onSubmit={codeForm.handleSubmit(onCodeSubmit)} className="space-y-4">
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
                      {...codeForm.register("email")}
                    />
                  </div>
                  {codeForm.formState.errors.email && (
                    <p className="text-xs text-destructive">
                      {codeForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

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
                      {...codeForm.register("code")}
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
                  {codeForm.formState.errors.code && (
                    <p className="text-xs text-destructive">
                      {codeForm.formState.errors.code.message}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full h-11 mt-2" disabled={isLoading}>
                  {isLoading ? "登录中..." : "登录"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="text-center text-sm text-muted-foreground mt-6 pt-4 border-t">
            还没有账号？{" "}
            <button
              type="button"
              onClick={() => void navigate("/register")}
              className="cursor-pointer text-primary hover:underline"
            >
              去注册
            </button>
            <span className="mx-2 text-muted-foreground/60">·</span>
            <button
              type="button"
              onClick={() => void navigate("/admin/login")}
              className="cursor-pointer text-primary hover:underline"
            >
              管理员登录
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
