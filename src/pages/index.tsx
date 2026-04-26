import { Link } from "react-router";

const links = [
  { to: "/dashboard", label: "Dashboard", desc: "查看数据概览" },
  { to: "/about", label: "About", desc: "了解我们" },
  { to: "/settings", label: "Settings", desc: "个性化设置" },
  { to: "/theme-preview", label: "Theme Preview", desc: "查看主题配色" },
];

export default function Home() {
  return (
    <div className="bg-background text-foreground flex min-h-svh flex-col items-center justify-center px-6">
      <div className="w-full max-w-md space-y-10">
        <div className="space-y-3">
          <div
            className="inline-block rounded-full px-3 py-1 text-xs font-medium text-white"
            style={{ background: "var(--gradient-pink)" }}
          >
            OA 系统
          </div>
          <h1 className="text-foreground text-4xl font-bold tracking-tight">欢迎回来</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">选择一个功能模块开始工作</p>
        </div>

        <nav className="space-y-3">
          {links.map(({ to, label, desc }) => (
            <Link
              key={to}
              to={to}
              className="border-border bg-card text-card-foreground hover:border-primary/40 group flex items-center justify-between rounded-xl border px-5 py-4 transition-all duration-200 hover:shadow-sm"
            >
              <div>
                <div className="text-foreground font-medium">{label}</div>
                <div className="text-muted-foreground mt-0.5 text-xs">{desc}</div>
              </div>
              <span className="text-primary opacity-0 transition-opacity group-hover:opacity-100">
                →
              </span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
