# 08 工作流实例与任务模块

## 目标

完成项目任务流展示和组员任务操作，让工作流能从待接取、已接取、已完成之间流转。

## 范围

必须实现：

- 获取项目任务流。
- 展示节点执行状态。
- 查询项目下任务实例。
- 接取任务。
- 提交任务。
- 打回任务。
- 放弃任务。
- 重置任务提交。

暂不实现：

- 独立提交历史列表，当前 Swagger 未暴露。
- 下载提交文件，当前 Swagger 未暴露。
- 复杂审核流。
- 多级打回配置。

## 页面

优先嵌入项目详情或企划详情：

```txt
src/pages/dashboard/planning/[projectId].tsx
```

后续复杂度上升后可拆：

```txt
src/pages/dashboard/planning/[projectId]/items/[itemId].tsx
```

## 建议文件

```txt
src/
├── api/
│   └── workflowInstance.ts
├── types/
│   └── workflowInstance.ts
└── components/
    └── WorkflowInstance/
        ├── TaskFlowViewer.tsx
        ├── TaskNodeCard.tsx
        ├── TaskActionPanel.tsx
        └── TaskSubmitPanel.tsx
```

## 接口

| 方法   | 路径                                      | 用途                   |
| ------ | ----------------------------------------- | ---------------------- |
| `GET`  | `/app/item/{itemId}/flow`                 | 获取项目任务流         |
| `GET`  | `/app/task/instance/item/{itemId}`        | 查询项目下任务实例列表 |
| `GET`  | `/app/task/instance/{instanceId}/detail`  | 查看任务实例详情       |
| `POST` | `/app/task/instance/{instanceId}/claim`   | 接取任务               |
| `POST` | `/app/task/instance/{instanceId}/submit`  | 提交任务               |
| `POST` | `/app/task/instance/{instanceId}/reject`  | 打回任务               |
| `POST` | `/app/task/instance/{instanceId}/abandon` | 放弃任务               |
| `POST` | `/app/task/instance/{instanceId}/reset`   | 重置任务提交           |

## 状态规则

- `PENDING`：待接取。
- `CLAIMED`：已接取，待提交。
- `COMPLETED`：已完成。
- `taskStatus` 为空或无 `taskInstanceId`：前端展示为未解锁。

## 验收标准

- 未解锁节点明显不可操作。
- 待接取任务可以接取。
- 已接取任务只允许执行人提交。
- 提交成功后任务状态刷新。
- 并行组未全部完成时下一组不提前解锁。
- 打回后页面能展示最新状态。

## 依赖

- 依赖项目模块提供 `itemId`。
- 依赖文件上传模块处理附件。
- 依赖公共 UI 与反馈模块展示操作结果。
