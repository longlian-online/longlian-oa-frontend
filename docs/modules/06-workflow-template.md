# 06 工作流模板模块

## 目标

完成工作流模板的列表、创建、编辑和模板选项能力，为项目创建和工作流编辑器提供模板数据。

## 范围

必须实现：

- 查询工坊任务流模板列表。
- 创建个人任务流模板。
- 更新个人任务流模板。
- 获取可选流程模板。
- 展示模板节点、并行数量、任务数。

暂不实现：

- 模板详情独立接口，当前 Swagger 未暴露。
- 模板删除，当前 Swagger 未暴露。
- 模板启用/停用，当前 Swagger 未暴露。
- 组织级模板管理。

## 页面

```txt
src/pages/dashboard/workshop/workflows/index.tsx
src/pages/dashboard/workshop/create.tsx
```

## 建议文件

```txt
src/
├── api/
│   └── workflowTemplate.ts
├── types/
│   └── workflowTemplate.ts
└── components/
    └── WorkflowTemplate/
```

## 接口

| 方法   | 路径                                       | 用途                       |
| ------ | ------------------------------------------ | -------------------------- |
| `POST` | `/app/workshop/task-template`              | 创建工坊个人任务流模板     |
| `POST` | `/app/workshop/task-template/list`         | 分页查询工坊任务流模板列表 |
| `PUT`  | `/app/workshop/task-template/{templateId}` | 更新工坊个人任务流模板     |
| `GET`  | `/app/task-template/options`               | 获取用户可选流程模板       |

## 数据结构

```ts
interface WorkshopTaskTemplateCreateDTO {
  name: string;
  description?: string;
  nodes: WorkshopTaskTemplateNodeCreateDTO[];
}

interface WorkshopTaskTemplateNodeCreateDTO {
  baseTaskId: string;
  customName?: string;
  sort: number;
  parallelSort?: number;
}

interface WorkshopTaskTemplateVO {
  id: string;
  name: string;
  description?: string;
  scope: "PERSONAL" | "ORGANIZATION";
  taskCount: number;
  nodes: WorkshopTaskTemplateNodeVO[];
  isMine: boolean;
}
```

## 验收标准

- 工作流模板列表能分页展示。
- `+N` 并行标识只在并行数大于 1 时显示。
- 创建模板后能回到列表并看到新模板。
- 更新模板后列表数据刷新。
- 没有后端删除接口时不展示不可用删除功能。

## 依赖

- 依赖登录与会话模块。
- 依赖公共 UI 与反馈模块。
- 依赖工作流编辑器模块输出 `nodes`。
