# RUM(真实用户监控)

## 定义

一种前端 / 客户端性能与可用性监控技术,直接从真实用户的浏览器 / 设备上采集数据

测量：页面加载速度、交互响应、JS 错误、网络请求、卡顿、崩溃等

目标：还原用户真实体验，发现生产环境中真实发生的问题

## OpenObserve

OpenObserve（简称 O2） 是一个开源、云原生、高性能的统一可观测性平台，核心定位是一站式管理日志、指标、链路追踪和 RUM（真实用户监控），主打极低存储成本和PB 级海量数据处理能力

本项目采用 OpenObserve 进行 RUM 数据上报并分析

文档地址：https://openobserve.ai/docs/user-guide/rum/overview/

## 指标说明

### 1. Time to First Byte (TTFB)

- 首字节时间

- 从你浏览器发出请求 → 收到服务器返回的第一个字节

- 反映：服务器响应速度 + 网络链路快慢

- 优化点：CDN、服务器性能、接口速度、链路延迟

### 2. First Contentful Paint (FCP)

- 首次内容绘制

- 页面上第一个文字 / 图片出现的时间

- 反映：页面开始 “有东西” 了，不再是白屏

- 比 TTFB 更贴近用户感受

### 3. Largest Contentful Paint (LCP)

- 最大内容绘制（核心 Web 指标）

- 页面里最大块的内容（图 / 标题 / 文本）渲染完成的时间

- 代表：用户觉得页面 “加载好了” 的关键时间

- 标准：≤2.5s 优秀，>4s 差

- 慢通常因为：大图慢、字体慢、JS 阻塞渲染

### 4. Interaction to Next Paint (INP)

- 交互到下一次绘制（核心 Web 指标）

- 用户点击 / 输入 / 触摸 → 页面真正做出响应并刷新的延迟

- 反映：页面卡不卡、流不流畅

- 标准：≤200ms 优秀，>500ms 差

- 慢通常因为：JS 执行太久、主线程阻塞、重渲染太多

### 5. Cumulative Layout Shift (CLS)

- 累积布局偏移（核心 Web 指标）

- 页面加载过程中，元素突然跳动、错位的总分

- 比如图片没设宽高、广告晚加载、弹窗突然弹出

- 标准：≤0.1 优秀，>0.25 差

### 6. Page Load Time

- 页面完全加载时间

- 从开始请求 → 所有资源（JS/CSS/ 图片 / 字体）都加载完

- 传统性能指标，现在不如 LCP/INP 贴近真实体验

- 一般看 load 事件时间

## 相关依赖

- `@openobserve/browser-logs`
- `@openobserve/browser-rum`

## 环境变量配置

```bash
# 是否启用 RUM，非空即开启
VITE_RUM_ENABLE=1
# 上报网站
VITE_RUM_SITE=otel.longlian.online
# 令牌
VITE_RUM_TOKEN=xxxxxxxxxxxxxxx
# 系统所属 O2 组织
VITE_RUM_ORG=default
```

## 配置项说明

| 配置项 | 说明 |
|--------|------|
| `trackResources` | 追踪静态资源（CSS/JS/图片等）加载性能 |
| `trackLongTasks` | 追踪超过 50ms 的长任务，用于发现卡顿 |
| `trackUserInteractions` | 自动追踪点击、输入等用户交互 |
| `defaultPrivacyLevel` | 隐私控制级别（见下方"隐私与安全"） |
| `sessionSampleRate` | Session 采样率，0-100 |
| `sessionReplaySampleRate` | 会话录像采样率，0-100 |
| `forwardErrorsToLogs` | 自动将 JS 错误转发到日志服务 |

### 全局变量说明

- `__APP_NAME__`、`__APP_VERSION__` 由构建工具在编译时注入，来源于 `package.json` 中的 `name` 和 `version` 字段。

## 隐私与安全

### defaultPrivacyLevel 选项

| 级别 | 说明 |
|------|------|
| `allow` | 记录所有内容，不做掩码处理 |
| `mask-user-input` | 掩码用户输入内容（input、textarea 等） |
| `mask` | 掩码所有文本内容和用户输入，最高隐私级别 |

**建议**：生产环境建议使用 `mask-user-input` 或 `mask` 以保护用户隐私。

### 敏感数据保护

如需对特定元素进行掩码，可以添加 CSS 类：

```html
<!-- 强制掩码此元素内容 -->
<div class="o2-mask">敏感信息</div>

<!-- 强制不掩码此元素内容 -->
<div class="o2-unmask">非敏感信息</div>
```

## 采样率配置建议

| 环境 | sessionSampleRate | sessionReplaySampleRate |
|------|-------------------|-------------------------|
| 开发环境 | 100 | 100 |
| 测试环境 | 100 | 100 |
| 生产环境（小流量）| 100 | 50-100 |
| 生产环境（大流量）| 10-50 | 5-20 |

**注意**：Session Replay 会产生较大数据量，请根据实际流量调整采样率。

## 验证与排查

### 验证 RUM 是否正常工作

1. 打开浏览器开发者工具 Console
2. 看到 `OpenObserve Enable...` 日志表示已加载
3. 查看 Network 面板，过滤 `rum` 或 `openobserve` 请求
4. 应有数据上报到配置的 `VITE_RUM_SITE`

### 常见问题

**Q: 没有看到数据上报？**
- 检查 `VITE_RUM_ENABLE` 是否设置
- 检查 `VITE_RUM_TOKEN` 和 `VITE_RUM_SITE` 是否正确
- 查看 Console 是否有相关报错

**Q: Session Replay 没有录制？**
- 检查 `sessionReplaySampleRate` 配置
- 确认调用了 `startSessionReplayRecording()`

## 数据查看与分析

1. 访问 OpenObserve 控制台
2. 进入 "RUM" 菜单
3. 可查看以下数据：
   - Session 列表和录像回放
   - 页面性能指标（FP、FCP、LCP、CLS、FID）
   - JS 错误统计
   - 资源加载耗时
   - 用户交互热力图

## 加载入口

RUM 在 `src/main.tsx` 中条件加载：

```typescript
if (import.meta.env.VITE_RUM_ENABLE) {
  console.log("OpenObserve Enable...");
  import("./lib/rum.ts");
}
```
