import { Link } from "react-router";
import ThemeToggle from "../components/theme/ThemeToggle";
import { useIsDarkTheme } from "../hooks/useIsDarkTheme";

export default function Settings() {
  const isDark = useIsDarkTheme();

  return (
    <div className="bg-background text-foreground min-h-svh px-6 py-12">
      <div className="mx-auto w-full max-w-md space-y-10">
        <div className="space-y-1">
          <Link
            to="/"
            className="text-muted-foreground hover:text-primary inline-flex items-center gap-1.5 text-sm transition-colors"
          >
            ← 返回首页
          </Link>
          <h1 className="text-foreground text-3xl font-bold tracking-tight">设置</h1>
        </div>

        <div className="space-y-3">
          <h2 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
            外观
          </h2>
          <div className="border-border bg-card flex items-center justify-between rounded-xl border px-5 py-4">
            <div>
              <div className="text-foreground text-sm font-medium">主题模式</div>
              <div className="text-muted-foreground mt-0.5 text-xs">
                当前：{isDark ? "深色" : "浅色"}
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
            账户
          </h2>
          {[
            { label: "语言", value: "简体中文" },
            { label: "时区", value: "UTC+8 北京" },
            { label: "通知", value: "已开启" },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="border-border bg-card flex items-center justify-between rounded-xl border px-5 py-4"
            >
              <span className="text-foreground text-sm">{label}</span>
              <span className="text-muted-foreground text-sm">{value}</span>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <h2 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
            配色预览
          </h2>
          <div className="border-border bg-card space-y-3 rounded-xl border px-5 py-4">
            <div className="flex gap-2">
              {[
                { bg: "var(--gradient-pink)", label: "Brand" },
                { bg: "hsl(var(--primary))", label: "Primary" },
                { bg: "hsl(var(--muted))", label: "Muted" },
                { bg: "hsl(var(--destructive))", label: "Danger" },
              ].map(({ bg, label }) => (
                <div key={label} className="flex-1 space-y-1.5">
                  <div className="h-8 w-full rounded-md" style={{ background: bg }} />
                  <div className="text-muted-foreground text-center text-xs">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
