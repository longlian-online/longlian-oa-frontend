---
title: 接入开放接口
icon: KeyRound
---

开放接口让外部工具以你的身份调用系统数据：自动接取和提交任务、同步企划和项目进度。所有开放接口都在 `/open/v1` 下，用个人 OpenAPI 密钥认证。

## 创建密钥

1. 登录后打开[个人设置](/dashboard/settings)，找到「OpenAPI 密钥」。
2. 输入密钥名称，点击创建。
3. 完整密钥只显示这一次，立即复制保存。

密钥与当前组织绑定。每个组织最多创建 2 个密钥，为其他组织创建前先在页头切换组织。

修改或重置登录密码后，所有密钥立即失效，需要重新创建。退出组织或被停用期间，该组织的密钥不可用；重新加入后未吊销的密钥自动恢复。

![个人设置的 OpenAPI 密钥区块](/docs/screenshots/openapi-keys.webp)

## 认证

每个请求带一个请求头，不需要登录凭证：

```
X-Api-Key: oa_xxxxxxxxxxxxxxxxxxxxxxxx
```

密钥无效、已吊销或成员资格失效时，请求返回 `code: 1` 的错误信封（见「响应与错误」）。调用方只需要这一个头，组织身份由服务端从密钥解出，不能在请求中指定其他组织。

## 接口一览

| 能力             | 接口                                                                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 企划、成员、附件 | `GET /open/v1/projects`、`GET /open/v1/projects/{id}`、`GET /open/v1/projects/{id}/members`、`GET /open/v1/projects/{id}/attachments`            |
| 项目与任务流     | `GET /open/v1/projects/{id}/items`、`GET /open/v1/items/{id}/flow`                                                                               |
| 任务             | `GET /open/v1/tasks/{id}/detail`、`GET /open/v1/tasks/{id}/submissions`、`GET /open/v1/my-tasks`、`GET /open/v1/task-plaza`                      |
| 文件             | `POST /open/v1/files`、`GET /open/v1/tasks/{id}/attachments/{fileId}/read-url`、`GET /open/v1/projects/{id}/attachments/{attachmentId}/read-url` |
| 任务流转         | `POST /open/v1/tasks/{id}/claim`、`POST /open/v1/tasks/{id}/abandon`、`POST /open/v1/tasks/{id}/submit`                                          |

完整参数和字段以接口文档为准：开启文档服务的环境访问 `/swagger-ui.html`，选择「开放接口」分组。

## 列表翻页

列表接口使用游标翻页，不提供跳页。第一次请求不传游标，之后把上一页返回的 `nextCursor` 原样传入：

```
GET /open/v1/projects?limit=50
→ { "list": [...], "nextCursor": "djE6MTIz...", "hasMore": true }

GET /open/v1/projects?limit=50&cursor=djE6MTIz...
```

`limit` 默认 50，最大 200。定时同步时用 `updatedSince` 只拉增量：

```
GET /open/v1/projects?updatedSince=2026-11-01 00:00:00
```

时间格式为 `yyyy-MM-dd HH:mm:ss`，与站内展示一致。

## 写请求的幂等键

接取、放弃、提交和上传都必须带一个你生成的幂等键，例如 UUID：

```
POST /open/v1/tasks/88/submit
X-Api-Key: oa_xxx
X-Idempotency-Key: 6f1c8b2a-1c3e-4f0a-9d2b-5e7f8a9b0c1d
```

同一个键的重复请求返回第一次的结果，不会重复执行。同一键换到别的接口或换请求体会被拒绝（`code: 13`）。网络超时后重发时务必复用同一个键。

## 响应与错误

与站内一致：业务失败（认证、参数、越权、限流、幂等冲突）也返回 HTTP 200，靠 `code` 区分。响应体为 `{code, msg, data}`，排查请求时用响应头 `X-Trace-Id`。

```json
{
  "code": 6,
  "msg": "数据不存在",
  "data": null
}
```

| code | 含义                                       |
| ---- | ------------------------------------------ |
| 0    | 成功                                       |
| 1    | 密钥无效、已吊销或成员资格失效             |
| 2    | 参数错误，或写请求缺幂等键                 |
| 3    | 用登录凭证（`Authorization: Bearer`）访问开放接口 |
| 4    | 请求路径不存在                             |
| 5    | 状态机拒绝，如重复接取已认领任务、revision 过期 |
| 6    | 资源不存在或不属于密钥组织                 |
| 8    | 服务内部错误                               |
| 12   | 请求过于频繁，等限流窗口（1 分钟）过去后重试 |
| 13   | 幂等键冲突                                 |

跨组织和不存在的资源返回同一种 `code: 6`，不泄露组织是否存在。连接层失败（连接被拒、超时、TLS）不适用 200 约定，由 HTTP 客户端自行报错。

## 示例：自动接取并提交一个任务

1. 从任务大厅找缺人任务：

```
GET /open/v1/task-plaza?limit=20
```

2. 接取（无请求体，带幂等键）：

```
POST /open/v1/tasks/88/claim
X-Api-Key: oa_xxx
X-Idempotency-Key: claim-88-001
```

3. 查任务流，按节点上的 `submitFields` 准备提交内容：

```
GET /open/v1/items/12/flow
```

4. 文件先上传再提交：`POST /open/v1/files` 拿到 `uploadUrl` 和 `fileId`，把文件 PUT 到 `uploadUrl`，然后把 `fileId` 填进文件字段的值。

5. 提交：

```
POST /open/v1/tasks/88/submit
X-Api-Key: oa_xxx
X-Idempotency-Key: submit-88-001

{ "values": { "文本": "译文内容", "文件": { "fileId": "123" } } }
```

提交后从 `GET /open/v1/tasks/88/submissions` 确认版本号。哪一步超时了，就用同一个幂等键原样重发。
