# TanStack Query 迁移验收记录

日期：2026-10-14。分支：`refactor/tanstack-query_2026-10-14`。

## 调用点清单

扫描范围为 src/pages、src/components、src/hooks 的生产 TypeScript 文件，排除测试、底层 API 与异常类。共 34 个现有业务 API 调用文件；下面列出各文件实际导入的业务接口。

| 文件                                                       | 接口调用                                                                                                                                                    | 迁移状态                |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `src/pages/admin/admins.tsx`                               | `createAdmin`、`deleteAdmin`、`getAdminList`                                                                                                                | Query / Mutation 已接入 |
| `src/pages/admin/login.tsx`                                | `adminLogin`                                                                                                                                                | Query / Mutation 已接入 |
| `src/pages/admin/organizations.tsx`                        | `changeAdminOrganizationStatus`、`createOrganizationInviteCode`、`getAdminOrganizations`                                                                    | Query / Mutation 已接入 |
| `src/pages/admin/scheduled-tasks.tsx`                      | `getScheduledTasks`、`triggerScheduledTask`                                                                                                                 | Query / Mutation 已接入 |
| `src/pages/dashboard/org-admin/applications.tsx`           | `getJoinApplications`、`reviewJoinApplication`                                                                                                              | Query / Mutation 已接入 |
| `src/pages/dashboard/org-admin/create.tsx`                 | `createOrganizationTaskTemplate`、`getOrganizationBaseTaskList`、`getOrganizationTaskTemplate`、`updateOrganizationTaskTemplate`                            | Query / Mutation 已接入 |
| `src/pages/dashboard/org-admin/members.tsx`                | `changeMemberRole`、`changeMemberStatus`、`getMemberSubmitCounts`、`getOrganizationMembers`                                                                 | Query / Mutation 已接入 |
| `src/pages/dashboard/org-admin/project-types.tsx`          | `changeProjectTypeStatus`、`createOrganizationProjectType`、`deleteOrganizationProjectType`、`getOrganizationProjectTypes`、`updateOrganizationProjectType` | Query / Mutation 已接入 |
| `src/pages/dashboard/org-admin/projects.tsx`               | `changeProjectStatus`、`getOrganizationProjects`                                                                                                            | Query / Mutation 已接入 |
| `src/pages/dashboard/org-admin/settings.tsx`               | `getOrganizationInfo`、`updateOrganizationInfo`                                                                                                             | Query / Mutation 已接入 |
| `src/pages/dashboard/org-admin/workflows/index.tsx`        | `changeTaskTemplateStatus`、`getOrganizationTaskTemplate`、`getOrganizationTaskTemplateList`                                                                | Query / Mutation 已接入 |
| `src/pages/dashboard/planning/[projectId]/edit.tsx`        | `getProjectDetail`                                                                                                                                          | Query / Mutation 已接入 |
| `src/pages/dashboard/planning/[projectId]/index.tsx`       | `addProjectToWorkshop`、`getProjectDetail`、`removeProjectFromWorkshop`                                                                                     | Query / Mutation 已接入 |
| `src/pages/dashboard/planning/[projectId]/items/index.tsx` | `getProjectDetail`                                                                                                                                          | Query / Mutation 已接入 |
| `src/pages/dashboard/planning/create.tsx`                  | `createProject`、`updateProject`                                                                                                                            | Query / Mutation 已接入 |
| `src/pages/dashboard/planning/index.tsx`                   | `getProjectList`                                                                                                                                            | Query / Mutation 已接入 |
| `src/pages/dashboard/planning/shortage.tsx`                | `claimTask`、`getTaskPlaza`                                                                                                                                 | Query / Mutation 已接入 |
| `src/pages/dashboard/workshop/create.tsx`                  | `getBaseTaskList`、`createWorkshopTaskTemplate`、`updateWorkshopTaskTemplate`                                                                               | Query / Mutation 已接入 |
| `src/pages/dashboard/workshop/index.tsx`                   | `getWorkshopList`                                                                                                                                           | Query / Mutation 已接入 |
| `src/pages/dashboard/workshop/tasks.tsx`                   | `changeBaseTaskStatus`、`createOrganizationBaseTask`、`getOrganizationBaseTaskList`、`updateOrganizationBaseTask`                                           | Query / Mutation 已接入 |
| `src/pages/dashboard/workshop/workflows/index.tsx`         | `getWorkshopTaskTemplateList`                                                                                                                               | Query / Mutation 已接入 |
| `src/pages/forgot-password.tsx`                            | `resetPassword`、`sendVerificationCode`                                                                                                                     | Query / Mutation 已接入 |
| `src/pages/login.tsx`                                      | `loginByPassword`、`loginByCode`、`sendVerificationCode`                                                                                                    | Query / Mutation 已接入 |
| `src/pages/register.tsx`                                   | `registerCreateOrganization`、`registerJoinOrganization`、`sendVerificationCode`、`getInviteInfo`                                                           | Query / Mutation 已接入 |
| `src/components/AdminLayout/index.tsx`                     | `adminLogout`                                                                                                                                               | Query / Mutation 已接入 |
| `src/components/OrganizationInviteDialog/index.tsx`        | `createJoinInviteCode`                                                                                                                                      | Query / Mutation 已接入 |
| `src/components/ProjectItem/index.tsx`                     | `createProjectItem`、`deleteProjectItem`、`getProjectItemList`、`getTaskTemplateOptions`、`publishProjectItem`                                              | Query / Mutation 已接入 |
| `src/components/WorkflowInstance/TaskDetailPanel.tsx`      | `getTaskInstanceDetail`                                                                                                                                     | Query / Mutation 已接入 |
| `src/components/WorkflowInstance/index.tsx`                | `abandonTask`、`claimTask`、`getItemTaskFlow`、`getItemTaskInstances`、`rejectTask`、`resetTask`、`submitTask`                                              | Query / Mutation 已接入 |
| `src/components/layout/AppHeader.tsx`                      | `logout`、`changePassword`、`getInviteInfo`、`joinOrganizationByInvite`、`updateMyInfo`                                                                     | Query / Mutation 已接入 |
| `src/hooks/useCurrentUser.tsx`                             | `getCurrentUser`                                                                                                                                            | Query / Mutation 已接入 |
| `src/hooks/useOrganizationSwitcher.ts`                     | `getUserOrganizations`、`submitOrganizationSwitch`                                                                                                          | Query / Mutation 已接入 |
| `src/hooks/useProjectTypes.ts`                             | `getProjectTypes`                                                                                                                                           | Query / Mutation 已接入 |
| `src/hooks/useUploadFile.ts`                               | `createFileUpload`                                                                                                                                          | Query / Mutation 已接入 |

## 写操作与关联缓存

下列业务 key 自动添加会话和组织前缀；系统管理 key 添加独立 admin 前缀。组织写操作的 currentUser/organizations 失效由适配器路由到同会话同组织的 account 前缀。

| 写操作                                                 | 失效资源                                                      |
| ------------------------------------------------------ | ------------------------------------------------------------- |
| 企划创建、更新、组织端状态变更                         | projects、workshop、plaza                                     |
| 加入/移出工坊                                          | projects、workshop、plaza                                     |
| 个人/组织模板创建、更新、启停                          | templates、templateOptions                                    |
| 基础任务创建、更新、启停                               | baseTasks、templates、templateOptions                         |
| 企划类型创建、修改、删除、启停                         | projectTypes、projects、workshop、plaza                       |
| 条目创建                                               | items、projects、workshop、plaza                              |
| 条目删除、发布                                         | items、projects、flow、instances、taskDetail、workshop、plaza |
| 任务领取、放弃、提交、打回、重置                       | flow、instances、taskDetail、items、projects、workshop、plaza |
| 申请审核、成员角色和状态调整                           | applications、members、memberSubmitCounts、currentUser        |
| 组织设置                                               | organizationInfo、organizations                               |
| 用户头像/资料                                          | currentUser                                                   |
| 加入组织                                               | organizations、currentUser                                    |
| 组织切换                                               | currentUser；成功切换时清除旧 org/account 缓存                |
| 系统管理员创建、删除                                   | adminAdmins                                                   |
| 系统组织启停                                           | adminOrganizations                                            |
| 系统邀请码生成                                         | adminOrganizations（已有刷新行为，结果由 Mutation 管理）      |
| 定时任务触发                                           | scheduledTasks                                                |
| 登录、退出                                             | 通过会话生命周期清理缓存，不复用旧登录作用域                  |
| 验证码、注册、重置密码、修改密码、入组邀请码、上传申请 | 无需失效业务读取；返回值和提交状态由 Mutation 管理            |

## 保留项与设计落实

- 原生 fetch 仅保留在 request.ts 与预签名文件直传中；API 函数仍是 Promise 传输接口。
- 读取/写入统一通过 useApiQuery/useApiMutation 作用域适配器，直接返回标准 Query/Mutation 字段。现有 useCurrentUser/useProjectTypes/useOrganizationSwitcher 保留兼容返回字段，状态从 Query 派生。
- 回调必须同步启动 API（允许 Promise.all），request 在首次 await 前固定 Token、组织和 AbortSignal；不能在等待其他 Promise 后才首次调用 API。组织模板列表的节点详情已改为独立子组件 Query，避免串行等待后丢失上下文。
- account key 增加当前 orgId，并保留原有 X-Org-Id 请求语义，避免本次迁移改变用户接口声明的组织。public key 隔离两个登录生命周期，但不包含 Token。
- 普通 Mutation 有同步防重复锁；不同任务领取与文件上传申请显式允许并发，领取按钮状态从 useMutationState 派生，整个上传另行统计活跃传输。组件卸载后的成功不回填或导航，写入成功仍完成关联缓存失效。
- 同 Token 再登录也生成新的会话代号。旧请求的登录过期处理检查请求所属作用域，不能清理新会话。
- 本地状态保留：编辑草稿、画板节点、选择、分页/筛选输入、验证码倒计时、动态图标导入、裁剪/上传传输、附件打开生命周期。动态图标加载不是业务接口请求。
- 用户和企划 API 原有 Map/单飞/sessionStorage 缓存已移除。旧工作流读取/提交状态机已删除，未使用的 xstate 依赖已移除。
- 格式检查最初命中已安装第三方 skill 的 Markdown；Vite Plus fmt 排除 .agents/skills，产品文档的历史格式差异已统一格式化，无产品行为变更。

## 自动与本地浏览器验证

基线：20 个测试文件、85 项测试通过。最终命令及实际结果见下方完成记录。

新增测试验证真实 Hook 的请求复用、请求头和取消信号、组织/会话缓存身份、同 Token 登录作用域、旧 Mutation 成功拦截、普通端/管理端清理隔离、重试分类、最终失败一次提示、后台失败保留缓存、写成功与刷新失败分离、同步防重复、过期请求不提示、缺少组织不发请求。上传测试增加直传失败及会话切换后禁止回填。

本地浏览器验证过 /login、/register、/forgot-password、/admin/login：页面均正常渲染，控制台没有 error；空登录提交显示本地必填校验，没有向后端发送凭证或写入操作。

## Q01–Q17 验收状态

“自动通过”仅指可在测试环境证明的对应行为；业务链路的真实后端验收没有被自动测试替代。

| 编号 | 自动/代码证据                                                               | 真实后端联调                             |
| ---- | --------------------------------------------------------------------------- | ---------------------------------------- |
| Q01  | 自动通过：两个真实 Hook 同 key refetch 共享一次 fetch                       | 未验证：登录后的真实列表                 |
| Q02  | 自动通过：缺少组织 isLoading/isFetching 为 false，手动 refetch 也拒绝发请求 | 无额外后端依赖                           |
| Q03  | 代码检查：分页筛选均进入 key；自动通过旧组织结果拦截                        | 未验证：真实分页与筛选延迟               |
| Q04  | 自动通过：后台 503 有限重试后保留已有缓存，只提示一次                       | 未验证：真实列表刷新                     |
| Q05  | 自动通过：Mutation 精确作用域失效，读取失败不推翻写入成功                   | 未验证：实际创建/修改/删除               |
| Q06  | 自动通过：新用户/同 Token 登录隔离及旧结果拦截                              | 未验证：实际账号切换                     |
| Q07  | 自动通过：旧 org/account 缓存清理与请求头捕获                               | 未验证：实际组织切换和角色更新           |
| Q08  | 自动通过：普通端和管理端分别退出不误清另一端                                | 未验证：两端同时登录                     |
| Q09  | 自动通过：原 request/session 测试、取消与重试分类、旧 code 1 不清新会话     | 未验证：实际后端过期响应                 |
| Q10  | 代码检查：表单初始化按身份只执行一次、画板保存独立草稿                      | 未验证：登录后编辑期间切换窗口           |
| Q11  | 自动通过共享同步提交锁；页面保留任务/组织关键操作锁                         | 未验证：真实双击和验证码发送             |
| Q12  | 代码检查：五种任务操作完整关联失效，现有任务测试通过                        | 未验证：实际领取、提交、打回、放弃、重置 |
| Q13  | 现有权限/阶段与条目测试通过，继续以后端状态为准                             | 未验证：真实并行完成与解锁               |
| Q14  | 代码检查：类型/模板/基础任务选项失效，自身角色和禁用状态更新组织上下文      | 未验证：实际启停和权限修改               |
| Q15  | 自动通过上传裁剪/类型/直传错误/旧会话回填及附件生命周期测试；过期链接不渲染 | 未验证：真实存储传输和签名过期           |
| Q16  | 全部现有管理端读取和操作已接入；本地管理端登录页无错误                      | 未验证：真实管理端读写                   |
| Q17  | 34 个业务 API 调用文件已扫描；无遗留手写业务请求 loading/保存状态           | 已完成静态覆盖核对                       |

## 剩余验收条件

真实后端读写、多个身份/组织切换、工作流主线及存储上传需要用户提供的测试环境账号和数据。当前没有执行这些操作，也没有以假数据冒充后端联调。回滚可恢复本分支提交前的代码和锁文件；无需迁移后端数据。

## 最终检查与审查

- `vp run api:check`：命中 5 组文档、158 个接口。
- `vp check`：格式、lint、TypeScript 均通过，无警告。
- `vp test`：22 个测试文件、109 项测试通过（包含工作区并行进行的画板测试）。
- `vp run build`：tsc 与生产构建通过。
- `git diff --check`：通过。
- 独立代码审查发现并修复不同任务并发领取被共享锁拦截的问题。按作用域 Mutation key 派生所有领取中的任务，保留同任务同步锁；新增并发测试通过，定向复审确认已修复，未发现新问题。
- 工作区同时出现 WorkflowEditor 画板拖放改动，属于其他工作；未作为本次迁移实现或验收成果，不纳入本次迁移提交。
