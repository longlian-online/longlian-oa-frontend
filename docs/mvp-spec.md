# longlian-oa MVP 规格说明

## 1. MVP 定位

MVP 版本只验证 OA 主线是否跑通：组长创建企划，配置工作流，组员接取任务并推动工作流状态流转。

完整产品愿景仍以 `PRODUCT.md` 为准，但当前版本不追求完整社区化、通知、统计、归档等能力。所有页面、接口、交互和数据模型优先服务这条主线，避免把系统提前做成复杂平台。

## 2. MVP 目标

### 2.1 必须完成

- 管理员可以创建、查看、编辑企划；删除能力需要后端补充接口后再接入。
- 企划类型使用接口动态返回，不在前端写死类型范围。
- 管理员可以为企划添加工作流。
- 管理员可以创建、查看、编辑工作流模板；删除能力需要后端补充接口后再接入。
- 工作流模板支持自定义步骤顺序。
- 工作流模板支持并行步骤。
- 工作流模板支持通过拖拽调整步骤顺序和并行关系。
- 企划实例化工作流后，组员可以接取当前可执行任务。
- 组员可以提交任务，推动工作流进入下一步。
- 并行任务需要同一并行组全部完成后，才解锁下一步。
- 管理员或后续步骤负责人可以将任务打回前置步骤。

### 2.2 暂不支持

- 代办中心。
- 任务广场。
- 安利社区。
- 归档系统。
- 站内信和消息通知。
- 个人或组内数据统计。
- 多租户管理端。
- 资源配额。
- 等级系统。
- 复杂权限配置界面。
- 移动端专项优化。
- 真实社区互动能力，如点赞、评论、收藏。

## 3. 角色范围

### 3.1 管理员/组长

MVP 中的管理员就是组长，不区分团队管理员、项目管理员、超级管理员。

管理员可以：

- 管理企划。
- 管理工作流模板。
- 给企划绑定工作流。
- 查看所有企划和任务状态。
- 必要时编辑未开始的企划、工作流；删除能力以后端接口为准。
- 处理任务打回。

### 3.2 组员

组员可以：

- 浏览可参与的企划。
- 查看企划详情和工作流状态。
- 接取当前已解锁且未被接取的任务。
- 提交自己已接取的任务。
- 查看自己参与的任务状态。

### 3.3 权限简化

MVP 只做基础角色判断：

- 管理员拥有管理权限。
- 组员拥有查看和任务执行权限。

不做细粒度权限矩阵，不做等级限制，不做团队成员管理闭环。

## 4. 核心概念

### 4.1 企划 Project

企划是一个汉化项目容器。

基础字段：

- 企划名称。
- 企划类型：通过 `GET /app/projects/types` 获取，前端按接口返回展示。
- 封面。
- 简介。
- 创建人。
- 当前状态。
- 绑定的工作流实例。

当前接口返回的企划状态：

- `进行中`
- `COMPLETED`：已完成。
- `已归档`

`DRAFT`、`CANCELLED` 暂未在当前 Swagger 中体现。前端如果需要草稿或取消能力，应等待后端状态和接口明确后再实现。

### 4.2 工作流模板 WorkflowTemplate

工作流模板是可复用的步骤结构。

基础字段：

- 模板名称。
- 步骤列表。
- 是否启用。
- 创建人。

模板只定义流程结构，不代表具体企划中的任务执行状态。

### 4.3 工作流实例 WorkflowInstance

企划绑定模板后，生成该企划自己的工作流实例。

关键规则：

- 模板被实例化后，后续模板修改不影响已有企划实例。
- 工作流实例记录每个步骤的执行状态。
- 工作流实例属于某一个企划。

### 4.4 工作流步骤 WorkflowStep

步骤是工作流中的一个任务节点。

基础字段：

- 步骤名称，如创建、翻译、校对、嵌字、审核、发布。
- 步骤顺序 `sort`。
- 并行组内顺序 `parallelSort`。
- 任务说明。
- 可接取人数。

MVP 中并行规则：

- `sort` 相同的步骤属于同一并行组。
- 同一并行组可以有多个步骤。
- 并行组内所有步骤完成后，才进入下一个 `sort`。

### 4.5 任务 Task

任务是工作流实例中可以被组员接取和提交的执行单元。

任务状态：

- `PENDING`：待接取。
- `CLAIMED`：已接取。
- `COMPLETED`：已完成。

未解锁节点由 `taskStatus` 为空或无 `taskInstanceId` 表达，前端可以在 UI 中派生为 `LOCKED`，但不要把 `LOCKED` 当作后端状态提交。

当前接口没有独立的 `SUBMITTED`、`REJECTED` 状态。提交后以后端返回的实例状态为准，打回通过 `POST /app/task/instance/{instanceId}/reject` 操作表达。

## 5. 模块拆分

MVP 按业务能力拆分模块。模块之间通过明确的数据对象和接口协作，避免把工作流逻辑散落在企划页面里。

每个模块的实施规格已拆分到 `docs/modules/`，按文件名前缀编号顺序实现。

### 5.1 登录与会话模块

职责：

- 用户登录。
- 邮箱验证码发送与验证码登录。
- 注册流程。
- 邀请码信息查询。
- 已注册用户通过邀请码加入组织。
- 找回密码入口和验证码发送。
- 退出登录。
- 保存和读取 `token`、`userId`、`currentOrgId`。
- 获取当前用户信息和角色。
- 为业务接口提供当前组织上下文。

页面：

- 登录页。

接口：

- `POST /app/session/pwd`
- `POST /app/session/email/code`
- `POST /app/session/email`
- `DELETE /app/session/`
- `GET /app/user/`
- `POST /app/user/register/create-organization`
- `POST /app/user/register/join-organization`
- `GET /app/user/register/join-organization/invite-info`
- `POST /app/user/organizations/join-by-invite`

边界：

- 只负责认证和当前用户上下文。
- 不负责企划、工作流、任务数据。
- 不做完整成员管理和权限配置。
- 当前 Swagger 未暴露最终重置密码提交接口，找回密码先做到验证码发送和页面入口。

### 5.2 企划模块

职责：

- 企划列表。
- 企划创建。
- 企划编辑。
- 企划详情基础信息。
- 企划类型动态获取。
- 企划加入或移出工坊。

页面：

- 企划列表页。
- 企划创建页。
- 企划编辑页。
- 企划详情页的基础信息区域。

接口：

- `GET /app/projects`
- `POST /app/projects`
- `GET /app/projects/types`
- `GET /app/projects/{projectId}`
- `PUT /app/projects/{projectId}`
- `POST /app/projects/{projectId}/workshop`
- `DELETE /app/projects/{projectId}/workshop`

边界：

- 企划模块不直接实现任务流转。
- 企划详情页可以承载工作流实例视图，但具体状态和操作由工作流实例模块提供。
- 当前 Swagger 未暴露企划删除接口，前端不先做假删除。

### 5.3 项目模块

职责：

- 管理企划下的具体项目。
- 创建项目时绑定流程模板。
- 展示项目列表、进度、当前节点。
- 发布项目。
- 删除项目。

页面：

- 企划详情页中的项目列表区域。
- 项目详情或项目任务流入口。

接口：

- `GET /app/projects/{projectId}/items`
- `POST /app/projects/{projectId}/items`
- `DELETE /app/projects/{projectId}/items/{itemId}`
- `PATCH /app/projects/{projectId}/items/{itemId}/publish`

边界：

- 项目是企划内的执行项。
- 工作流实例挂在项目上，不直接挂在企划列表卡片上。
- 项目模块只负责项目本身的 CRUD 和入口，不负责模板编辑。

### 5.4 工作流模板模块

职责：

- 工作流模板列表。
- 创建个人工作流模板。
- 编辑个人工作流模板。
- 展示模板节点、并行数量、任务数。
- 为项目创建提供可选模板。

页面：

- 工坊页中的工作流入口。
- 工作流模板列表页。
- 工作流模板创建/编辑页。

接口：

- `POST /app/workshop/task-template`
- `POST /app/workshop/task-template/list`
- `PUT /app/workshop/task-template/{templateId}`
- `GET /app/task-template/options`

核心数据：

- `WorkshopTaskTemplateCreateDTO`
- `WorkshopTaskTemplateNodeCreateDTO`
- `WorkshopTaskTemplateVO`
- `WorkshopTaskTemplateNodeVO`

边界：

- 模板只定义流程结构，不包含具体执行状态。
- 模板中的并行关系用 `sort + parallelSort` 表达。
- 当前 Swagger 未暴露模板详情、模板删除、模板启停接口，前端不先做不可落地的操作。

### 5.5 工作流编辑器模块

职责：

- 在模板创建/编辑页中提供拖拽编排能力。
- 添加步骤。
- 删除步骤。
- 修改步骤名称。
- 调整步骤顺序。
- 设置并行组。
- 输出后端需要的 `nodes` 结构。

输入：

- 可选原子任务列表。
- 已有模板节点列表。

输出：

- `nodes: WorkshopTaskTemplateNodeCreateDTO[]`

边界：

- 不做任意节点连线。
- 不做条件分支。
- 不做循环流程。
- 不做 BPMN。
- 只把拖拽结果转换为 `sort + parallelSort`。
- 当前 Swagger 未暴露原子任务列表接口，接入前需要后端补接口，或 MVP 先使用固定 mock 原子任务。

### 5.6 工作流实例与任务模块

职责：

- 获取项目任务流。
- 展示节点状态。
- 展示任务实例列表。
- 接取任务。
- 提交任务。
- 打回任务。
- 放弃任务。
- 重置任务提交。
- 根据任务状态刷新项目进度。

页面：

- 企划详情或项目详情中的任务流视图。
- 任务详情面板。
- 任务提交面板。

接口：

- `GET /app/item/{itemId}/flow`
- `GET /app/task/instance/item/{itemId}`
- `GET /app/task/instance/{instanceId}/detail`
- `POST /app/task/instance/{instanceId}/claim`
- `POST /app/task/instance/{instanceId}/submit`
- `POST /app/task/instance/{instanceId}/reject`
- `POST /app/task/instance/{instanceId}/abandon`
- `POST /app/task/instance/{instanceId}/reset`

边界：

- 不编辑模板结构。
- 不创建企划。
- 不管理项目基础信息。
- 未解锁状态由接口返回的空 `taskStatus` 或空 `taskInstanceId` 派生。

### 5.7 文件上传模块

职责：

- 创建上传资源。
- 使用预签名地址上传文件。
- 返回业务接口需要的 `fileId`。

接口：

- `POST /common/file/upload`

使用场景：

- 企划封面。
- 用户头像。
- 任务提交附件。

边界：

- 文件上传模块不关心业务表单。
- 业务模块只保存 `fileId`，不直接保存上传地址。

### 5.8 工坊模块

职责：

- 展示加入工坊的企划。
- 展示工作流模板入口。
- 承载个人工作流模板管理。

页面：

- 工坊首页。
- 工坊工作流模板列表。

接口：

- `POST /app/workshop/list`
- 工作流模板相关接口。

边界：

- 工坊不是任务广场。
- 工坊不做社区点赞、评论、安利。
- 工坊当前只服务企划浏览和工作流模板管理。

### 5.9 公共 UI 与反馈模块

职责：

- 全局提示。
- 删除确认。
- 加载态。
- 空状态。
- 分页。
- 通用筛选。
- 通用表单布局。

边界：

- 公共 UI 不包含业务请求。
- 业务模块通过 props 或函数调用复用公共 UI。
- shadcn/ui 原始组件不直接改，业务封装放在 `src/components/`。

### 5.10 模块依赖关系

推荐依赖方向：

```txt
登录与会话模块
  ↓
企划模块 ──→ 项目模块 ──→ 工作流实例与任务模块
  ↓              ↑
工坊模块 ──→ 工作流模板模块 ──→ 工作流编辑器模块
  ↓
文件上传模块

公共 UI 与反馈模块被所有业务模块使用
```

实现约束：

- 企划模块可以调用项目模块能力，但不要直接操作任务实例接口。
- 工作流模板模块不依赖企划模块。
- 工作流实例与任务模块只依赖项目 ID 或任务实例 ID。
- 文件上传模块只输出 `fileId`，不耦合具体业务。
- 公共 UI 不反向依赖业务模块。

### 5.11 建议代码目录

当前项目是文件系统路由，页面仍放在 `src/pages/`。业务能力可以按模块拆到 `api`、`types`、`components`、`hooks` 中。

```txt
src/
├── api/
│   ├── auth.ts              # 登录、验证码、退出登录
│   ├── user.ts              # 当前用户、组织上下文
│   ├── planning.ts          # 企划接口
│   ├── projectItem.ts       # 企划内项目接口
│   ├── workflowTemplate.ts  # 工坊工作流模板接口
│   ├── workflowInstance.ts  # 项目任务流和任务实例接口
│   └── file.ts              # 文件上传
├── types/
│   ├── auth.ts
│   ├── user.ts
│   ├── planning.ts
│   ├── projectItem.ts
│   ├── workflowTemplate.ts
│   ├── workflowInstance.ts
│   └── file.ts
├── components/
│   ├── Planning/            # 企划业务组件
│   ├── ProjectItem/         # 项目业务组件
│   ├── WorkflowTemplate/    # 模板列表、模板卡片
│   ├── WorkflowEditor/      # 拖拽编辑器
│   ├── WorkflowInstance/    # 任务流展示、任务操作
│   └── FileUpload/          # 文件上传封装
├── hooks/
│   ├── useCurrentUser.ts
│   ├── useProjectTypes.ts
│   └── useUploadFile.ts
└── pages/
    ├── login.tsx
    └── dashboard/
        ├── planning/
        │   ├── index.tsx
        │   ├── create.tsx
        │   └── [projectId].tsx
        └── workshop/
            ├── index.tsx
            ├── workflows/
            │   └── index.tsx
            └── create.tsx
```

目录约束：

- `api` 只封装 HTTP 请求，不写 UI 状态。
- `types` 只放接口类型和业务类型，不放运行时代码。
- `components/[Module]` 放业务组件，不直接创建路由。
- `pages` 只组合页面、处理路由参数和页面级数据装配。
- 跨模块复用的视觉组件再提到 `src/components/` 下的公共业务组件，不放进 `src/components/ui/`。

## 6. 主流程

### 6.1 创建企划

1. 管理员进入企划列表。
2. 点击创建企划。
3. 填写企划名称、类型、封面、简介。
4. 保存后生成企划。
5. 创建后的企划状态以后端返回为准。

验收标准：

- 企划可以保存。
- 保存后可以在企划列表看到。
- 企划详情可以展示基础信息。
- 企划可以编辑；删除能力等待后端接口。

### 6.2 创建工作流模板

1. 管理员进入工坊。
2. 打开工作流列表。
3. 点击创建工作流。
4. 添加步骤。
5. 通过拖拽调整顺序。
6. 通过拖拽或分组操作配置并行步骤。
7. 保存模板。

验收标准：

- 可以新增、删除、重命名步骤。
- 可以调整步骤顺序。
- 可以把多个步骤设置为同一并行组。
- 保存后能在工作流列表看到模板。
- 模板可以编辑；删除能力等待后端接口。

### 6.3 企划绑定工作流

1. 管理员进入企划详情。
2. 选择一个工作流模板。
3. 系统基于模板生成工作流实例。
4. 企划状态以后端返回为准，通常进入进行中。
5. 第一组可执行任务状态变为 `PENDING`。

验收标准：

- 每个企划可以绑定一个工作流实例。
- 工作流实例展示在企划详情中。
- 未解锁步骤不可接取。
- 第一组任务可以接取。

### 6.4 组员接取任务

1. 组员进入企划详情。
2. 查看当前可接取任务。
3. 点击接取。
4. 任务状态从 `PENDING` 变为 `CLAIMED`。
5. 任务记录执行人。

验收标准：

- 已被接取的任务不能被其他人重复接取。
- 组员只能提交自己接取的任务。
- 管理员可以看到任务执行人。

### 6.5 提交任务并流转

1. 组员提交已接取任务。
2. 任务状态变为 `COMPLETED`。
3. 系统检查当前并行组是否全部完成。
4. 如果全部完成，下一组任务从 `LOCKED` 变为 `PENDING`。
5. 如果当前是最后一组，企划可以进入 `COMPLETED`。

验收标准：

- 单步骤完成后可以解锁下一步。
- 并行步骤不会因为其中一个完成就提前解锁下一步。
- 最后一组全部完成后，企划可以标记完成。

### 6.6 打回任务

1. 管理员或后续步骤负责人选择打回。
2. 选择要打回到的前置步骤。
3. 被打回步骤重新进入 `PENDING` 或 `CLAIMED`。
4. 后续相关步骤回到不可继续的状态。

MVP 简化规则：

- 可以先只支持打回到上一步。
- 打回后，上一步变为 `PENDING`。
- 当前步骤及其后续步骤变回 `LOCKED`。

验收标准：

- 打回后工作流不会继续向后推进。
- 被打回步骤可以重新接取和提交。
- 页面能清楚展示打回状态。

## 7. 页面范围

### 7.1 登录页

MVP 可以保留 mock 登录或基础接口登录。

最低要求：

- 能区分管理员和组员身份。
- 登录后进入企划列表。

### 7.2 企划列表

功能：

- 展示企划卡片。
- 搜索企划。
- 按接口返回的企划类型筛选。
- 创建企划入口。
- 编辑、删除入口。
- 进入企划详情。

不做：

- 高级排序。
- 多维筛选。
- 归档筛选。
- 统计卡片。

### 7.3 企划创建/编辑页

功能：

- 填写基础信息。
- 上传或填写封面。
- 选择接口返回的企划类型。
- 保存草稿。

不做：

- 多步骤复杂表单。
- 成员邀请。
- 资源配额。

### 7.4 企划详情页

功能：

- 展示企划基础信息。
- 展示绑定的工作流实例。
- 管理员可以绑定工作流。
- 组员可以接取和提交任务。
- 管理员可以打回任务。

这是 MVP 的核心页面。

### 7.5 工作流模板列表

功能：

- 展示模板列表。
- 创建模板。
- 编辑模板。
- 删除模板。
- 按类型筛选。

### 7.6 工作流模板编辑页

功能：

- 添加步骤。
- 删除步骤。
- 修改步骤名称和说明。
- 拖拽排序。
- 配置并行步骤。
- 保存模板。

这是 MVP 的第二核心页面。

## 8. 拖拽工作流边界

MVP 的拖拽不是完整自由画布，也不是任意图结构。

### 8.1 应该支持

- 线性排序。
- 并行分组。
- 横向或纵向可视化步骤。
- 拖拽步骤改变顺序。
- 拖拽步骤进入某个并行组。

### 8.2 不应该支持

- 任意节点连线。
- 条件分支。
- 循环流程。
- 多入口流程。
- 多出口流程。
- 节点嵌套。
- 复杂 BPMN。

推荐模型：

```txt
sort=1: 创建
sort=2: 翻译A / 翻译B / 翻译C
sort=3: 校对
sort=4: 审核
sort=5: 发布
```

前端可以表现得像拖拽编排，但数据结构仍然保持 `sort + parallelSort`，降低后端和状态流转复杂度。

## 9. 当前接口对齐

接口来源：

- 用户端 Swagger：`https://sit.neo.oa.api.longlian.online/swagger-ui/index.html?urls.primaryName=用户端`
- 管理端 Swagger：`https://sit.neo.oa.api.longlian.online/swagger-ui/index.html?urls.primaryName=管理端`
- 公共端 Swagger：`/v3/api-docs/公共端`

截至当前文档更新，MVP 主线主要依赖用户端和公共端接口。管理端当前主要包含管理员、组织、定时任务接口，不承载本 MVP 的企划/工作流主线。

所有需要登录态的用户端接口都有 `sessionContext` 查询参数，包含 `userId` 和 `orgId`。前端实现时应以后端实际鉴权封装为准，不在页面层手写业务鉴权逻辑。

### 9.1 企划接口

| 方法     | 路径                                 | 用途             | 关键数据                                                       |
| -------- | ------------------------------------ | ---------------- | -------------------------------------------------------------- |
| `GET`    | `/app/projects`                      | 分页查询企划列表 | `ProjectListDTO`，返回 `PageResultVOProjectInfoVO`             |
| `POST`   | `/app/projects`                      | 创建企划         | `ProjectCreateDTO`                                             |
| `GET`    | `/app/projects/types`                | 获取企划类型列表 | 返回 `ProjectTypeInfoVO[]`，类型示例包括漫画、小说、美术、视频 |
| `GET`    | `/app/projects/{projectId}`          | 获取企划详情     | 返回 `ProjectDetailInfoVO`                                     |
| `PUT`    | `/app/projects/{projectId}`          | 编辑企划         | `ProjectUpdateDTO`                                             |
| `POST`   | `/app/projects/{projectId}/workshop` | 添加企划到工坊   | 当前用户维度                                                   |
| `DELETE` | `/app/projects/{projectId}/workshop` | 从工坊移除企划   | 当前用户维度                                                   |

当前 Swagger 未暴露企划删除接口。MVP 若需要“删除企划”，需要后端补接口，或前端先隐藏删除能力。

企划创建字段以接口为准：

- `title`：企划名。
- `alias`：别名。
- `typeId`：企划类型 ID，不使用前端硬编码类型。
- `metadata`：扩展信息 JSON 字符串。
- `description`：企划简介。
- `coverFileId`：封面文件 ID。

企划状态以接口返回为准：

- `进行中`
- `已完成`
- `已归档`

前端内部可以做展示映射，但不要自造与接口冲突的状态枚举。

### 9.2 项目接口

后端接口中，企划下面还有“项目”概念。MVP 中可以把项目理解为企划内的具体执行项，项目绑定流程模板后生成任务流。

| 方法     | 路径                                               | 用途             | 关键数据                                                   |
| -------- | -------------------------------------------------- | ---------------- | ---------------------------------------------------------- |
| `GET`    | `/app/projects/{projectId}/items`                  | 分页查询项目列表 | `ProjectItemListDTO`，返回 `PageResultVOProjectItemListVO` |
| `POST`   | `/app/projects/{projectId}/items`                  | 创建项目         | `ProjectItemCreateDTO`                                     |
| `DELETE` | `/app/projects/{projectId}/items/{itemId}`         | 删除项目         | 删除企划内项目                                             |
| `PATCH`  | `/app/projects/{projectId}/items/{itemId}/publish` | 公布项目         | 项目状态进入发布态                                         |

创建项目字段：

- `title`：项目标题。
- `taskTemplateId`：流程模板 ID。

项目列表返回字段包含：

- `status`：`IN_PROGRESS`、`COMPLETED`、`PUBLISHED`。
- `progressPercent`：进度百分比。
- `currentNodeName`：当前节点名称。
- `nodes`：项目流程节点，包含 `sort`、`parallelSort`、`state`、`parallelCount`。

### 9.3 工坊与工作流模板接口

当前自定义工作流模板走工坊接口，不使用旧文档里的 `/app/task/template` 路径。

| 方法   | 路径                                       | 用途                       | 关键数据                                                             |
| ------ | ------------------------------------------ | -------------------------- | -------------------------------------------------------------------- |
| `POST` | `/app/workshop/list`                       | 分页查询工坊企划列表       | `WorkshopListDTO`，返回 `PageResultVOWorkshopProjectInfoVO`          |
| `POST` | `/app/workshop/task-template`              | 创建工坊个人任务流模板     | `WorkshopTaskTemplateCreateDTO`                                      |
| `POST` | `/app/workshop/task-template/list`         | 分页查询工坊任务流模板列表 | `WorkshopTaskTemplateDTO`，返回 `PageResultVOWorkshopTaskTemplateVO` |
| `PUT`  | `/app/workshop/task-template/{templateId}` | 更新工坊个人任务流模板     | `WorkshopTaskTemplateCreateDTO`                                      |
| `GET`  | `/app/task-template/options`               | 获取用户可选流程模板       | 返回 `TaskTemplateOptionVO[]`                                        |

模板创建字段：

- `name`：流程模板名称。
- `description`：流程模板说明。
- `nodes`：流程模板节点列表。

模板节点字段：

- `baseTaskId`：关联原子任务 ID。
- `customName`：自定义任务实例名。
- `sort`：步骤顺序，同一 `sort` 表示并行节点。
- `parallelSort`：并行组内展示顺序。

模板列表返回字段：

- `scope`：`PERSONAL` 或 `ORGANIZATION`。
- `taskCount`：任务总数。
- `nodes`：按 `sort` 升序排列，`sort` 相同表示并行。
- `isMine`：是否为我创建的模板。

当前 Swagger 未暴露模板详情、模板删除、启用/停用接口。MVP 页面如果需要这些能力，需要后端补接口，或先只支持列表、创建、更新。

### 9.4 工作流实例与任务接口

| 方法   | 路径                                      | 用途                           | 关键数据                    |
| ------ | ----------------------------------------- | ------------------------------ | --------------------------- |
| `GET`  | `/app/item/{itemId}/flow`                 | 获取项目任务流，含节点执行状态 | 返回 `ItemTaskFlowVO`       |
| `GET`  | `/app/task/instance/item/{itemId}`        | 查询项目下任务实例列表         | 返回 `ItemTaskInstanceVO[]` |
| `GET`  | `/app/task/instance/{instanceId}/detail`  | 查看任务实例详情               | 返回最近一次提交 metadata   |
| `POST` | `/app/task/instance/{instanceId}/claim`   | 接取任务                       | 状态进入 `CLAIMED`          |
| `POST` | `/app/task/instance/{instanceId}/submit`  | 提交任务                       | `TaskSubmitDTO`             |
| `POST` | `/app/task/instance/{instanceId}/reject`  | 打回任务                       | `TaskRejectDTO`             |
| `POST` | `/app/task/instance/{instanceId}/abandon` | 放弃任务                       | 放弃当前接取                |
| `POST` | `/app/task/instance/{instanceId}/reset`   | 重置任务提交                   | 重置提交结果                |

任务流节点字段：

- `baseTaskId`：原子任务 ID。
- `name`：任务名称。
- `metaSchema`：节点元数据字段定义快照，JSON 数组字符串。
- `sort`：步骤顺序。
- `parallelSort`：并行组内顺序。
- `taskInstanceId`：任务实例 ID，未解锁时可能为空。
- `taskStatus`：`PENDING`、`CLAIMED`、`COMPLETED`，为空表示未解锁。

当前接口任务状态只有 `PENDING`、`CLAIMED`、`COMPLETED`。前端文档中用于表达未解锁的 `LOCKED` 是 UI 派生状态，不应作为提交给后端的状态值。

任务提交字段：

- `metadata`：提交元数据 JSON 字符串，例如 `{"values":{"attachment":{"fileId":123},"author":"张三"}}`。

任务打回字段：

- `reviewComment`：打回意见。

### 9.5 登录、用户和文件接口

| 方法     | 路径                                               | 用途                             | 关键数据                         |
| -------- | -------------------------------------------------- | -------------------------------- | -------------------------------- |
| `POST`   | `/app/session/pwd`                                 | 密码登录                         | `LoginByPwdDTO`，返回 `LoginVO`  |
| `POST`   | `/app/session/email/code`                          | 发送邮箱验证码                   | `EmailCodeDTO`                   |
| `POST`   | `/app/session/email`                               | 验证码登录                       | `LoginByCodeDTO`，返回 `LoginVO` |
| `DELETE` | `/app/session/`                                    | 退出登录                         | 用户端登出                       |
| `GET`    | `/app/user/`                                       | 获取当前登录用户信息             | 返回 `UserInfoVO`                |
| `POST`   | `/app/user/register/create-organization`           | 通过邀请码注册并创建组织         | `RegisterByInviteDTO`            |
| `POST`   | `/app/user/register/join-organization`             | 通过邀请码注册并加入组织         | `RegisterByInviteDTO`            |
| `GET`    | `/app/user/register/join-organization/invite-info` | 获取加入组织邀请码对应的组织信息 | `InviteInfoVO`                   |
| `POST`   | `/app/user/organizations/join-by-invite`           | 已注册用户通过邀请码加入组织     | `JoinByInviteCodeDTO`            |
| `POST`   | `/common/file/upload`                              | 创建文件上传                     | 获取预签名上传地址               |

登录返回字段：

- `userId`：用户 ID。
- `currentOrgId`：当前组织 ID。
- `token`：用户认证 token。
- `roles`：当前组织内用户角色列表。

验证码业务类型：

- `LOGIN`：登录。
- `REGISTER`：注册。
- `FORGOT_PASSWORD`：忘记密码。

注册字段：

- `inviteCode`：邀请码。
- `username`：用户名。
- `password`：密码。
- `nickname`：昵称。
- `email`：邮箱。
- `code`：邮箱验证码。
- `orgName`：组织名称，仅创建组织的邀请码场景必填。

文件上传流程：

1. 调用 `/common/file/upload` 创建上传资源。
2. 后端返回 `fileId`、`uploadUrl`、`key`、`storageType`。
3. 前端使用 `uploadUrl` 上传到存储服务。
4. 业务接口保存 `fileId`，如企划封面 `coverFileId` 或任务提交附件。

上传业务类型：

- `avatar`
- `cover`
- `task_submit`

### 9.6 后端待补能力

为了完整覆盖 MVP，当前 Swagger 仍缺少或不明确的能力：

- 删除企划。
- 工作流模板详情。
- 删除工作流模板。
- 启用/停用工作流模板。
- 可选原子任务列表。
- 企划完成或取消的显式接口。
- 任务打回的精确回退规则说明。
- 找回密码的最终重置密码提交接口。

## 10. 非功能要求

### 10.1 前端实现

- React + TypeScript。
- 页面路由遵守 `vite-plugin-pages` 文件系统路由。
- UI 组件优先使用 shadcn/ui。
- 样式只用 Tailwind utility class 和 `cn()`。
- 不为 MVP 引入复杂状态管理库，除非出现明确共享状态痛点。

### 10.2 数据一致性

- 任务接取必须防重复。
- 工作流状态流转以后端结果为准。
- 前端可以乐观更新，但接口失败必须回滚或重新拉取。

### 10.3 体验要求

- 操作成功和失败要有全局提示。
- 删除类操作必须确认。
- 工作流当前状态必须清晰可读。
- 未解锁任务必须明显不可操作。

## 11. MVP 完成标准

MVP 完成不是页面都画出来，而是以下链路可以完整跑通：

1. 管理员登录。
2. 管理员创建一个接口类型列表中的企划。
3. 管理员创建一个工作流模板。
4. 管理员把工作流绑定到企划。
5. 组员登录。
6. 组员进入企划详情。
7. 组员接取第一步任务。
8. 组员提交任务。
9. 工作流正确解锁下一步。
10. 并行步骤全部完成后，下一步才解锁。
11. 管理员可以打回任务。
12. 所有步骤完成后，企划可以结束。

只要这条链路稳定，MVP 就成立。

## 12. 明确不做的极端

### 12.1 不做成完整社区平台

安利、点赞、通知、统计、归档都延后。当前版本不是社区产品，先验证协作流程。

### 12.2 不做成企业级 BPM 系统

工作流只支持顺序和并行，不支持复杂条件、任意连线、审批表达式和流程脚本。

### 12.3 不做成全权限后台

MVP 只区分管理员和组员，不做角色矩阵、等级系统、资源配额。

### 12.4 不做过度通用化

当前只服务汉化协作主线。企划类型来自接口，不在前端硬编码，但页面和接口不为未知业务过度抽象。

## 13. 后续版本候选

MVP 稳定后再考虑：

- 代办中心。
- 任务广场。
- 安利社区。
- 归档。
- 站内信。
- 数据统计。
- 多租户管理端。
- 成员和权限管理。
- 更完整的工作流审批能力。
- 移动端专项体验。
