# 组织管理后台 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 基于最新 Swagger 接口补齐 `ORG_ADMIN` 的组织管理后台，并让组织管理员页面统一使用 `/orgadmin/*` 接口。

**Architecture:** 保留现有文件系统路由和 `OrganizationAdminGuard`，在 `/dashboard/org-admin` 下按领域拆分企划、企划类型、成员、入组申请、组织设置、原子任务和工作流页面。API 封装统一走 `orgAdminRequest`，页面只消费领域 API，不直接拼接请求路径。

**Tech Stack:** React 19、TypeScript、React Router、Vite Plus、Tailwind CSS v4、shadcn/ui、现有 `ConfirmDialog`/`PaginationBar` 组件。

**Spec:** `docs/api-cache/summary.md` 与 `docs/api-cache/operations/组织管理端_*.json`（来源 Swagger，更新时间 2026-09-19）。

## Global Constraints

- 所有组织管理路由必须由 `OrganizationAdminGuard` 保护。
- 组织管理接口必须使用 `orgAdminRequest`，不使用 `/app/*` 或 `/workshop/*` 替代。
- 普通用户侧页面不展示组织管理操作；后端权限仍是最终安全边界。
- 企划类型从接口动态加载，不写死类型名称。
- 样式只使用 Tailwind utility class 和现有 shadcn/ui 组件。
- 每个实现阶段结束运行 `vp check`；完整实现后运行 `vp build` 与 `vp run api:check`。

## File Map

- Modify `src/api/organizationAdmin.ts`: 组织信息、成员、申请、邀请码、企划、企划类型、原子任务、工作流模板 API。
- Modify `src/types/organizationAdmin.ts`: 组织管理请求和响应类型。
- Modify `src/components/layout/AppHeader.tsx`, `src/components/layout/AppBreadcrumb.tsx`: 组织管理二级导航和面包屑。
- Modify `src/pages/dashboard/org-admin/*`: 组织管理页面。
- Modify `src/pages/dashboard/org-admin/projects.tsx`: 改用 `/orgadmin/projects` 管理列表。
- Modify `src/pages/dashboard/workshop/tasks.tsx`: 保留页面结构，改用组织管理原子任务 API。
- Modify `src/pages/dashboard/workshop/workflows/index.tsx`, `src/pages/dashboard/workshop/create.tsx`: 改用组织管理工作流模板 API和新路由。
- Modify `src/pages/dashboard/planning/index.tsx` only if shared project list types need to accommodate admin status values; do not add admin actions back to user pages.

### Task 1: API contracts and organization-admin API layer

**Files:**

- Create: `src/types/organizationAdmin.ts`
- Modify: `src/api/organizationAdmin.ts`
- Read: `docs/api-cache/operations/组织管理端_*.json`

**Interfaces:**

- `getOrganizationInfo(): Promise<OrganizationInfoVO>`
- `updateOrganizationInfo(dto: OrganizationUpdateDTO): Promise<void>`
- `getOrganizationMembers(dto: OrganizationMemberListDTO): Promise<PageResult<OrganizationMemberVO>>`
- `changeMemberStatus(memberId: string, status: OrganizationResourceStatus): Promise<void>`
- `getMemberSubmitCounts(memberId: string): Promise<MemberSubmitCountVO[]>`
- `getJoinApplications(dto: JoinApplicationListDTO): Promise<PageResult<JoinApplicationVO>>`
- `reviewJoinApplication(applicationId: string, dto: JoinApplicationReviewDTO): Promise<void>`
- `createJoinInviteCode(): Promise<InviteCodeVO>`
- `getOrganizationProjectTypes(dto: ProjectTypeListDTO): Promise<PageResult<ProjectTypeVO>>`
- `createOrganizationProjectType(dto: ProjectTypeCreateDTO): Promise<void>`
- `updateOrganizationProjectType(typeId: string, dto: ProjectTypeUpdateDTO): Promise<void>`
- `deleteOrganizationProjectType(typeId: string): Promise<void>`
- `changeProjectTypeStatus(typeId: string, status: OrganizationResourceStatus): Promise<void>`
- `getOrganizationProjects(dto: OrganizationProjectListDTO): Promise<PageResult<OrganizationProjectVO>>`
- `changeProjectStatus(projectId: string, status: OrganizationResourceStatus): Promise<void>`
- `createOrganizationBaseTask`, `getOrganizationBaseTaskList`, `changeBaseTaskStatus`
- `createOrganizationTaskTemplate`, `getOrganizationTaskTemplateList`, `getOrganizationTaskTemplate`, `updateOrganizationTaskTemplate`, `changeTaskTemplateStatus`

- [ ] Read each operation JSON to copy exact request fields, response fields, enum values, and pagination names.
- [ ] Add typed API functions using `orgAdminRequest` and the exact Swagger paths.
- [ ] Replace existing duplicate status functions without changing their public call sites unless the new types require it.
- [ ] Run `vp check` and verify no API function falls back to `/app/*` for organization-admin pages.

### Task 2: Organization management navigation shell

**Files:**

- Modify: `src/components/layout/AppSidebar.tsx`
- Modify: `src/components/layout/AppHeader.tsx`
- Modify: `src/components/layout/AppBreadcrumb.tsx`
- Modify: `src/pages/dashboard/org-admin/index.tsx`

- [ ] Add the administrator-only sidebar entry and second-level items: 企划、企划类型、成员、入组申请、原子任务、工作流、组织设置。
- [ ] Keep ordinary users limited to the existing user-facing navigation.
- [ ] Make `/dashboard/org-admin` redirect to `/dashboard/org-admin/projects`.
- [ ] Add breadcrumbs for every management route.
- [ ] Verify direct navigation by URL still reaches `OrganizationAdminGuard` before page data loads.
- [ ] Run `vp check`.

### Task 3: Organization settings and project-type management

**Files:**

- Create: `src/pages/dashboard/org-admin/settings.tsx`
- Create: `src/pages/dashboard/org-admin/project-types.tsx`
- Modify: `src/components/layout/AppHeader.tsx`

- [ ] Build organization settings form for organization name, avatar and description using `getOrganizationInfo`/`updateOrganizationInfo`.
- [ ] Use `FileUpload` with `bizType="avatar"` and the current organization id for avatar updates.
- [ ] Build project-type list with create, rename, delete and enable/disable actions using `ConfirmDialog` for destructive actions.
- [ ] Refresh the project-type list after every mutation and show API errors through `$tip`.
- [ ] Run `vp check`.

### Task 4: Member, application and invitation management

**Files:**

- Create: `src/pages/dashboard/org-admin/members.tsx`
- Create: `src/pages/dashboard/org-admin/applications.tsx`
- Create: `src/pages/dashboard/org-admin/invites.tsx`

- [ ] Build paginated member list with keyword/filter fields, member status, enable/disable action, and a submission-count detail view using `getMemberSubmitCounts`.
- [ ] Build pending application list with approve/reject actions and the exact review DTO from Swagger.
- [ ] Build invitation page with generate-code action, copy-to-clipboard behavior, expiration display, and error feedback.
- [ ] Keep all mutations behind `OrganizationAdminGuard` and refresh the affected list after success.
- [ ] Run `vp check`.

### Task 5: Correct existing project, atomic-task and workflow management integrations

**Files:**

- Modify: `src/pages/dashboard/org-admin/projects.tsx`
- Modify: `src/pages/dashboard/workshop/tasks.tsx`
- Modify: `src/pages/dashboard/workshop/workflows/index.tsx`
- Modify: `src/pages/dashboard/workshop/create.tsx`
- Modify: `src/api/planning.ts` only if user and admin project response types cannot be separated cleanly.

- [ ] Replace the admin project list call with `getOrganizationProjects` and map its real Swagger response fields.
- [ ] Keep project enable/disable only in organization management; do not restore it on the user project detail page.
- [ ] Replace `/orgadmin/task/base` calls with the typed organization-admin base-task functions.
- [ ] Replace `/workshop/task-template` calls with `/orgadmin/task/template` functions for organization workflow templates, including detail, edit and status operations.
- [ ] Keep user-created personal workflow APIs separate from organization template APIs.
- [ ] Add loading, empty, pagination and mutation states without duplicating user-facing pages.
- [ ] Run `vp check` and manually inspect all management route links.

### Task 6: Verification and API-cache handoff

**Files:**

- Modify: `docs/api-cache/manifest.json`
- Modify: `docs/api-cache/summary.md`
- Modify: `docs/api-cache/openapi/*.json`
- Modify: `docs/api-cache/operations/*.json`

- [ ] Run `vp run api:update` only when the Swagger source changes; keep the refreshed cache staged with the API integration.
- [ ] Run `vp run api:check` and confirm the cache is current.
- [ ] Run `vp check` and `vp build`.
- [ ] Verify ordinary users cannot see the organization-management navigation and are redirected when entering an admin URL directly.
- [ ] Verify organization admins can load each management page and that every mutation uses an `/orgadmin/*` endpoint.
- [ ] Review `git diff --check` and list any backend capabilities still blocked by missing API fields or response data.
