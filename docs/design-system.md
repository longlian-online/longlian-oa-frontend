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
| `wide`（默认） | `w-full`（自适应铺满）   | 企划广场、工坊、任务大厅、管理后台列表 |
| `content`      | `max-w-[1200px] mx-auto` | 企划详情、发布/编辑表单、设置页        |
| `fluid`        | `w-full`                 | 工作流画布等自由视口页面               |

- **主内容区留白**：中小屏 `px-6 py-6`，大屏 `lg:px-8 lg:py-7`。
- **企划展柜网格**：单卡最小 `20rem`、浏览器足够宽时自动排满最多 **4 列**（`grid-cols-[repeat(auto-fill,minmax(min(100%,max(20rem,calc((100%_-_3rem)_/_4))),1fr))] gap-4`），保留 `aspect-[5/3] min-h-52` 与 `40%` 宽封面比例。

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

---

## 6. 列表页布局与分页底栏规范

所有整页列表（企划广场、任务大厅、工坊列表、组织管理列表、平台管理列表、更新记录）统一遵循以下骨架，避免在大屏或高可视区下底部悬空：

- **高度链与三段骨架**：主布局（`AppLayout` / `AdminLayout`）的 `PageContainer` 与 `PageTransition` 透传 `min-h-full` 弹性列高度；列表页使用 [ListPageLayout](../src/components/ListPageLayout/index.tsx) 组织「顶部筛选栏 → 中部列表区 → 底部底栏」。加载态与空状态在剩余可视区内自然居中。
- **贴底列表底栏**：整页列表调用 [PaginationBar](../src/components/PaginationBar/index.tsx) 时显式传入 `variant="page"` 与对应 `unit`（如 `个企划`、`位成员`、`个模板`）。底栏带发丝级顶边框并自动沉底（内容超出一屏时随页面正常滚动，不遮挡内容）：
  - **多页**：左侧展示 `共 N <unit> · 第 X / Y 页`（`tabular-nums`），右侧展示药丸分页导航。
  - **单页（`total > 0`）**：保留底栏并在左侧展示 `共 N <unit> · 已显示全部`，避免页面底部无收尾。
  - **局部内嵌列表**（如企划详情的成员/项目分页、工坊我的任务列）保持默认 `variant="inline"`，不拉伸占满视口。
- **按页面形态设定默认分页条数**：
  - **管理表格类**：默认 `20` 条（`ORGANIZATION_ADMIN_PAGE_SIZE` / `ADMIN_PAGE_SIZE`）；表格外框保持自然高度，不拉伸空白表体。
  - **4 列卡片网格**（企划列表）：默认 `16` 条（4×4，首页含创建卡保持齐行）。
  - **3 列卡片网格**（工作流模板、原子任务、工坊企划）：默认 `12` 条（3×4）。
  - **折叠分组列表**（任务大厅）：默认 `15` 条，且默认展开首个企划分组以直接呈现可接取任务。
- **真实数据少时的克制原则**：当组织或筛选结果本身条目很少时，依靠贴底底栏与总数收尾稳定视觉重心，不绘制假空白行或无业务意义的填充装饰。
