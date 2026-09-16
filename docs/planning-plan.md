# 企划任务流前端设计方案

## 1. 核心概念对齐

### 1.1 后端数据模型

```
原子任务(BaseTask) ──→ 任务模板(TaskTemplate) ──→ 项目任务流(ItemTaskFlow)
     [翻译/校对]          [漫画流程:翻译→校对→嵌字]      [具体项目的实例化流程]
```

**关键字段说明：**

- `sort`: 步骤顺序，**相同值表示并行节点**（如翻译A和翻译B同时sort=1）
- `parallelSort`: 并行组内排序，控制展示顺序
- `taskStatus`: PENDING(待接取) / CLAIMED(已接取) / COMPLETED(已完成) / null(未解锁)

### 1.2 与之前讨论的"图结构"差异

| 概念     | 之前的设想               | 后端实际                         |
| -------- | ------------------------ | -------------------------------- |
| 流程结构 | 有向图，任意节点可连接   | 线性列表，sort控制顺序           |
| 并行     | 通过分支节点实现         | 相同sort值即为并行               |
| 打回     | 反向边，可回退到任意节点 | 独立reject接口，回退逻辑后端控制 |
| 模板变更 | 实时影响                 | 创建时快照，不影响已有任务流     |

**结论**：放弃 React Flow 的复杂图编辑，改用**垂直时间轴 + 并行组横向排列**的可视化方案。

---

## 2. 页面结构与路由

```
/app/planning                    # 企划列表（默认页）
/app/planning/:projectId         # 企划详情 + 任务流可视化
/app/planning/templates          # 任务模板管理（管理员）
/app/planning/base-tasks         # 原子任务管理（管理员）
```

---

## 3. 核心组件设计

### 3.1 任务流可视化组件

```tsx
// 垂直时间轴 + 并行组横向排列
<TaskFlowViewer
  nodes={itemTaskFlow.nodes} // ItemTaskNodeVO[]
  currentUserId={userId}
  onClaim={handleClaim} // 接取任务
  onSubmit={handleSubmit} // 提交任务
  onReject={handleReject} // 打回任务
/>
```

**视觉设计：**

```
●─────── 创建 ───────●     ← sort=0, 单节点
                     │
    ┌────────────────┼────────────────┐
    │                │                │
    ▼                ▼                ▼
● 翻译A ●      ● 翻译B ●      ● 翻译C ●   ← sort=1, 并行组（横向排列）
    │                │                │
    └────────────────┼────────────────┘
                     │
●─────── 校对 ───────●     ← sort=2, 单节点
                     │
●─────── 嵌字 ───────●     ← sort=3, 单节点
```

**节点状态样式：**

- `null`（未解锁）：灰色虚线边框，不可交互
- `PENDING`（待接取）：蓝色边框，显示"接取"按钮
- `CLAIMED`（已接取）：橙色边框，显示执行人头像 + "提交"按钮
- `COMPLETED`（已完成）：绿色填充，显示完成标记

### 3.2 模板编辑器

```tsx
<TemplateEditor initialData={taskTemplate} onSave={handleSave} />
```

**功能：**

1. 左侧：原子任务库（可拖拽）
2. 中间：垂直时间轴编辑区
3. 右侧：节点属性面板（配置metaSchema）

**编辑操作：**

- 拖拽原子任务到时间轴 → 添加节点
- 拖拽节点上下移动 → 调整sort顺序
- 将节点拖入同一水平线 → 设为并行（相同sort）
- 点击节点 → 编辑属性（metaSchema字段定义）

### 3.3 任务提交面板

```tsx
<TaskSubmitPanel
  taskInstance={taskInstance}
  metaSchema={metaSchema} // JSON字段定义
  onSubmit={handleSubmit}
/>
```

**根据metaSchema动态渲染表单：**

```json
[
  { "name": "附件", "fieldType": "file", "required": true },
  { "name": "作者", "fieldType": "text", "required": true },
  { "name": "源链接", "fieldType": "text", "required": false }
]
```

---

## 4. 状态管理

### 4.1 服务器状态（TanStack Query）

```ts
// 查询键设计
const queryKeys = {
  projectDetail: (id: string) => ["project", "detail", id],
  taskFlow: (itemId: string) => ["taskFlow", itemId],
  taskInstances: (projectId: string) => ["taskInstances", projectId],
  taskSubmissions: (instanceId: string) => ["submissions", instanceId],
  templates: (params: object) => ["templates", params],
  baseTasks: (params: object) => ["baseTasks", params],
};
```

### 4.2 本地状态（Zustand）

```ts
interface WorkflowStore {
  // 模板编辑状态
  editingTemplate: TaskTemplateCreateDTO | null;
  selectedNodeId: number | null;

  // 操作
  addNode: (baseTaskId: number) => void;
  removeNode: (nodeId: number) => void;
  moveNode: (nodeId: number, direction: "up" | "down") => void;
  setParallel: (nodeIds: number[]) => void; // 设为相同sort
  updateNodeMeta: (nodeId: number, meta: object) => void;
}
```

---

## 5. 关键交互流程

### 5.1 创建企划 + 任务流

```
1. 用户点击"创建企划"
2. 填写企划基本信息（标题/类型/封面等）
3. 获取企划类型 → GET /app/projects/types
4. 选择任务模板（下拉列表 GET /app/task-template/options）
5. 创建企划 → POST /app/projects
6. 创建项目并绑定模板 → POST /app/projects/{projectId}/items
7. 获取项目任务流 → GET /app/item/{itemId}/flow
8. 跳转企划详情页，展示任务流
```

### 5.2 任务流转

```
接取任务：
POST /app/task/instance/{instanceId}/claim
→ 状态变为 CLAIMED
→ 显示提交表单

提交任务：
POST /app/task/instance/{instanceId}/submit
→ 上传文件（如需要）→ POST /common/file/upload 获取预签名上传地址
→ 提交metadata → POST submit
→ 状态变为 COMPLETED
→ 解锁下一节点（如有）

打回任务：
POST /app/task/instance/{instanceId}/reject
→ 填写reviewComment
→ 状态回退（后端控制回退到哪里）
→ 重新变为可接取状态
```

### 5.3 提交记录查看

```
GET /app/task/instance/{instanceId}/detail
→ 查看最近一次提交的 metadata
→ 当前 Swagger 未暴露独立提交记录列表和下载接口
```

---

## 6. 后端接口清单

### 6.1 工坊任务流模板管理

| 接口                                       | 方法 | 用途                       |
| ------------------------------------------ | ---- | -------------------------- |
| `/app/workshop/task-template`              | POST | 创建工坊个人任务流模板     |
| `/app/workshop/task-template/list`         | POST | 分页查询工坊任务流模板列表 |
| `/app/workshop/task-template/{templateId}` | PUT  | 更新工坊个人任务流模板     |
| `/app/task-template/options`               | GET  | 获取用户可选流程模板       |

### 6.2 原子任务管理

当前 Swagger 未暴露可选原子任务列表接口。工作流模板节点需要 `baseTaskId`，前端接入拖拽模板编辑前需要后端补充原子任务来源，或先使用固定 mock 原子任务。

### 6.3 项目任务流

| 接口                      | 方法 | 用途                             |
| ------------------------- | ---- | -------------------------------- |
| `/app/item/{itemId}/flow` | GET  | 获取项目任务流（含节点执行状态） |

### 6.4 任务实例操作

| 接口                                      | 方法 | 用途                             |
| ----------------------------------------- | ---- | -------------------------------- |
| `/app/task/instance/item/{itemId}`        | GET  | 查询项目下的任务实例列表         |
| `/app/task/instance/{instanceId}/detail`  | GET  | 查看任务实例详情                 |
| `/app/task/instance/{instanceId}/claim`   | POST | 接取任务                         |
| `/app/task/instance/{instanceId}/submit`  | POST | 提交任务                         |
| `/app/task/instance/{instanceId}/reset`   | POST | 重置任务提交                     |
| `/app/task/instance/{instanceId}/reject`  | POST | 打回任务                         |
| `/app/task/instance/{instanceId}/abandon` | POST | 放弃任务                         |
| `/common/file/upload`                     | POST | 创建文件上传，获取预签名上传地址 |

### 6.5 企划与项目

| 接口                                               | 方法   | 用途             |
| -------------------------------------------------- | ------ | ---------------- |
| `/app/projects`                                    | GET    | 分页查询企划列表 |
| `/app/projects`                                    | POST   | 创建企划         |
| `/app/projects/types`                              | GET    | 获取企划类型列表 |
| `/app/projects/{projectId}`                        | GET    | 获取企划详情     |
| `/app/projects/{projectId}`                        | PUT    | 编辑企划         |
| `/app/projects/{projectId}/items`                  | GET    | 分页查询项目列表 |
| `/app/projects/{projectId}/items`                  | POST   | 创建项目         |
| `/app/projects/{projectId}/items/{itemId}`         | DELETE | 删除项目         |
| `/app/projects/{projectId}/items/{itemId}/publish` | PATCH  | 公布项目         |
| `/app/projects/{projectId}/workshop`               | POST   | 添加企划到工坊   |
| `/app/projects/{projectId}/workshop`               | DELETE | 从工坊移除企划   |

当前 Swagger 未暴露企划删除接口。

---

## 7. 核心数据结构

### 7.1 工坊任务流模板创建

```ts
interface WorkshopTaskTemplateCreateDTO {
  name: string; // 模板名称
  description?: string; // 模板说明
  nodes: WorkshopTaskTemplateNodeCreateDTO[];
}

interface WorkshopTaskTemplateNodeCreateDTO {
  baseTaskId: string; // 关联原子任务ID
  customName?: string; // 自定义任务实例名
  sort: number; // 步骤顺序（相同值=并行）
  parallelSort?: number; // 并行组内排序
}
```

### 7.2 任务流节点（运行时）

```ts
interface ItemTaskNodeVO {
  id: string;
  baseTaskId: string;
  name: string;
  baseTaskIconUrl?: string;
  metaSchema: string; // JSON字段定义快照
  sort: number;
  parallelSort: number;
  taskInstanceId?: string;
  taskStatus: "PENDING" | "CLAIMED" | "COMPLETED" | null;
}
```

### 7.3 任务实例

```ts
interface ItemTaskInstanceVO {
  id: string;
  name: string;
  status: "PENDING" | "CLAIMED" | "COMPLETED";
  assigneeId?: string;
  assigneeNickname?: string;
  assigneeAvatarUrl?: string;
  sort: number;
  parallelSort: number;
  createdAt: string;
  completedAt?: string;
}
```

### 7.4 任务详情与提交

```ts
interface TaskInstanceDetailVO {
  metadata?: string; // 最近一次提交的元数据JSON字符串
}

interface TaskSubmitDTO {
  metadata?: string; // 示例：{"values":{"attachment":{"fileId":123},"author":"张三"}}
}

interface TaskRejectDTO {
  reviewComment: string; // 打回意见
}
```

当前 Swagger 未暴露独立提交记录列表，页面如需历史记录需要后端补接口。

---

## 8. 技术选型

| 需求         | 方案                                              |
| ------------ | ------------------------------------------------- |
| 任务流可视化 | 自研垂直时间轴组件（无需React Flow）              |
| 模板编辑器   | 拖拽排序用 @dnd-kit，并行组用 CSS Grid            |
| 动态表单     | 基于 metaSchema 动态渲染                          |
| 文件上传     | 分片上传 + 进度条                                 |
| 状态管理     | TanStack Query（服务器状态）+ Zustand（本地状态） |

---

## 9. 开发优先级

### Phase 1：基础展示（MVP）

1. 企划列表页
2. 企划详情页 + 任务流可视化（只读）
3. 任务接取/提交/打回基础功能

### Phase 2：模板管理

4. 原子任务管理
5. 任务模板管理（列表 + 基础编辑）

### Phase 3：高级功能

6. 模板可视化编辑器（拖拽排序、并行组设置）
7. 提交记录历史查看
8. 文件上传优化（大文件分片）

---

## 10. 已确认问题

| 问题             | 确认结果                                                                              |
| ---------------- | ------------------------------------------------------------------------------------- |
| **打回逻辑**     | 后端控制回退目标节点，前端展示：①"被打回"状态标签 ②打回理由 ③红色反向流转线           |
| **并行任务分配** | **自选机制**。并行节点（如翻译A/B/C）生成多个独立任务实例，用户主动接取自己想做的任务 |
| **文件版本**     | 通过 `metadata.attachment.fileId` 引用文件。（TODO：文件上传接口后端未提供）          |
| **通知机制**     | （TODO：通知接口后端未提供）                                                          |

---

## 11. 打回功能详细设计

### 11.1 视觉表现

```
●─────── 校对 ●────────┐
           ↑           │ 红色虚线表示打回
           └───────────┘
           "翻译术语错误，请重新核对"
           打回人：管理员A · 2小时前
```

**打回节点样式：**

- 节点边框：红色（`border-red-500`）
- 状态标签：「被打回」红色 badge
- 连接线：红色虚线（`stroke-red-500 stroke-dashed`）
- 悬停提示：显示打回理由、打回人、时间

### 11.2 交互流程

```
1. 审核员点击「打回」按钮
2. 弹出对话框：
   ┌────────────────────────────┐
   │ 打回任务：翻译             │
   │                            │
   │ 打回理由：                 │
   │ ┌────────────────────────┐ │
   │ │ 术语翻译不准确，请参   │ │
   │ │ 考术语表重新核对       │ │
   │ └────────────────────────┘ │
   │                            │
   │ [取消]      [确认打回]     │
   └────────────────────────────┘
3. POST /reject → 成功后刷新任务流
4. 翻译节点显示红色「被打回」状态
5. 原接取人收到通知（WebSocket/轮询）
```

---

## 12. 并行任务接取设计

### 12.1 场景示例

```
●─────── 图源 ───────●
                     │
    ┌────────────────┼────────────────┐
    │                │                │
    ▼                ▼                ▼
● 翻译(日→中) ●  ● 翻译(英→中) ●  ● 润色 ●
   [接取]            [接取]           [接取]
    │                │                │
```

**规则：**

- 一个用户**只能接取一个并行任务**（防止垄断）
- 接取后显示「进行中」，他人不能再接取
- 可以「放弃」任务，释放给其他人

### 12.2 接取限制检查

```ts
function canClaim(taskInstance: TaskInstanceVO, currentUserId: number): boolean {
  // 1. 任务状态必须是 PENDING
  if (taskInstance.status !== "PENDING") return false;

  // 2. 同一并行组是否已接取其他任务
  const parallelGroup = getParallelGroup(taskInstance);
  const hasClaimedOther = parallelGroup.some((t) => t.assigneeId === currentUserId);
  if (hasClaimedOther) return false;

  return true;
}
```

---

## 13. 文件处理（TODO）

> **状态**：后端 API 未提供文件上传接口，待补充。

---

## 14. 通知机制（TODO）

> **状态**：后端 API 未提供通知相关接口，待补充。
