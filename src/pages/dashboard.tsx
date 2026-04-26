import { Link } from "react-router";

const stats = [
  { label: "待处理审批", value: "12", trend: "+3 今日" },
  { label: "已完成任务", value: "48", trend: "本月" },
  { label: "团队成员", value: "9", trend: "在线 5" },
  { label: "未读消息", value: "7", trend: "最新 2h 前" },
];

const activities = [
  { text: "陈小琳 提交了《Q2 规划》审批", time: "10 分钟前" },
  { text: "李明远 完成了「登录页改版」", time: "1 小时前" },
  { text: "王思雨 上传了设计稿 v3", time: "3 小时前" },
];

export default function Dashboard() {
  return (
    <div className="bg-background text-foreground min-h-svh px-6 py-12">
      <div className="mx-auto w-full max-w-xl space-y-10">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Link
              to="/"
              className="text-muted-foreground hover:text-primary inline-flex items-center gap-1.5 text-sm transition-colors"
            >
              ← 返回首页
            </Link>
            <h1 className="text-foreground text-3xl font-bold tracking-tight">Dashboard</h1>
          </div>
          <div
            className="rounded-full px-3 py-1 text-xs font-medium text-white"
            style={{ background: "var(--gradient-pink)" }}
          >
            实时数据
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {stats.map(({ label, value, trend }) => (
            <div key={label} className="border-border bg-card rounded-xl border px-5 py-4">
              <div className="text-muted-foreground text-xs">{label}</div>
              <div className="text-primary mt-1 text-3xl font-bold">{value}</div>
              <div className="text-muted-foreground mt-1 text-xs">{trend}</div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <h2 className="text-foreground text-sm font-semibold">最近动态</h2>
          {activities.map(({ text, time }) => (
            <div
              key={text}
              className="border-border bg-card flex items-start justify-between gap-4 rounded-xl border px-5 py-4"
            >
              <p className="text-foreground text-sm leading-snug">{text}</p>
              <span className="text-muted-foreground shrink-0 text-xs">{time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
