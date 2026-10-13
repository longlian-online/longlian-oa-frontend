# 09 工坊模块

## 目标

整合工坊首页和工作流入口。工坊在 MVP 中不是社区广场，只承担企划浏览和工作流模板管理入口。

## 范围

必须实现：

- 工坊企划列表。
- 按关键词、企划类型、是否我创建筛选。
- 顶部筛选栏在同一行展示：左侧为所有类型及横向类型按钮，随后为“我创建的”和企划搜索；不再展示类型下拉选择器或顶部说明文案。
- 类型按钮遵循 `GET /app/projects/types` 的返回顺序（优先级降序，同值按 ID 升序），前端不额外排序；类型过多时仅类型区域水平滚动，按钮不折行。
- 组织管理端企划类型支持显示和编辑整数优先级，新增默认 `0`；优先级仅改变用户端类型接口顺序，不影响管理列表、企划或工坊企划列表排序。
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
- 窄屏下类型区域可水平滚动，“我创建的”和搜索仍可操作；类型按钮支持键盘操作并展示选中状态。
- 工作流按钮能进入模板列表。
- 模板列表能展示创建入口和模板卡片。
- 工坊不出现安利、点赞、评论等非 MVP 功能。

## 依赖

- 依赖企划模块进入详情。
- 依赖工作流模板模块展示模板。
- 依赖公共 UI 与反馈模块处理列表状态。
