# 05 项目模块

## 目标

管理企划下的具体项目。项目是企划内真正绑定工作流模板并执行任务流的对象。

## 范围

必须实现：

- 查询企划下项目列表。
- 创建项目并绑定流程模板。
- 项目任务详情和企划详情的项目列表都向企划负责人提供删除。没有已提交任务时确认后直接删除：详情页回到企划详情，列表留在当前页并刷新。仍有已提交任务时填写原因提交删除申请，由组织管理员审核。非负责人看不到删除。
- 展示项目进度、当前节点和节点概览。
- 按「进行中 / 已完成 / 全部」筛选，默认展示进行中。已完成指至少有一个任务且全部任务已完成；没有任务或仍有未完成任务的项目属于进行中。全部包含这两类。
- 所有成员固定按企划负责人维护的自定义顺序查看项目，不提供项目列表排序方式切换控件；切换状态时回到第一页。
- 列表查询固定发送 `sortBy=MANUAL`；状态筛选只过滤企划全局顺序，在后端分页前执行。
- 负责人通过独立的全量标题弹层拖动、上下移动或指定位置，保存才写入；不在分页项目卡片上拖拽。保存成功保持状态并回到第一页；失败保留草稿，重新加载或放弃修改需要确认。
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

| 方法   | 路径                                                         | 用途                           |
| ------ | ------------------------------------------------------------ | ------------------------------ |
| `GET`  | `/app/projects/{projectId}/items`                            | 分页查询项目列表               |
| `POST` | `/app/projects/{projectId}/items`                            | 创建项目                       |
| `GET`  | `/app/projects/{projectId}/items/order`                      | 获取全部排序标题（仅负责人）   |
| `PUT`  | `/app/projects/{projectId}/items/order`                      | 保存完整自定义顺序（仅负责人） |
| `DELETE` | `/app/projects/{projectId}/items/{itemId}`                   | 直接删除没有已提交任务的项目   |
| `POST`   | `/app/projects/{projectId}/items/{itemId}/deletion-requests` | 提交项目删除申请               |

保存顺序的请求为 `{ expectedItemIds: string[], itemIds: string[] }`，原序列用于检测并发新增、删除或重排；不能提交过滤后的部分项目。接口拒绝冲突，不静默覆盖；相同目标的成功请求可以安全重试。排序标题只返回 `{ id: string, title: string }`，不加载全部任务节点。

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
- 没有已提交任务时，负责人在项目详情确认后调用直接删除接口并离开项目页，在项目列表确认后同样直接删除并留在企划详情；已有提交时只填写原因提交删除申请，不调用直接删除。
- 重新打开排序弹层读取服务器最新完整顺序，后台缓存刷新不覆盖草稿；数字定位边界和键盘上下移动可用，拖动过程不发写请求。
- 已完成筛选只返回全部任务已完成的项目；没有任务的项目留在进行中。状态筛选及排序在后端分页前执行，项目卡片与网格样式保持不变。

## 依赖

- 依赖企划模块提供 `projectId`。
- 依赖工作流模板模块提供模板选项。
- 后续工作流实例与任务模块依赖本模块的 `itemId`。
