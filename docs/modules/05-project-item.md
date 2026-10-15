# 05 项目模块

## 目标

管理企划下的具体项目。项目是企划内真正绑定工作流模板并执行任务流的对象。

## 范围

必须实现：

- 查询企划下项目列表。
- 创建项目并绑定流程模板。
- 删除项目。
- 展示项目进度、当前节点和节点概览。
- 按「进行中 / 已完成 / 全部」筛选，默认展示进行中。已完成指至少有一个任务且全部任务已完成；没有任务或仍有未完成任务的项目属于进行中。全部包含这两类。
- 支持「最早发布 / 最新发布」排序，默认最新发布；切换状态或排序时回到第一页，切换状态保留排序。
- 排序复用列表接口的 `sortByTime=CREATE` 和 `orderDir=ASC/DESC`（当前接口无独立发布时间字段，按条目创建时间排序）。
- 全部状态显式发送 `status=`，避免省略参数时触发后端默认进行中筛选。

暂不实现：

- 项目高级筛选。
- 项目批量操作。
- 项目统计。
- 项目归档。

## 页面

项目模块优先嵌入企划详情页：

```txt
src/pages/dashboard/planning/[projectId].tsx
```

后续如复杂度上升，再拆项目详情页。

## 建议文件

```txt
src/
├── api/
│   └── projectItem.ts
├── types/
│   └── projectItem.ts
└── components/
    └── ProjectItem/
```

## 接口

| 方法     | 路径                                       | 用途             |
| -------- | ------------------------------------------ | ---------------- |
| `GET`    | `/app/projects/{projectId}/items`          | 分页查询项目列表 |
| `POST`   | `/app/projects/{projectId}/items`          | 创建项目         |
| `DELETE` | `/app/projects/{projectId}/items/{itemId}` | 删除项目         |

## 数据结构

```ts
interface ProjectItemCreateDTO {
  title: string;
  taskTemplateId: string;
}

interface ProjectItemListVO {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  progressPercent: number;
  currentNodeName?: string;
  nodes: ProjectItemNodeVO[];
}

interface ProjectItemNodeVO {
  name: string;
  sort: number;
  parallelSort: number;
  state: "COMPLETED" | "IN_PROGRESS" | "LOCKED";
  parallelCount: number;
}
```

## 验收标准

- 企划详情中能看到项目列表。
- 创建项目时必须选择流程模板。
- 项目卡片能展示进度和当前节点。
- 删除项目需要确认。
- 已完成筛选只返回全部任务已完成的项目；没有任务的项目留在进行中。状态筛选及排序在后端分页前执行，项目卡片与网格样式保持不变。

## 依赖

- 依赖企划模块提供 `projectId`。
- 依赖工作流模板模块提供模板选项。
- 后续工作流实例与任务模块依赖本模块的 `itemId`。
