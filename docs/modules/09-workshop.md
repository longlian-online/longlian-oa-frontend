# 09 工坊模块

## 目标

整合工坊首页和工作流入口。工坊在 MVP 中不是社区广场，只承担企划浏览和工作流模板管理入口。

## 范围

必须实现：

- 工坊企划列表。
- 按关键词、企划类型、是否我创建筛选。
- 进入企划详情。
- 进入工作流模板列表。
- 从工作流模板列表进入创建/编辑。

暂不实现：

- 任务广场。
- 安利社区。
- 点赞、评论、收藏。
- 站内信。
- 数据统计。

## 页面

```txt
src/pages/dashboard/workshop/index.tsx
src/pages/dashboard/workshop/workflows/index.tsx
src/pages/dashboard/workshop/create.tsx
```

## 建议文件

```txt
src/
├── api/
│   └── workshop.ts
├── types/
│   └── workshop.ts
└── components/
    └── Workshop/
```

## 接口

| 方法   | 路径                               | 用途                       |
| ------ | ---------------------------------- | -------------------------- |
| `POST` | `/app/workshop/list`               | 分页查询工坊企划列表       |
| `POST` | `/app/workshop/task-template/list` | 分页查询工坊任务流模板列表 |

工作流模板创建和更新复用工作流模板模块接口。

## 数据结构

```ts
interface WorkshopListDTO {
  pageNum?: number;
  pageSize?: number;
  keyword?: string;
  projectType?: string;
  isMyCreated?: boolean;
}

interface WorkshopProjectInfoVO {
  id: number;
  title: string;
  coverUrl: string;
  creatorAvatarUrl?: string;
  lastSubmitterUsername?: string;
  lastSubmitterAt?: string;
}
```

## 验收标准

- 工坊页能展示企划卡片。
- 工作流按钮能进入模板列表。
- 模板列表能展示创建入口和模板卡片。
- 工坊不出现安利、点赞、评论等非 MVP 功能。

## 依赖

- 依赖企划模块进入详情。
- 依赖工作流模板模块展示模板。
- 依赖公共 UI 与反馈模块处理列表状态。
