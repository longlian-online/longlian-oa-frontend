import { Link } from "react-router";

const members = [
  { name: "陈小琳", role: "产品经理", initial: "陈" },
  { name: "李明远", role: "前端开发", initial: "李" },
  { name: "王思雨", role: "UI 设计师", initial: "王" },
];

export default function About() {
  return (
    <div className="bg-background text-foreground flex min-h-svh flex-col items-center justify-center px-6">
      <div className="w-full max-w-md space-y-10">
        <div className="space-y-3">
          <Link
            to="/"
            className="text-muted-foreground hover:text-primary inline-flex items-center gap-1.5 text-sm transition-colors"
          >
            ← 返回首页
          </Link>
          <h1 className="text-foreground text-4xl font-bold tracking-tight">关于我们</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            longlian OA 是一套专为内部团队打造的办公协作平台，聚焦效率与体验。
          </p>
        </div>

        <div className="space-y-3">
          {members.map(({ name, role, initial }) => (
            <div
              key={name}
              className="border-border bg-card flex items-center gap-4 rounded-xl border px-5 py-4"
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                style={{ background: "var(--gradient-pink)" }}
              >
                {initial}
              </div>
              <div>
                <div className="text-foreground text-sm font-medium">{name}</div>
                <div className="text-muted-foreground text-xs">{role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
