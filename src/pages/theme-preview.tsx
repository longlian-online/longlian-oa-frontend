import { Link } from "react-router";

const shadcnSemantics = [
  { label: "background", var: "--background", desc: "页面背景" },
  { label: "foreground", var: "--foreground", desc: "主文字色" },
  { label: "card", var: "--card", desc: "卡片背景" },
  { label: "primary", var: "--primary", desc: "品牌主色（粉红）" },
  { label: "primary-fg", var: "--primary-foreground", desc: "主色上的文字" },
  { label: "secondary", var: "--secondary", desc: "次级背景" },
  { label: "muted", var: "--muted", desc: "弱化背景" },
  { label: "muted-fg", var: "--muted-foreground", desc: "弱化文字" },
  { label: "accent", var: "--accent", desc: "强调背景" },
  { label: "border", var: "--border", desc: "边框色" },
  { label: "destructive", var: "--destructive", desc: "危险/错误色" },
  { label: "ring", var: "--ring", desc: "焦点环" },
];

const gradients: { label: string; value: string; desc: string }[] = [
  { label: "gradient-pink", value: "var(--gradient-pink)", desc: "品牌粉红渐变 #f96676 → #e91e63" },
  { label: "gradient-bg", value: "var(--gradient-bg)", desc: "页面背景渐变" },
  { label: "gradient-header", value: "var(--gradient-header)", desc: "头部装饰渐变" },
  { label: "gradient-shoka-button", value: "var(--gradient-shoka-button)", desc: "按钮渐变" },
];

const namedColors: { label: string; value: string }[] = [
  { label: "red", value: "var(--color-red)" },
  { label: "pink-text", value: "var(--color-pink-text)" },
  { label: "orange", value: "var(--color-orange)" },
  { label: "yellow", value: "var(--color-yellow)" },
  { label: "green", value: "var(--color-green)" },
  { label: "aqua", value: "var(--color-aqua)" },
  { label: "blue", value: "var(--color-blue)" },
  { label: "purple", value: "var(--color-purple)" },
  { label: "grey", value: "var(--color-grey)" },
];

const statusColors: { label: string; value: string; desc: string }[] = [
  { label: "info", value: "hsl(var(--shoka-info))", desc: "信息" },
  { label: "success", value: "hsl(var(--shoka-success))", desc: "成功" },
  { label: "warning", value: "hsl(var(--shoka-warning))", desc: "警告" },
  { label: "danger", value: "hsl(var(--shoka-danger))", desc: "危险" },
  { label: "default", value: "hsl(var(--shoka-default))", desc: "默认" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Swatch({
  label,
  bg,
  desc,
  textColor,
}: {
  label: string;
  bg: string;
  desc?: string;
  textColor?: string;
}) {
  return (
    <div className="border-border bg-card flex items-center gap-4 rounded-xl border px-4 py-3">
      <div className="h-10 w-10 shrink-0 rounded-lg shadow-sm" style={{ background: bg }} />
      <div className="min-w-0 flex-1">
        <div className="text-foreground font-mono text-sm">{label}</div>
        {desc && <div className="text-muted-foreground mt-0.5 text-xs">{desc}</div>}
      </div>
      {textColor && (
        <div className="text-xs font-mono px-2 py-0.5 rounded" style={{ color: textColor }}>
          Aa
        </div>
      )}
    </div>
  );
}

export default function ThemePreview() {
  return (
    <div className="bg-background text-foreground min-h-svh px-6 py-12">
      <div className="mx-auto w-full max-w-lg space-y-12">
        <div className="space-y-2">
          <Link
            to="/"
            className="text-muted-foreground hover:text-primary inline-flex items-center gap-1.5 text-sm transition-colors"
          >
            ← 返回首页
          </Link>
          <h1 className="text-foreground text-3xl font-bold tracking-tight">主题配色</h1>
          <p className="text-muted-foreground text-sm">
            品牌色：粉红 <span style={{ color: "var(--color-pink-text)" }}>#e91e63</span>，支持亮色
            / 暗色双模式
          </p>
        </div>

        <Section title="shadcn 语义色（亮/暗自动切换）">
          <div className="space-y-2">
            {shadcnSemantics.map(({ label, var: v, desc }) => (
              <Swatch key={label} label={label} bg={`hsl(${v})`} desc={desc} />
            ))}
          </div>
        </Section>

        <Section title="品牌渐变">
          <div className="space-y-2">
            {gradients.map(({ label, value, desc }) => (
              <Swatch key={label} label={label} bg={value} desc={desc} />
            ))}
          </div>
        </Section>

        <Section title="具名语义色（亮/暗自动切换）">
          <div className="grid grid-cols-3 gap-2">
            {namedColors.map(({ label, value }) => (
              <div key={label} className="border-border bg-card rounded-xl border p-3 space-y-2">
                <div className="h-8 w-full rounded-md" style={{ background: value }} />
                <div className="text-foreground font-mono text-xs text-center">{label}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="状态色">
          <div className="space-y-2">
            {statusColors.map(({ label, value, desc }) => (
              <Swatch key={label} label={label} bg={value} desc={desc} />
            ))}
          </div>
        </Section>

        <Section title="排版">
          <div className="border-border bg-card space-y-3 rounded-xl border px-5 py-5">
            <p className="text-foreground text-2xl font-bold">标题 Bold 24px</p>
            <p className="text-foreground text-base font-medium">正文 Medium 16px</p>
            <p className="text-muted-foreground text-sm">辅助文字 14px</p>
            <p className="text-muted-foreground text-xs">说明文字 12px</p>
            <p className="text-primary text-sm font-medium">主色文字 Primary</p>
          </div>
        </Section>

        <Section title="圆角 / 半径">
          <div className="border-border bg-card grid grid-cols-4 gap-3 rounded-xl border px-5 py-5">
            {[
              { label: "sm", cls: "rounded-sm" },
              { label: "md", cls: "rounded-md" },
              { label: "lg", cls: "rounded-lg" },
              { label: "xl", cls: "rounded-xl" },
            ].map(({ label, cls }) => (
              <div key={label} className="space-y-2">
                <div
                  className={`h-10 w-full ${cls}`}
                  style={{ background: "var(--gradient-pink)" }}
                />
                <div className="text-muted-foreground text-center text-xs">{label}</div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
