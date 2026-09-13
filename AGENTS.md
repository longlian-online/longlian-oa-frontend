# AGENTS.md

本文件为 AI Agent 提供项目上下文，帮助其准确理解项目结构、规范和工作流。

---

## 项目概述

**longlian-oa-frontend** 是一个 OA 系统前端项目，采用现代化技术栈。

---

## 技术栈

| 类别      | 技术                             | 说明                                 |
| --------- | -------------------------------- | ------------------------------------ |
| 构建工具  | Vite Plus (`vp`)                 | 统一工具链，禁止直接使用 pnpm/npm    |
| 前端框架  | React 19 + TypeScript 5.9        | 函数组件 + Hooks                     |
| 样式      | Tailwind CSS v4                  | 纯 utility class，不写独立 CSS 文件  |
| UI 组件库 | shadcn/ui                        | 组件安装到 `src/components/ui/`      |
| 路由      | react-router + vite-plugin-pages | 文件系统自动路由，无需手动注册       |
| Lint      | oxlint（内置于 vp）              | 替代 ESLint，禁止单独安装 ESLint     |
| Format    | oxfmt（内置于 vp）               | 替代 Prettier，禁止单独安装 Prettier |
| UI 设计   | Impeccable skill                 | 界面设计、视觉优化时使用             |

---

## 目录结构

```
src/
├── main.tsx              # 入口，BrowserRouter + useRoutes
├── index.css             # 全局样式（Tailwind + 主题变量）
├── pages/                # 页面（自动路由）
│   ├── index.tsx         # → /
│   ├── about.tsx         # → /about
│   └── [page]/
│       └── index.tsx     # → /[page]
├── components/
│   ├── ui/               # shadcn/ui 原始组件（不直接修改）
│   └── [Name]/
│       └── index.tsx     # 业务组件封装
├── hooks/                # 自定义 Hook（use 前缀）
├── lib/
│   └── utils.ts          # cn() 等工具函数
└── types/                # 全局类型定义
```

---

## 路由规范

`vite-plugin-pages` 自动扫描 `src/pages/`，**新增页面只需创建文件**：

| 文件                            | 路由         |
| ------------------------------- | ------------ |
| `src/pages/index.tsx`           | `/`          |
| `src/pages/login.tsx`           | `/login`     |
| `src/pages/dashboard/index.tsx` | `/dashboard` |
| `src/pages/user/[id].tsx`       | `/user/:id`  |

禁止在 `main.tsx` 手动注册 `<Route>`。

---

## 开发命令

| 命令                 | 说明                             |
| -------------------- | -------------------------------- |
| `vp dev`             | 启动开发服务器                   |
| `vp build`           | 构建生产产物                     |
| `vp check`           | 格式 + lint + 类型检查（三合一） |
| `vp lint src`        | 仅 lint                          |
| `vp fmt src --write` | 仅格式化并写入                   |
| `vp add <pkg>`       | 安装依赖（替代 pnpm add）        |

**重要：** 禁止直接使用 `pnpm`/`npm`/`npx`，统一用 `vp`。  
禁止单独安装 `vitest`、`oxlint`、`oxfmt`，它们已内置于 vp。

---

## Git 提交规范

### commit message 格式

```
<type>(<scope>): <subject>
```

其中 `<subject>` 必须使用简体中文描述；`<scope>` 可使用中文或项目中的代码标识，OAuth、API、React 等技术专有名词可保留英文。

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

示例：`feat(登录): 新增 OAuth 登录支持`、`fix: 修复失焦事件处理`

Merge commit 自动跳过校验。

### Git Hooks（自动生效）

- **pre-commit**：对暂存的 `.ts/.tsx` 文件自动执行 `vp fmt` 格式化 + `vp lint` 检查，lint 报错则阻断提交
- **commit-msg**：校验 message 格式，不符合则阻断提交

`pnpm install` 后自动激活（postinstall 执行 `git config core.hooksPath .githooks`）。

---

## AI Agent 工作规范

### 修改代码后必须执行

```bash
vp check
```

如有错误，修复后重新执行，直到通过。

### 新增页面

在 `src/pages/` 下创建文件即可，无需任何注册操作。

### 新增 UI 组件

```bash
vp dlx shadcn@latest add <component>
```

组件自动安装到 `src/components/ui/`，二次封装放 `src/components/`。

### Skills 安装

项目依赖的 Skills 记录在 `skills-lock.json`，新成员克隆项目后执行：

```bash
npx skills install
```

### 样式

只用 Tailwind CSS utility class + `cn()` 合并，不写 CSS 文件，不用内联 style。

### 类型

所有函数参数、返回值、组件 Props 必须有明确类型，禁止使用 `any`。

### 提交前

1. `git add` 暂存文件
2. pre-commit hook 自动 fmt + lint
3. lint 报错则修复，重新 `git add`
4. `git commit -m "type(scope): 中文主题"`
