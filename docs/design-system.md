# 「白箱」前端设计系统规范

本规范定义 `longlian-oa-frontend` 的统一视觉语言与布局标准，所有新增与重构页面均应遵循。

---

## 1. 视觉基因

- **纯净画廊质感**：日间与夜间模式使用零色偏的纯黑白灰阶，让漫画、小说、动画等彩色作品封面成为页面焦点。
- **通透多主题**：日间（Light）、夜间（Dark）、粉色（Pink）全部由 [src/styles/theme/shadcn.css](../src/styles/theme/shadcn.css) 中的语义 CSS 变量驱动，**禁止在业务组件中硬编码 `in-[[data-color-theme=pink]]:...` 等主题补丁**。
- **舒展现代圆角**：全局圆角基准 `--radius: 0.875rem`（14px）。主卡片使用 `rounded-2xl`，表单与侧栏菜单使用 `rounded-lg` / `rounded-xl`，搜索框、主导航激活项、分页、轻量下拉与胶囊操作按钮使用 `rounded-full`。

---

## 2. 布局与大屏容器

主布局 [AppLayout.tsx](../src/components/layout/AppLayout.tsx) 内置 [PageContainer.tsx](../src/components/layout/PageContainer.tsx)，按页面类型提供三档容器：

| 档位           | 宽度规则                 | 适用场景                               |
| :------------- | :----------------------- | :------------------------------------- |
| `wide`（默认） | `max-w-[1680px] mx-auto` | 企划广场、工坊、任务大厅、管理后台列表 |
| `content`      | `max-w-[1200px] mx-auto` | 企划详情、发布/编辑表单、设置页        |
| `fluid`        | `w-full`                 | 工作流画布等自由视口页面               |

- **主内容区留白**：中小屏 `px-6 py-6`，大屏 `lg:px-8 lg:py-7`。
- **企划展柜网格**：`grid-cols-1 md:grid-cols-2 xl:grid-cols-3 min-[1720px]:grid-cols-4 gap-5`，保留 `aspect-[5/3] min-h-52` 与 `40%` 宽封面比例。

---

## 3. 字体与排版阶梯

字体栈在 [src/index.css](../src/index.css) 统一定义：英文与数字使用 `Geist Variable`，中文优先系统高清黑体（`PingFang SC` / `Hiragino Sans GB` / `Microsoft YaHei` / `Noto Sans SC`）。

| 层级       | Tailwind 类名建议                             | 用途                   |
| :--------- | :-------------------------------------------- | :--------------------- |
| 页面标题   | `text-xl font-semibold tracking-tight`        | 顶层页面标题           |
| 区块标题   | `text-base font-semibold`                     | 模块/分组标题          |
| 卡片标题   | `text-base font-semibold leading-6`           | 展柜卡片主标题         |
| 正文与导航 | `text-sm`                                     | 常规文本、按钮、导航项 |
| 辅助描述   | `text-[13px] leading-5 text-muted-foreground` | 简介、次要说明         |
| 徽章与微注 | `text-xs` / `text-[11px]`                     | 标签、时间戳、统计数   |

> 所有计数、百分比、分页页码、日期时间必须添加 `tabular-nums`。

---

## 4. 语义色彩 Token

优先使用语义类而非手写色值：

- **三层表面**：`bg-background`（画布） → `bg-sidebar` / `bg-card`（容器） → `bg-popover` / `bg-surface-elevated`（浮层）。
- **柔和强调态**：`bg-accent-soft`、`text-accent-soft-foreground`、`border-accent-soft-border`（用于导航激活态、胶囊切换、轻强调按钮）。
- **统一状态色**：`status-success` / `status-warning` / `status-info` / `status-danger` 及其 `-soft` 柔底变体（用于任务状态点、等待态标签、状态徽章）。

---

## 5. 常用组件模式

- **发丝级半透边框原则**：全局 `--border` 统一使用极低透明度中性色（浅色 `7%` 黑、深色 `8%` 白、粉色 `8.5%` 玫瑰灰），依靠表面明度差与柔阴影建立层级，避免生硬实色粗线或双层嵌套边框。
- **轻盈筛选栏**：搜索框使用 [FilterToolbar](../src/components/FilterToolbar/index.tsx) 的半透胶囊输入；排序与类型下拉保持无边框透明底 + `rounded-full hover:bg-secondary/70`，避免传统后台的厚重边框感。
- **作品封面处理**：封面容器添加 `after:ring-1 after:ring-inset after:ring-foreground/8` 内描边以柔化深色模式下的白底插图；缺图兜底使用 `bg-gradient-to-br from-muted via-muted/80 to-secondary`。
- **卡片表面质感**：`rounded-2xl border border-border bg-card shadow-[0_1px_3px_rgb(0_0_0/0.04)] hover:border-foreground/15 hover:shadow-[0_6px_20px_rgb(0_0_0/0.06)] dark:shadow-none`。
- **工作流卡片节点图**：节点组整体居中、紧凑排布（固定节点宽度 + 柔和短连线，并行数量收拢为节点右下角标），避免节点被拉散。
