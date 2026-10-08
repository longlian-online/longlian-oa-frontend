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
- 展示后端组装的任务详情、提交内容和附件。
- 通过 CDN 签名链接打开附件，链接即将过期时重新获取详情。

暂不实现：

- 独立提交历史列表，当前 Swagger 未暴露。
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

## 数据契约

- 原子任务与流程节点返回 `submitFields` 数组，每项包含 `key`、`label`、`type`、`required`、`options`。输入类型为 `text`、`textarea`、`number`、`select`、`file`。
- 提交请求为 `{ values: { [key]: string | { fileId: string } | null } }`；数字输入提交字符串，附件只提交文件 ID，不发送临时预览地址或文件信息副本。
- 详情返回 `task`（名称、阶段、状态、执行人）与 `submission`（状态、提交时间、有序展示字段）。无当前有效提交时，`state` 为 `not_submitted`，字段为空。
- 展示字段由后端组装：`text`、`multiline` 使用 `text`，`files` 使用附件数组；空文本由后端返回“未填写”。前端不解析存储内容，也不匹配字段定义。
- 有效附件包含 `name`、`sizeText`、`mediaType`、`readUrl`、`expiresAt`；`readUrl` 为 CDN 签名链接，`expiresAt` 为 Unix 秒。不可用附件不返回读取链接。
- 附件点击时，剩余有效期不超过 10 秒则重新请求详情，按同一文件 ID 获取仍有效的链接后打开。签名服务可能复用仍有效的 URL，不要求刷新后 URL 一定变化。
- 切换节点、关闭详情或任务操作刷新时，取消旧请求和待打开窗口，避免展示或打开旧任务的内容。
- 本次为前后端同时切换的新协议，不保留旧字符串接口、旧数据转换或原始 JSON 展示入口。

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
- 多行内容保留换行，数字 `0` 正常显示，空字段有明确提示。
- 图片使用签名链接显示缩略图，文档显示文件名称和大小。
- 链接过期后点击附件可获取新的有效签名链接；失败明确提示且不自动循环重试。
- 重置或打回后不再展示已失效提交的内容。

## 依赖

- 依赖项目模块提供 `itemId`。
- 依赖文件上传模块处理附件。
- 依赖公共 UI 与反馈模块展示操作结果。
