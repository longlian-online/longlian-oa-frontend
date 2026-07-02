import { Navigate, useNavigate } from "react-router";
import { ShieldCheck } from "lucide-react";

import { adminLogout } from "@/api/auth";
import { $tip } from "@/components/tip";
import { Button } from "@/components/ui/button";
import { clearAdminSession, getAdminRole, getAdminToken, getAdminUsername } from "@/lib/session";

export default function AdminHomePage() {
  const navigate = useNavigate();
  const token = getAdminToken();
  const username = getAdminUsername();
  const role = getAdminRole();

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  const handleLogout = async (): Promise<void> => {
    try {
      await adminLogout();
      $tip("管理员已退出登录", "success");
    } catch (error) {
      $tip(error instanceof Error ? error.message : "退出登录失败", "error");
    } finally {
      clearAdminSession();
      void navigate("/admin/login", { replace: true });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-xl rounded-2xl border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <ShieldCheck className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">管理端</h1>
            <p className="text-sm text-muted-foreground">
              {username || "管理员"} · {role || "ADMIN"}
            </p>
          </div>
        </div>

        <p className="mb-6 text-sm text-muted-foreground">
          管理端登录已接入，后续组织、管理员和定时任务页面可以继续挂到该入口下。
        </p>

        <Button variant="outline" onClick={handleLogout}>
          退出管理端
        </Button>
      </div>
    </div>
  );
}
