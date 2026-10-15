# TanStack Query 全量迁移 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 全量替换现有 React 调用方的手写接口状态，保留请求协议并验证身份隔离和联动刷新。

**Architecture:** QueryClient 管理缓存与最终错误通知；统一作用域 Hook 捕获身份、组织、取消信号并调用现有 API。业务调用方使用稳定资源 key 和明确的关联失效前缀。

**Tech Stack:** React 19、TypeScript、TanStack Query v5、Vite Plus。

**Spec:** `docs/superpowers/specs/2026-10-14-tanstack-query-design.md`

## Global Constraints

- 底层 fetch、接口路径和 DTO 保留；禁止 any。
- 组织/账号/管理端隔离；取消不提示；Mutation 不自动重试。
- 后台刷新不覆盖表单和画板草稿。
- 使用 vp；最终执行 vp check、vp test、vp run build。
- 已获用户授权在当前 checkout 的 refactor 分支实施，不创建额外 worktree。

## Task 1：共享设施与会话

Files: `src/lib/queryClient.ts`、`src/lib/queryKeys.ts`、`src/hooks/queries/useApiQuery.ts`、`src/lib/session.ts`、`src/api/request.ts`、`src/api/apiError.ts`、`src/api/user.ts`、`src/api/planning.ts`、`src/main.tsx`、公共 Hooks、账号页面及布局。

- [x] 运行 API 缓存检查/更新、安装依赖和基线测试。
- [x] 编写并观察取消、固定请求上下文、会话清理、Query 并发与重试测试失败。
- [x] 实现 QueryClient、可订阅会话、作用域 key 和最终失败通知。
- [x] 接入 Provider，移除 user/planning 手写缓存，迁移公共 Hooks 和账号操作。
- [x] 验证已有请求和会话测试，以及新增行为测试。

共享接口：

```ts
useApiQuery<T>({ key, queryFn, scope?, enabled?, staleTime? }): UseQueryResult<T, Error>
useApiMutation<T, V>({ mutationFn, invalidate?, scope? }): UseMutationResult<T, Error, V>
// scope: 'org'（默认） | 'account' | 'admin' | 'public'
// key 和 invalidate 为业务资源数组，Hook 自动添加身份和组织前缀。
// mutationFn: (variables: V) => Promise<T>
// invalidate: readonly QueryKey[]；每项为需要失效的业务资源前缀。
```

Query 回调必须直接调用 API 函数，多个读取使用 Promise.all；不能在等待其他 Promise 后才首次发请求。共享适配器仅在同步启动 API 时注入上下文，request 在 await 前捕获；测试保证并发请求隔离。

## Task 2：企划、工坊与模板

Files: `src/pages/dashboard/planning/**`、`src/pages/dashboard/workshop/**`。

- [x] 读取页面与 spec；用共享 Hook 替换读取数据、loading、请求 Effect。
- [x] 创建/修改/领取等使用 Mutation，按 spec 映射关联失效。
- [x] 保留本地输入及草稿，后台失败保留旧数据，Query 首次错误提供重试入口。
- [x] 检查作用域、参数 key、组织切换占位数据和页内刷新；运行 vp check。

## Task 3：组织管理和系统管理

Files: `src/pages/dashboard/org-admin/**`、`src/pages/admin/{admins,organizations,scheduled-tasks}.tsx`、`src/components/OrganizationInviteDialog/index.tsx`。

- [x] 读取对应 API 和现有页面；列表/详情迁入 Query。
- [x] 写入迁入 Mutation，系统管理显式 scope: 'admin'，组织数据默认 scope: 'org'。
- [x] 单独保护设置和编辑表单初始化；保持确认与成功导航。
- [x] 设置/角色/类型/模板等关联失效完整，运行 vp check。

## Task 4：条目、任务流与上传

Files: `src/components/ProjectItem/**`、`src/components/WorkflowInstance/**`、`src/hooks/useUploadFile.ts`。

- [x] 流程/实例/条目/详情采用 Query，移除服务端快照和读取状态机状态。
- [x] 操作使用 Mutation 并保持同步防重复与条目生命周期检查。
- [x] 成功统一失效流程、详情、条目、企划及广场；刷新失败不把成功写入报为失败。
- [x] 过期附件重新获取；上传申请用 Mutation，直传生命周期保持独立。
- [x] 运行现有任务权限、生命周期、提交和上传测试。

## Task 5：整合、审查与验收

- [x] 全量扫描生产 API 调用方、手写 loading 与请求 Effect，记录分类与保留项。
- [x] 完整实现所有失效映射和缺少的行为测试。
- [x] 对任务 1–4 做规格与代码审查，修复有效发现。
- [x] 执行 vp check、vp test、vp run build。
- [x] 保存 Q01–Q17 证据；无后端账号的浏览器项明确标为未验证。
