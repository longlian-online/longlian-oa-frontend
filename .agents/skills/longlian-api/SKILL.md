---
name: longlian-api
description: longlian-oa API 接入规范。适用于新增或修改 src/api、src/types、接口调用、接口文档、Swagger 缓存、任务流接口和登录/企划/工作流相关 API 时使用。
---

# longlian-oa API 接入规范

修改接口封装、接口类型、接口相关文档前，必须先确认 Swagger 缓存是否最新。

## 固定来源

API 文档来源：

- `https://sit.neo.oa.api.longlian.online/v3/api-docs`

缓存位置：

- `docs/api-cache/manifest.json`
- `docs/api-cache/summary.md`
- `docs/api-cache/openapi/*.json`
- `docs/api-cache/operations/*.json`

## 工作流

1. 先运行 `vp run api:check`。
2. 如果命中缓存，优先读取 `docs/api-cache/summary.md` 和对应 `docs/api-cache/operations/*.json`。
3. 如果缓存过期，运行 `vp run api:update` 更新缓存。
4. 根据最新缓存修改 `src/api/*`、`src/types/*` 或文档。
5. 修改完成后运行 `vp check`。

## 约束

- 不使用旧路径猜接口，以缓存和当前 Swagger 为准。
- 企划类型必须通过 `/app/projects/types` 动态获取，不写死漫画、小说等类型。
- 当前 Swagger 没有暴露的接口，不在前端做假实现；在文档中标记为待后端补充。
- 提交前 hook 会运行 `vp run api:check`，缓存过期时需要先更新并提交缓存文件。
