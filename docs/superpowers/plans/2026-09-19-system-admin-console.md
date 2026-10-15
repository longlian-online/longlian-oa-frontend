# 系统管理员控制台接入 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 接入系统管理员的管理员、组织和定时任务管理页面及对应 Swagger API。

**Architecture:** 新增独立 `admin` API/type 模块，复用现有 `adminRequest`、session 和 shadcn/ui 组件。`/admin` 作为管理端布局入口，三个子路由分别承载管理员、组织、定时任务功能，页面状态和请求逻辑保持局部化。

**Tech Stack:** React 19、TypeScript、React Router、Tailwind CSS、shadcn/ui、Vite Plus。

**Spec:** 用户确认的系统管理员控制台接入设计（本轮对话）。

## Global Constraints

- API 路径与字段以 `docs/api-cache/summary.md` 和对应 Swagger operation 缓存为准。
- 依赖管理和检查统一使用 `vp`，不直接使用 pnpm/npm/npx。
- 页面只使用 Tailwind utility class 和现有 shadcn/ui 组件，不新增独立 CSS。
- 所有新增函数参数、返回值和 Props 使用明确 TypeScript 类型，禁止 `any`。
- 修改代码后执行 `vp check`，并运行相关测试与构建。

---

### Task 1: 管理端 API 类型与封装

**Files:**

- Create: `src/types/admin.ts`
- Create: `src/api/admin.ts`
- Test: `src/api/admin.test.ts`

**Interfaces:**

- `getAdminList(dto): Promise<PageResult<AdminVO>>`
- `createAdmin(dto): Promise<string>`
- `deleteAdmin(adminId): Promise<void>`
- `getAdminOrganizations(dto): Promise<PageResult<AdminOrganizationVO>>`
- `changeAdminOrganizationStatus(orgId, status): Promise<void>`
- `createOrganizationInviteCode(): Promise<InviteCodeVO>`
- `getScheduledTasks(): Promise<ScheduledTaskVO[]>`
- `triggerScheduledTask(taskName, dto): Promise<void>`

- [x] **Step 1: Write failing tests** for URL/method/body mapping of representative admin API calls.
- [x] **Step 2: Run `vp test src/api/admin.test.ts` and confirm failure because the module is absent.**
- [x] **Step 3: Add Swagger-aligned types and API functions using `adminRequest`.**
- [x] **Step 4: Run the focused tests and confirm they pass.**

### Task 2: 管理端布局与管理员管理页

**Files:**

- Modify: `src/pages/admin/index.tsx`
- Create: `src/pages/admin/admins.tsx`

- [x] **Step 1: Add admin workspace navigation and route-aware outlet shell.**
- [x] **Step 2: Add paginated administrator table, create dialog, and delete confirmation.**
- [x] **Step 3: Verify type-check and manually inspect route links through the existing file-based router.**

### Task 3: 组织管理页

**Files:**

- Create: `src/pages/admin/organizations.tsx`

- [x] **Step 1: Add paginated organization table with name/status filters.**
- [x] **Step 2: Add enable/disable action and create-organization invite dialog.**
- [x] **Step 3: Verify request refresh, loading, empty and error states.**

### Task 4: 定时任务页与全量验证

**Files:**

- Create: `src/pages/admin/scheduled-tasks.tsx`
- Modify: `src/pages/admin/index.tsx`

- [x] **Step 1: Add scheduled-task table and manual trigger dialog with optional execute time.**
- [x] **Step 2: Run `vp test`, `vp check`, and `vp build`.**
- [x] **Step 3: Review diff and confirm no unrelated files changed.**
