# longlian-oa-frontend

面向汉化组的多租户 OA 协作系统前端。二次元轻量风格，解决旧系统任务流固化（仅支持漫画/小说）的技术债务，实现自定义工作流引擎、完整权限体系和美观的用户体验。

支持单租户（无管理端）独立运作，也支持多租户扩展。

> 产品详细需求见 [PRODUCT.md](./PRODUCT.md)，AI Agent 工作规范见 [AGENTS.md](./AGENTS.md)。

---

## 技术栈

| 类别      | 技术                             | 版本   |
| --------- | -------------------------------- | ------ |
| 构建工具  | Vite Plus (`vp`)                 | latest |
| 前端框架  | React                            | 19     |
| 类型系统  | TypeScript                       | 5.9    |
| 样式      | Tailwind CSS                     | v4     |
| UI 组件库 | shadcn/ui                        | latest |
| 路由      | react-router + vite-plugin-pages | 7      |
| Lint      | oxlint（内置于 vp）              | —      |
| Format    | oxfmt（内置于 vp）               | —      |

**重要：** 项目使用 `vp`（Vite Plus）作为统一工具链，禁止直接使用 `pnpm` / `npm` / `npx`。

---

## 快速开始

```bash
# 1. 克隆项目
git clone https://github.com/longlian-online/longlian-oa-frontend
cd longlian-oa-frontend

# 2. 安装依赖（会自动激活 Git Hooks）
pnpm install

# 3. 安装项目依赖的 AI Skills
npx skills install

# 4. 启动开发服务器
vp dev
```

---

## 常用命令

| 命令                                   | 说明                                         |
| -------------------------------------- | -------------------------------------------- |
| `vp dev`                               | 启动开发服务器                               |
| `vp build`                             | 构建生产产物                                 |
| `vp check`                             | 格式 + lint + 类型检查（三合一，提交前必跑） |
| `vp fmt src --write`                   | 格式化 src 下所有文件                        |
| `vp lint src`                          | 仅执行 lint                                  |
| `vp add <pkg>`                         | 安装依赖（替代 pnpm add）                    |
| `vp dlx shadcn@latest add <component>` | 安装 shadcn/ui 组件                          |

---

## 目录结构

```
src/
├── main.tsx                  # 入口：主题初始化 + BrowserRouter + useRoutes
├── index.css                 # 全局样式：Tailwind + 主题变量 import
├── pages/                    # 页面（文件即路由，无需手动注册）
│   ├── index.tsx             # → /
│   ├── dashboard.tsx         # → /dashboard
│   ├── settings.tsx          # → /settings
│   ├── about.tsx             # → /about
│   └── theme-preview.tsx     # → /theme-preview（主题配色预览）
├── components/
│   ├── ui/                   # shadcn/ui 原始组件（不直接修改）
│   └── theme/
│       └── ThemeToggle.tsx   # 亮/暗模式切换按钮
├── hooks/
│   └── useIsDarkTheme.ts     # 监听 html.dark 类的 Hook
├── lib/
│   └── utils.ts              # cn() 工具函数
└── styles/
    └── theme/
        ├── shadcn.css        # shadcn 语义色变量（亮/暗双套）
        ├── index.css         # 品牌渐变、具名色、状态色等自定义变量
        └── theme-transition.css  # 主题切换 View Transitions 动画
```

---

## 路由规范

基于 `vite-plugin-pages` 自动扫描 `src/pages/`，**新增页面只需创建文件**：

| 文件路径                        | 对应路由     |
| ------------------------------- | ------------ |
| `src/pages/index.tsx`           | `/`          |
| `src/pages/login.tsx`           | `/login`     |
| `src/pages/user/[id].tsx`       | `/user/:id`  |
| `src/pages/dashboard/index.tsx` | `/dashboard` |

禁止在 `main.tsx` 手动注册 `<Route>`。

---

## 主题系统

### 两个独立维度

| 维度      | 切换方式                                   | 存储                          |
| --------- | ------------------------------------------ | ----------------------------- |
| 亮/暗模式 | `<html>` 加/移除 `.dark` 类                | `localStorage("theme")`       |
| 颜色主题  | `<html>` 设置 `data-color-theme="pink"` 等 | `localStorage("color-theme")` |

两者完全独立，可以任意组合（如：暗色 + 粉色主题）。

### 默认主题：Monochrome（黑白）

不设置 `data-color-theme` 时，使用纯黑白无彩色主题。颜色主题作为可选叠加层。

### 配色文件结构

- `src/styles/theme/shadcn.css` — shadcn 语义变量（`--background`、`--foreground`、`--primary` 等），亮/暗双套，与颜色主题无关
- `src/styles/theme/index.css` — 多主题颜色系统：
  - `--theme-accent-*` — 当前颜色主题的品牌色（渐变、实色、透明版），通过 `[data-color-theme="xxx"]` 选择器覆盖
  - 背景渐变、状态色（info/success/warning/danger）、具名语义色
- `src/styles/theme/theme-transition.css` — View Transitions 切换动画

### 新增颜色主题

在 `src/styles/theme/index.css` 中添加对应选择器：

```css
[data-color-theme="blue"] {
  --theme-accent-start: #3b82f6;
  --theme-accent-end: #1d4ed8;
  --theme-accent-gradient: linear-gradient(
    279deg,
    var(--theme-accent-start) 0%,
    var(--theme-accent-end) 100%
  );
  --theme-accent-solid: #2563eb;
  --theme-accent-solid-a3: rgba(37, 99, 235, 0.3);
}
```

### 在代码中使用主题色

```tsx
// 品牌渐变（跟随颜色主题）
<div style={{ background: "var(--theme-accent-gradient)" }} />

// 品牌实色
<div style={{ color: "var(--theme-accent-solid)" }} />

// shadcn 语义色（推荐用 Tailwind class）
<div className="bg-background text-foreground" />
<div className="bg-primary text-primary-foreground" />
```

访问 `/theme-preview` 可查看所有配色的可视化预览，并支持实时切换颜色主题。

### 样式规范

- 只用 Tailwind CSS utility class + `cn()` 合并类名
- 不写独立 CSS 文件，不用内联 `style`（CSS 变量引用除外）
- 颜色统一使用 CSS 变量或 Tailwind 语义 class，禁止硬编码 hex/rgb

---

## 代码规范

### 类型

- 所有函数参数、返回值、组件 Props 必须有明确类型
- 禁止使用 `any`

### 组件

- 函数组件 + Hooks，不用 class 组件
- shadcn/ui 原始组件装在 `src/components/ui/`，不直接修改
- 业务封装组件放 `src/components/<Name>/index.tsx`

### 新增 UI 组件

```bash
vp dlx shadcn@latest add <component>
```

---

## Git 规范

### Commit Message 格式

```
<type>(<scope>): <subject>
```

| type       | 说明                   |
| ---------- | ---------------------- |
| `feat`     | 新功能                 |
| `fix`      | Bug 修复               |
| `upd`      | 更新/优化已有功能      |
| `docs`     | 文档变更               |
| `style`    | 代码格式（不影响逻辑） |
| `refactor` | 重构                   |
| `chore`    | 构建/工具/依赖变更     |
| `revert`   | 回滚                   |

示例：`feat(dashboard): add task statistics`、`fix(theme): dark mode not switching`

### Git Hooks（pnpm install 后自动激活）

- **pre-commit**：对暂存的 `.ts/.tsx` 文件自动执行 `vp fmt` + `vp lint`，报错阻断提交
- **commit-msg**：校验 message 格式，不符合阻断提交

### 提交流程

```bash
git add <files>
# pre-commit hook 自动 fmt + lint
git commit -m "feat(xxx): your message"
```

---

## 关联文档

- [PRODUCT.md](./PRODUCT.md) — 产品需求、用户角色、功能模块、UI 原则
- [AGENTS.md](./AGENTS.md) — AI Agent 专用：项目结构、工作规范、禁止行为
