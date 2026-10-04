# Issue #7–#12 修复与展示优化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复登录失效处理，并按开放 Issue 优化企划、工坊、成员及任务流展示。

**Architecture:** 保留当前请求层、文件系统路由和业务组件结构。认证错误集中处理；任务流以选中节点驱动详情面板，并拆开重置与打回权限；展示优化复用现有组件和接口。

**Tech Stack:** React 19、TypeScript 5.9、Tailwind CSS v4、shadcn/ui、Vite Plus。

**Spec:** GitHub Issue [#7](https://github.com/longlian-online/longlian-oa-frontend/issues/7)、[#8](https://github.com/longlian-online/longlian-oa-frontend/issues/8)、[#9](https://github.com/longlian-online/longlian-oa-frontend/issues/9)、[#10](https://github.com/longlian-online/longlian-oa-frontend/issues/10)、[#11](https://github.com/longlian-online/longlian-oa-frontend/issues/11)、[#12](https://github.com/longlian-online/longlian-oa-frontend/issues/12)，以及 `PRODUCT.md`、`docs/mvp-spec.md`。具体 Issue 优先于历史 MVP 范围。

## 全局约束与当前状态

- 已从最新 `main` 创建 `upd/issue-improvements_2026-10-04`；起始工作区干净。
- 用户已确认开始实施；#7–#12 已完成代码修改，改动留在当前分支供审阅。
- 统一使用 `vp`；不直接使用 npm/pnpm/npx；不额外安装测试或 UI 框架。
- 禁止 `any`；样式使用 Tailwind utility class 和 `cn()`，不直接修改 shadcn 原始组件。
- 修改 API、类型和接口调用前读取 longlian-api 技能，核对现有 Swagger 缓存。
- 业务修改后执行 `vp check`，关键行为用 `vp test` 验证，最后执行 `vp build`。
- 用户已要求提交本批修改；提交主题用中文，类型与当前分支 `upd` 一致。未推送远端。

## 需求证据与待核对项

- #7 与代码一致：`src/api/request.ts` 只在 HTTP 401 时清会话，业务 code=1 仅抛错；请求层未执行登录页跳转。
- #10 与代码一致：`AppHeader.tsx` 直接使用 `roles.join(" / ")` 展示技术标识。
- #12 与代码一致：`WorkflowInstance/index.tsx` 展示所有实例；`TaskActionPanel.tsx` 共用 `canManageCompletedTask` 控制重置与打回，且该判断给予管理员权限。
- #11 成员排序显示“正序 / 倒序”（ASC → 正序，DESC → 倒序），保留原始请求值；已查看工坊截图，其问题是类型筛选默认显示 all，现改为“所有类型”。不新增排序参数。
- #8 已由用户明确：顶部导航在页面中间固定展示“浏览 / 工坊 / 管理”，不随当前页面改变位置或文案；管理入口沿用现有管理员权限控制。邀请码生成迁移至成员页顶部。
- #12 “下一任务借取着”按“紧邻下一阶段已接取任务的执行者”实现，并行阶段任一本人 CLAIMED 任务满足条件，管理员无豁免。Swagger 没有单独提交人字段，现有本人 COMPLETED 实例通过 assigneeId 判断重置权限；未扩展接口字段。
- 已读取 Issue 正文、#11 工坊截图和 #12 附图；#11 成员排序与 #8 导航以用户补充为准。

## 任务 1：登录失效统一处理（#7，优先）

**文件：** 修改 `src/api/request.ts`、`src/lib/session.ts`（仅必要时）、`src/components/AuthGuard.tsx`、`src/components/AdminLayout/index.tsx`（核对守卫和错误传播）；新增 `src/api/request.test.ts`。

**接口边界：** `request`、`orgAdminRequest`、`commonRequest` 使用普通会话；`adminRequest` 使用管理端会话。保持现有泛型返回契约，认证错误需可被调用方识别。

- [x] 先编写回归用例：HTTP 401、HTTP 200/code=1、code=3、普通端/管理端分离、同一会话多请求并发失败。
- [x] 执行 `vp test src/api/request.test.ts`，确认新增用例能暴露现有缺陷。
- [x] 在请求层统一识别 401/code=1，清理对应会话；使用 replace 进入 `/login` 或 `/admin/login`；按会话域防止重复跳转。
- [x] 核对登录接口本身失败的处理，避免在登录页产生跳转循环；code=3 保持会话并报告业务错误。
- [x] 核对各页面 catch 提示路径，认证失败集中提示或由类型化错误抑制重复提示，不能仅去重导航而留下多条 toast。
- [x] 重跑回归测试；人工验证清除 token、userId、currentOrgId、roles，管理端不会误清普通会话。

## 任务 2：企划参与文案统一（#9）

**文件：** `src/pages/dashboard/planning/[projectId]/index.tsx`、`src/pages/dashboard/workshop/index.tsx`。

- [x] 将“添加到工坊”改为“加入企划”，“移出工坊”改为“退出企划”。同步成功提示、确认提示和工坊空状态引导。
- [x] 保持已有加入/退出接口和 `inWorkshop` 状态不变。
- [x] 用 `rg -n '添加到工坊|移出工坊' src` 核对遗漏；人工验证两个状态的按钮与提示，无需为纯文案新增镜像测试。

## 任务 3：个人信息角色中文化（#10）

**文件：** `src/components/layout/AppHeader.tsx`；如已有统一映射则复用，否则新增 `src/lib/roleLabels.ts` 和必要的 `src/lib/roleLabels.test.ts`。

- [x] 只在展示层映射角色，兼容大小写：org_admin/ORG_ADMIN → “组织管理”，org_user/ORG_USER → “平台用户”。
- [x] 保留权限判断使用的原始角色；空角色显示中文兜底，未知角色保留可辨认标识，不错误授予权限。
- [x] 验证多角色、大小写与空角色展示；检查成员页已有角色文案能否复用。

## 任务 4：排序选中文字中文化（#11）

**文件：** `src/pages/dashboard/org-admin/members.tsx`、`src/pages/dashboard/workshop/index.tsx`。

- [x] 核对排序选择器受控值及选中文字渲染，修正默认显示 DESC 等原始值的问题；ASC 显示“正序”，DESC 显示“倒序”。
- [x] 使用现有 Select 的选项映射或明确的选中标签渲染，使首次进入及切换后均显示中文；保留底层值和实际请求参数。
- [x] 工坊类型选择器默认 all 显示“所有类型”；保留现有类型值，不新增排序参数或本地排序逻辑。
- [x] 验证首次进入、切换选项和刷新，页面不展示原始 ASC/DESC；原有请求、分页行为保持一致。纯展示修正无需新增镜像测试。

## 任务 5：邀请入口迁移与导航还原（#8）

**文件：** `src/pages/dashboard/org-admin/members.tsx`、`src/pages/dashboard/org-admin/invites.tsx`、`src/components/layout/AppSidebar.tsx`、`AppHeader.tsx`、`AppLayout.tsx`、`AppBreadcrumb.tsx`；需要复用时新增 `src/components/OrganizationInviteDialog/index.tsx`。

- [x] 阅读原邀请页的生成、复制、有效期和权限逻辑，将所需功能封装到成员页顶部的“生成邀请码”入口，复用现有组织管理接口。
- [x] 去除侧边栏、顶部导航和面包屑中的独立组织邀请入口；旧 URL 用文件路由重定向到成员页，避免历史链接成为死入口。
- [x] 顶部导航固定为“浏览 / 工坊 / 管理”，分别复用现有浏览、工坊、组织管理路由；导航组相对于整个顶部栏居中，左右区域宽度变化不影响其位置。管理入口沿用现有权限控制。
- [x] 检查当前页面选中态，确保进入子页面后导航文案和位置不变化；保持左右组织信息与个人信息区域可用，不重做未明确要求的侧边栏视觉。
- [x] 已搜索技能目录，未找到 Impeccable。此次仅按用户明确要求调整导航与入口，复用既有 shadcn 组件和界面风格。
- [x] 验证管理员生成/复制邀请码、取消与失败状态；普通用户不能访问生成入口；明暗主题及主要桌面尺寸下导航可用。

## 任务 6：任务流选中节点详情与操作权限（#12）

**文件：** `src/components/WorkflowInstance/index.tsx`、`TaskFlowViewer.tsx`、`TaskNodeCard.tsx`、`TaskActionPanel.tsx`；新增 `src/components/WorkflowInstance/taskPermissions.ts` 和 `taskPermissions.test.ts`。如字段缺失，先核对 `src/types/workflowInstance.ts` 与 Swagger。

**接口边界：** 通过稳定节点 ID 保存选择，节点卡片向父层报告选中节点；父层根据 `taskInstanceId` 定位实例，必要时回退到 sort/parallelSort。分别派生 `canReset`、`canReject`，不复用管理权限布尔值。

- [x] 先写权限用例：本人提交/他人提交、紧邻下一阶段本人已接取/非本人/未接取、管理员无额外豁免、最后阶段无打回者、并行阶段。
- [x] 重置按钮仅已完成且当前用户为提交人时显示；核对提交人与接取人字段一致性后实现判断。
- [x] 打回按钮仅已完成且当前用户接取了紧邻下一阶段任务时显示；使用实际排序后最小的后续 sort，不假定 sort 连续；已完成的后续任务不算当前已接取。
- [x] 将底部全量任务列表改成单个选中节点的信息及操作；未选中时显示选择提示，未解锁节点显示基础信息和锁定原因，不发不存在实例的详情请求。
- [x] 节点增加可见选中态和键盘选择支持，内部接取/提交按钮事件避免误触发节点选择。
- [x] 操作后重拉流程和实例，保留有效节点选择；切换 itemId 重置选择。详情异步请求防止切换节点后旧响应覆盖新节点。
- [x] 验证并行任务、无实例节点、重置/打回后刷新与权限更新；执行权限测试及既有提交面板测试。

## 最终验收

- [x] 运行 `vp check`、`vp test`、`vp build`，修复新增问题；既有失败记录其证据。
- [x] 按 #7–#12 逐条验收，#8 核对固定居中导航，#11 核对“正序 / 倒序”显示；附必要的界面验证证据。
- [x] 已汇总实际改动及验证结果；未修改远端 Issue 状态。

建议执行顺序：#7 → #9 → #10 → #11 → #8 → #12。#8 导航和 #11 排序展示要求已明确，可直接按上述计划实施。

## 实施结果与验证记录

- 认证：新增 AuthExpiredError 和统一过期通知，清理对应会话并替换登录路由；已发起请求的旧 token 响应不会清掉新会话；公开登录错误保持可见。
- UI：角色中文显示、参与文案、成员排序标签、工坊默认类型标签、固定居中主导航、邀请入口迁移及旧路由重定向。
- 任务流：稳定节点选择、键盘操作、单任务详情与按钮；拆开重置/打回权限；详情响应防竞态，项目生命周期隔离旧操作，操作后保留选择。
- `vp test`：10 个测试文件、36 个测试通过（包括 15 个请求回归测试）。
- `vp check --no-fmt`：全仓 134 个源码文件 lint 和类型检查通过；本次所有变更文件另行运行包含格式的 `vp check`。
- `vp build`：生产构建通过。
- 浏览器验证使用本地服务和模拟 API：成员默认/切换排序、真实请求参数、固定导航、角色标签、邀请码生成复制、旧邀请 URL 跳转、普通端/管理端过期导航和单次通知、节点切换与旧详情响应、锁定节点、权限按钮、键盘选择、重置刷新保留选择均通过。此验证未操作真实后端业务数据。
- 全量 `vp check` 仍被历史格式问题阻断：当前 226 个文件，主要是外部技能文档与生成的 API 缓存，另有未修改的 `src/api/user.ts`。将 HEAD 导出到临时目录核对，基线也存在 227 个格式问题；没有为本次修复批量重排这些文件。
- 独立审查发现的两个 P2（公开登录错误提示被吞、A→B→A 的旧操作竞态）均已修复并复核。
