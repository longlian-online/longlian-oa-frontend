# `/dashboard/planning` 及全局前端性能排查与系统性优化清单

> **基线环境**：测试服 `https://sit.neo.oa.longlian.online/dashboard/planning`  
> **代码基线**：`main` @ `8c04c4a`（`v0.0.31`，与 `origin/sit` 一致）  
> **排查日期**：2026-11-26  
> **使用方式**：按优先级从 P0 到 P2 逐项推进；每完成一项按“验收标准”验证并勾选复选框。

---

## 一、现状实测基线

测试服实测条件：第 1 页 11 张企划卡 + 1 张创建卡，第 2 页 7 张企划卡，视口 `1015 × 922`。

| 观测维度                      | 实测基线数据                                          | 核心问题表现                                                                                          |
| :---------------------------- | :---------------------------------------------------- | :---------------------------------------------------------------------------------------------------- |
| 整页重载                      | `5,346 ms`                                            | `<head>` 含 `98` 个 `<link>`（其中 `95` 个 `modulepreload`），包含大量 `file-viewer-*` 无关渲染器分包 |
| 翻页（第 1 页 → 第 2 页）     | `1,775 ms`                                            | 阻塞等待接口返回；捕获时 `5/7` 张封面仍停留在灰色占位                                                 |
| 切排序（最新创建 ↔ 最近更新） | `649 ~ 799 ms`（下拉展开 `871 ms`）                   | 点击后阻塞至 loader 完成才更新界面                                                                    |
| 切路由往返（企划 ↔ 任务大厅） | 单程 `3.3s ~ 3.8s`                                    | URL 变更需 `1.4s ~ 1.9s`；返回企划页时 **9 张封面 + 1 张头像重新发起 `HTTP 200`**，封面再次闪灰淡入   |
| 卡片负责人头像                | `36×36px` 原图直下                                    | 缺少 `&eo-img.resize=w/64/h/64`（顶栏头像有），同一头像被原图 + 缩略图重复拉取                        |
| 滚轮滚动 `<main>`             | 5 步向下 `3,072 ms`（单步 `11 ~ 940 ms`）             | 存在明显单步波动与悬停/重绘负担                                                                       |
| 负责人 Popover 打开           | `389 ~ 657 ms`                                        | 悬停/点击状态变更联动卡片重渲染及标签同步测量                                                         |
| 生产包体积隐患                | `lucide-react` chunk `473.6 KB`、`index.css` `142 KB` | 全量图标引入 + 全局引入文档站/画布专用 CSS                                                            |

---

## 二、总览任务清单（逐项推进）

### P0：高收益、零破坏、纯前端立刻见效

- [x] **PERF-01**：懒加载 `AttachmentPreviewHost` 中的 `FileViewer` 及全部渲染器预设（砍掉首屏 ~80+ 无关 `modulepreload`）
- [x] **PERF-02**：拆分 `Planning` 搜索草稿状态 + `ProjectCard` 记忆化，阻止打字/弹窗触发整表重渲染
- [x] **PERF-03**：重构 `ProjectCardTags`，彻底消除 `useLayoutEffect` 中的强制同步回流（Layout Thrashing）
- [x] **PERF-04**：优化 `RemoteImage` 与图片加载优先级，消除切页/换签名时的闪灰与并发抢带宽
- [x] **PERF-05**：消除“正在刷新...”引起的顶部布局跳动（CLS），翻页/筛选保留上一页数据平滑过渡
- [x] **PERF-06**：清理滚动与悬停合成层细节开销（双层 `transition-transform`、全局 `optimizeLegibility` 等）

### P1：路由、数据缓存与包体积系统性治理（纯前端）

- [x] **PERF-07**：分层治理 `queryClient` 缓存策略（`staleTime` / `refetchOnWindowFocus`）
- [x] **PERF-08**：优化 `dashboard` 父子路由 Loader（`shouldRevalidate`、悬停预取、精简过渡时长）
- [x] **PERF-09**：消除 `lucide-react` 全量导入（入口图标 JS 由 `487.8 KB` 降至 `2.3 KB`）
- [x] **PERF-10**：拆分全局无关 CSS（`fumadocs-ui` 与 `@xyflow/react` 按路由/组件按需加载）
- [x] **PERF-11**：`routeLoaderModules` 改为随路由懒加载，并记忆化 `CurrentUserProvider` Context

### P2：前后端 & EdgeOne 存储协同（彻底解决图片“下得慢、缓不住”）

- [ ] **PERF-12**：后端 `/app/projects` 列表的 `creatorAvatarUrl` 补齐 `eo-img.resize=w/64/h/64`
- [ ] **PERF-13**：EdgeOne 图片处理参数统一开启现代格式与压缩（WebP/AVIF + quality）
- [ ] **PERF-14**：后端签名 URL 过期时间按时间桶对齐 + 合理 `Cache-Control`，提升浏览器缓存命中率
- [ ] **PERF-15**：前端上传链路按 `bizType` 限制最大分辨率并默认压缩导出 WebP

---

## 三、逐项详细方案与验收标准

### P0 阶段

#### [ ] PERF-01：懒加载 `AttachmentPreviewHost` 中的 `FileViewer`

- **归属**：前端
- **定位代码**：
  - `src/components/layout/AppLayout.tsx`（第 10、40 行静态引入并挂载 `AttachmentPreviewHost`）
  - `src/components/AttachmentPreview/index.tsx`（第 2、21 行静态引入 `@file-viewer/react` 及 `viewerOptions`）
  - `src/components/AttachmentPreview/viewerOptions.ts`（第 2–4 行静态引入 `@file-viewer/preset-lite`、`@file-viewer/preset-office`、`@file-viewer/renderer-archive`）
- **问题根因**：用户在任意 `/dashboard/*` 页面（包括企划广场）都会被迫把 Office/PDF/Archive/Hangul/iWork/OFD 等 80+ 预览渲染器分包写进 `<head>` 的 `modulepreload`，与首屏业务脚本、API 和封面图抢占网络和主线程解析预算。
- **改造方案**：
  1. 将 `FileViewer` + `createPreviewOptions` 抽离为独立的 `src/components/AttachmentPreview/AttachmentFileViewer.tsx`。
  2. 在 `AttachmentPreviewHost` 中通过 `React.lazy(() => import("./AttachmentFileViewer"))` 引入，仅在 `session !== null`（实际打开预览弹窗）时挂载渲染，并配合 `<Suspense>` 复用现有的“正在读取…”加载态。
  3. 保持 `registerAttachmentPreview` 的事件注册仍在轻量的 `AttachmentPreviewHost` 中同步完成，不改变任何调用方行为。
- **验收标准**：
  - `vp build` 后检查 `dist/index.html` 与 `dashboard` 入口分包，确认 `file-viewer-*` 渲染器不再出现在首页/企划页初始 `modulepreload` 列表中。
  - 在详情页实际点击附件预览（PDF / Office / 图片 / 压缩包）功能完全正常。

---

#### [ ] PERF-02：隔离搜索草稿状态 + `ProjectCard` 记忆化

- **归属**：前端
- **定位代码**：
  - `src/pages/dashboard/planning/index.tsx`（第 49、77–82、187–189、231–240 行）
- **问题根因**：
  - `keyword` 输入草稿保存在 `Planning` 顶层状态中，搜索框每输入一个字符都会导致整个 `Planning` 和全部 11 张 `ProjectCard` 重渲染。
  - `ProjectCard` 未包裹 `React.memo`，且 `detailState`、`parseProjectMetadataTags(project.metadata)` 每次渲染都生成新对象/新数组。
- **改造方案**：
  1. 将搜索输入草稿封装到局部状态组件（或在 `FilterToolbar` / 专用 `PlanningFilterBar` 中管理草稿，只在回车/提交时回传 `onSearchSubmit(nextKeyword)`；历史导航导致 URL `submittedKeyword` 变更时通过 `useEffect` 同步草稿，继续严格满足列表浏览状态规范）。
  2. 将 `ProjectCard` 用 `React.memo` 包裹，传入稳定的原始/不可变 props（`project`、`returnTo` 字符串、`locationState`）。
  3. 在 `ProjectCard` 内用 `useMemo(() => parseProjectMetadataTags(project.metadata), [project.metadata])` 稳定标签数组引用，避免点击/悬停负责人头像切换 `ownerOpen` 时重复 `JSON.parse` 与触发子组件测量。
- **验收标准**：
  - React DevTools Profiler 录制搜索框连续打字 10 个字符：`ProjectCard` 渲染次数为 `0`。
  - 打开/关闭单张卡片负责人 Popover：其他 10 张 `ProjectCard` 渲染次数为 `0`，当前卡片不重新执行 `parseProjectMetadataTags`。

---

#### [ ] PERF-03：重构 `ProjectCardTags`，消除强制同步回流

- **归属**：前端
- **定位代码**：
  - `src/components/ProjectCardTags/index.tsx`（第 15–98 行）
- **问题根因**：
  - `useLayoutEffect` 依赖 `[tags]`，每次 `tags` 引用变化都会销毁重建 `ResizeObserver`（监听容器 + 每一个测量标签节点）并同步运行 `update()`。
  - `update()` 内部逐个调用 `getBoundingClientRect()`、`getComputedStyle()`，溢出时在 `for` 循环中**边写 `counter.textContent` 边读 `counter.getBoundingClientRect()`**，触发浏览器反复强制同步回流（Read → Write → Read）。
  - 即使 `tags.length === 0`，仍然渲染容器、隐藏测量 DOM 并挂载 `ResizeObserver`。
- **改造方案**：
  1. `tags.length === 0` 时直接返回空占位（不建 `ResizeObserver`、不渲染隐藏测量层）。
  2. 只对容器 `containerRef` 注册 `ResizeObserver`（无需 `observe` 每个子标签节点），并在 `ResizeObserver` 回调中通过 `requestAnimationFrame` 合并同一帧内的多次尺寸变化（组件卸载时 `cancelAnimationFrame`）。
  3. 消除循环内写 DOM 再读布局：预先一次性读取 `container` 尺寸、行高、gap 与各标签宽度（单次读取阶段），在纯 JS 中计算可放下数量及 `+N` 徽章占位（按 `+99` 一次性测得最大徽章宽度，或按字符数估算后单次验证），最后只执行一次 `setVisibleCount`，且仅在值变化时更新状态。
- **验收标准**：
  - Chrome Performance 面板录制页面加载、窗口缩放与卡片交互：`ProjectCardTags` 不再出现连续的 `Forced reflow` 红色告警。
  - 原有标签截断与 `+N` 溢出显示在单行/多行卡片宽度变化时视觉与单元测试全部通过。

---

#### [ ] PERF-04：优化 `RemoteImage` 与封面/头像加载管线

- **归属**：前端
- **定位代码**：
  - `src/components/RemoteImage/index.tsx`（第 28–128 行）
  - `src/pages/dashboard/planning/index.tsx`（第 255–265、313 行）
- **问题根因**：
  - 封面图全部无 `loading` / `fetchPriority` 控制，首屏外卡片与首屏卡片同时抢带宽、并发解码。
  - `RemoteImage` 初始 `status` 永远是 `"loading"`，即使已缓存仍异步走 `img.decode()`，导致每次切回页面必闪一帧 `animate-pulse` 灰块再做 300ms 淡入。
  - `<img key={src} />` 把包含动态签名 `?token=...&t=...` 的完整 URL 当作 `key`；后台刷新换了签名后，整页封面被销毁重建并重新闪灰下载。
  - 卡片负责人 `<AvatarImage>` 缺少 `loading="lazy"` 与 `decoding="async"`。
- **改造方案**：
  1. **加载优先级分层**：
     - 为 `Planning` 列表卡片传入索引 `index`：前 4 张（首屏可见区）封面传 `loading="eager"` + `fetchPriority="high"`；其余卡片传 `loading="lazy"` + `fetchPriority="low"`。
     - 卡片内负责人 `<AvatarImage>` 统一增加 `loading="lazy" decoding="async"`。
  2. **规范化资源键（剥离签名参数）+ 内存已加载记录**：
     - 新增工具函数提取图片稳定键（如 `origin + pathname` + 业务尺寸参数 `eo-img.resize`，剥离 `token`、`t` 等临时签名参数）。
     - 维护轻量的模块级 `Set`（带上限如 500 条 LRU）记录当前会话已解码成功的图片键。
     - 当组件挂载或 `src` 变化时：
       - 若新旧 `src` 的稳定键相同且当前已是 `"ready"`，**保持当前已渲染画面不退回 `"loading"`、不销毁 `<img>`**（保留旧图直至新 URL 就绪，或直接复用已显示状态）；
       - 若稳定键已在已加载缓存中且 `img.complete && img.naturalWidth > 0`，在 `useLayoutEffect` 中同步置为 `"ready"`，跳过 `animate-pulse` 和淡入动画，实现切页秒出图不闪灰。
  3. **仅在需要时使用 `decode()`**：仅对未命中缓存的首次加载调用 `img.decode()`；对已命中缓存的 `img.complete` 立即展示。
- **验收标准**：
  - 企划页 → 任务大厅 → 返回企划页：已加载过的封面不闪灰、不重复播放 300ms 淡入动画。
  - 切回浏览器标签页触发接口刷新后，同一企划的封面不会突然变灰闪烁。
  - 首屏前 4 张封面在 Network 瀑布流中优先级为 `High`，折下封面延迟加载。

---

#### [ ] PERF-05：消除“正在刷新...”布局跳动 + 平滑翻页过渡

- **归属**：前端
- **定位代码**：
  - `src/pages/dashboard/planning/index.tsx`（第 53–60、71–75、148–201 行）
  - `src/queries/planning.ts`（第 55–70 行）
- **问题根因**：
  - `listQuery.isFetching && listQuery.data` 在 `<div className="space-y-6">` 顶部插入 `<p>正在刷新...</p>`，把整页内容下推 ~44px，完成后再弹回（显著 CLS）。
  - 翻页/切换筛选时未保留上一页数据，缓存未命中时出现整页骨架/等待感。
- **改造方案**：
  1. 移除文档流顶部会撑开高度的 `<p>正在刷新...</p>`；若需保留刷新反馈，改为不影响布局的轻量状态指示（例如工具栏内绝对定位/固定宽高的微弱加载点，或列表容器轻微 `opacity-70 transition-opacity`）。
  2. 为 `projectListQuery`（以及其他列表查询）配置 `placeholderData: keepPreviousData`（来自 `@tanstack/react-query`），切换筛选/翻页时在请求期间保持原有网格高度与旧内容可见，数据到达后原地替换。
- **验收标准**：
  - 手动刷新/切回标签页/切换排序与翻页过程中，工具栏和卡片网格顶部 `y` 坐标偏移始终为 `0px`（`CLS = 0`）。
  - 翻页时点击按钮无界面塌陷。

---

#### [ ] PERF-06：清理滚动与悬停合成层细节开销

- **归属**：前端
- **定位代码**：
  - `src/pages/dashboard/planning/index.tsx`（第 247、259、312 行）
  - `src/components/RemoteImage/index.tsx`（第 112 行）
  - `src/components/ui/avatar.tsx`（第 20 行）
  - `src/index.css`（第 116–119 行）
- **问题根因**：
  - 封面外层 `RemoteImage` `<span>` 与内层 `<img>` 两层同时声明了 `transition-transform duration-300`；卡片在 `rounded-2xl overflow-hidden` 内同时做 `box-shadow` 过渡与封面缩放。
  - `html { text-rendering: optimizeLegibility; }` 在全局开启重排版开销。
  - 头像伪元素使用 `mix-blend-darken` / `mix-blend-lighten` 干扰简单合成层合并。
- **改造方案**：
  1. 将封面缩放类名移至 `RemoteImage` 的 `imgClassName`，外层 `<span>` 不再重复做 `transition-transform`；内层 `<img>` 仅对实际需要的属性做过渡。
  2. 移除 `src/index.css` 中 `html` 的 `text-rendering: optimizeLegibility`（保留 `antialiased` 即可）。
  3. 评估卡片网格为卡片增加 `contain-layout contain-style`（Tailwind v4 `contain-[layout_style]`），避免单卡悬停状态变化引起外层网格重排。
  4. 评估用普通半透边框色替代 `Avatar` 伪元素的 `mix-blend-*`（注意遵循 `docs/design-system.md` 视觉一致，且如需改动 shadcn 原始组件先确认影响范围）。
- **验收标准**：
  - 快速上下滚动 `<main>` 与横向扫过 4 列卡片时，DevTools Performance 帧时间平稳、无大面积 Paint Flashing。

---

### P1 阶段

#### [ ] PERF-07：分层治理 `queryClient` 缓存与焦点刷新策略

- **归属**：前端
- **定位代码**：
  - `src/lib/queryClient.ts`（第 56–68 行）
  - `src/queries/session.ts`（第 6–16 行）
  - `src/queries/planning.ts`（第 43–70 行）
- **问题根因**：
  - 全局 `staleTime: 30_000`、`gcTime: 60_000`、`refetchOnWindowFocus: true` 过于激进：切去其他窗口 30 秒回来，同时触发 `/app/user/`、`/app/user/organizations`、`/app/product-releases/current`、`/app/projects` 一连串刷新，叠加动态签名导致整页图片缓存失效。
- **改造方案**：
  1. `queryClient` 默认项调整：`gcTime` 提升至 `5 * 60_000`（5 分钟），避免切页 1 分钟后缓存被立刻回收；`refetchOnWindowFocus` 默认改为 `false`（仅对强实时页面如任务流/审批显式开启）。
  2. 按数据变化频率分级设置 `staleTime`：
     - `currentUserQuery` / `organizationsQuery` / `currentProductReleaseQuery`：`5 * 60_000`（组织切换、资料修改时已有精确 `invalidateQueries`）；
     - `projectTypesQuery` / `presetTagsQuery` / `presetFieldsQuery`：保持 `5 * 60_000`；
     - `projectListQuery`：`60_000 ~ 120_000`（创建/编辑/删除已有 `invalidate: [["projects"], ...]`）。
- **验收标准**：
  - 30 秒后切回标签页不再自动爆发 4+ 个重复接口请求。
  - 在企划页 ↔ 任务大厅之间 1 分钟内切换往返，不重复拉取列表与用户信息接口。
  - 新建/编辑/删除企划后列表仍能立即更新（变更失效链路不退化）。

---

#### [ ] PERF-08：优化路由 Loader 阻塞与交互预取

- **归属**：前端
- **定位代码**：
  - `src/routeLoaders/dashboard.ts`
  - `src/routeLoaders/dashboard/planning/index.ts`
  - `src/lib/createRoutes.ts`
  - `src/components/layout/AppLayout.tsx`（第 61–72 行）
  - `src/components/layout/PageTransition.tsx`（第 10–24 行）
- **问题根因**：
  - `dashboard` 父路由没有 `shouldRevalidate`，子路由或 searchParams 变化都会重新评估父 loader。
  - 列表页 loader 采用 `await Promise.all([fetchApiQuery(...)])` 强阻塞导航；跨路由 >150ms 后 `AppLayout` 直接卸载整个 `<PageContainer><Outlet /></PageContainer>`，造成整页白板切加载器再整页淡入。
- **改造方案**：
  1. 为 `dashboard` 路由补充 `shouldRevalidate`：仅在会话/组织变化或显式重新验证时重跑，子路由路径或查询参数变化时直接返回 `false`。
  2. 列表页路由切换策略升级：
     - 在保持“URL 是已生效状态唯一来源、不发默认条件冗余请求”的前提下，评估将列表页 loader 改为触发 `void queryClient.prefetchQuery(...)`（非阻塞启动请求）+ 页面内用贴合卡片比例的骨架屏（或 `keepPreviousData`）承接，避免点击侧栏/分页时按钮僵住以及 150ms 后整页卸载重建。
     - 或保留 loader 阻塞但为侧栏菜单（企划、任务大厅、工坊）、分页按钮（上一页/下一页）和企划卡片链接增加 `onMouseEnter` / `onFocus` 预取（`prefetchQuery` + 路由 chunk 预加载），让 90% 的点击在按下前已命中缓存。
  3. 精简 `PageTransition`：不再对每次路由切换强加 150ms 整页淡入延迟（或缩短至 80ms 且避免重复触发整页重绘）。
- **验收标准**：
  - 点击分页/排序/侧栏菜单后 50ms 内有清晰视觉响应，不再“点了没反应干等 1 秒”。
  - 同步覆盖 `AGENTS.md` 要求的列表验收用例：非默认 URL 直达、刷新、前进后退、详情返回、非法参数回退，且不额外请求默认条件。

---

#### [ ] PERF-09：消除 `lucide-react` 全量打包（减重 `473.6 KB`）

- **归属**：前端
- **定位代码**：
  - `src/lib/workflowVisuals.ts`（第 2 行：`import { BadgeCheck, Languages, Megaphone, SquarePen, Star, icons } from "lucide-react";`）
- **问题根因**：引用命名导出 `icons` 会将 `lucide-react` 全库 1,500+ 图标全部打入单个 `473.6 KB` chunk，导致访问任务大厅、工作流相关页面时被迫下载并解析巨量无关图标代码。
- **改造方案**：
  1. 梳理业务中实际允许配置的工作流节点图标集合（检查图标选择器组件与后端预设枚举）。
  2. 用静态白名单映射对象替代 `icons` 全量对象；若确实需要支持任意 Lucide 图标名，改用按需懒加载或仅在工作流编辑器中动态加载，任务大厅/列表页仅使用轻量映射 + 兜底图标。
- **验收标准**：
  - `vp build` 后 `dist/assets/` 中不再存在数百 KB 的 `lucide-react-*.js` 巨包。
  - 任务大厅与工作流节点图标显示与原有行为一致。

---

#### [ ] PERF-10：拆分全局无关 CSS（`fumadocs-ui` 与 `@xyflow/react`）

- **归属**：前端
- **定位代码**：
  - `src/index.css`（第 2–3 行：`@import "fumadocs-ui/css/shadcn.css"; @import "fumadocs-ui/css/preset.css";`）
  - `src/main.tsx`（第 3 行：`import "@xyflow/react/dist/style.css";`）
- **问题根因**：全站入口无条件加载了仅文档站 `/docs` 和仅工作流画布使用的 CSS，增加了首屏样式下载体积和全站选择器匹配成本（本地 `index.css` 达 `142 KB`）。
- **改造方案**：
  1. 将 `@xyflow/react/dist/style.css` 移入真正使用 ReactFlow 的工作流组件入口中导入。
  2. 将 `fumadocs-ui` 相关 CSS 移入 `/docs` 专属布局/页面入口中导入，并验证 Tailwind v4 主题变量与文档页亮暗/护眼模式不受影响。
- **验收标准**：
  - 主应用入口 CSS 体积显著下降（目标 `< 60 KB` 未压缩）。
  - `/dashboard/planning`、工作流画布、`/docs/` 三个区域的亮/暗/粉三套主题视觉无回归。

---

#### [ ] PERF-11：`routeLoaderModules` 按路由懒加载 + `CurrentUserProvider` 记忆化

- **归属**：前端
- **定位代码**：
  - `src/lib/routeLoaderModules.ts`（第 5–8 行 `eager: true`）
  - `src/lib/createRoutes.ts`（第 19–53 行）
  - `src/hooks/useCurrentUser.tsx`（第 18–32 行）
- **问题根因**：
  - `routeLoaderModules` 在应用启动时一次性打入全站 30+ 个 loader（含 `admin`、`org-admin`、`workshop`）及其关联 API/query 模块。
  - `CurrentUserProvider` 每次渲染构造新 `value` 对象，引起全部消费该 Context 的顶栏/侧栏组件无谓重渲染。
- **改造方案**：
  1. 将 `routeLoaderModules` 改为非 eager 的动态 glob，在 `createRoutes` 中随 `route.lazy` 一并返回 `{ Component, loader }`（鉴权重定向逻辑可保留在轻量顶层 wrapper 或一起按需执行），隔离不同端（用户端/组织管理端/平台管理端）的启动代码。
  2. 在 `CurrentUserProvider` 中用 `useMemo` 缓存 `value` 对象，用 `useCallback` 缓存 `refresh`。
- **验收标准**：
  - 普通用户进入 `/dashboard/planning` 时，Network 不再加载 `admin` / `org-admin` 相关 loader 与 API 代码。
  - `vp check` 及全部路由测试通过。

---

### P2 阶段（前后端 & 对象存储 / CDN 协同）

#### [ ] PERF-12：补齐卡片头像缩略图参数，消灭原图下载与重复请求

- **归属**：后端为主（接口返回字段对齐）
- **涉及接口**：`GET /app/projects` 返回的 `list[].creatorAvatarUrl`（及其他列表接口中出现的头像 URL）
- **问题根因**：当前 `/app/user/` 返回的头像带 `&eo-img.resize=w/64/h/64`，而 `/app/projects` 返回的 `creatorAvatarUrl` 未带该参数，导致 `36×36px` 卡片头像下载完整原图，且与顶栏头像 URL 不一致、同一文件被拉两遍。
- **改造方案**：
  - 后端统一所有列表头像（`creatorAvatarUrl`、成员头像等）附加与顶栏一致的缩放参数 `&eo-img.resize=w/64/h/64`（若考虑 2× 屏清晰度，也可统一为 `w/96/h/96`，关键是**全站小头像规格完全一致**以最大化复用浏览器缓存）。
- **验收标准**：
  - `/dashboard/planning` Network 面板中，卡片头像全部带统一的 `eo-img.resize` 参数，同一用户头像在顶栏与卡片之间只发 **1 次**请求。

---

#### [ ] PERF-13：EdgeOne 图片处理开启现代格式（WebP/AVIF）与质量压缩

- **归属**：后端 / EdgeOne 配置
- **涉及资源**：`sit.neo.oa.storage.longlian.online/cover/...`、`avatar/...`、`thumbnail/...`
- **问题根因**：目前封面 URL 仅附带 `eo-img.resize=w/400/h/600`，对于 `.png` 源文件处理后仍以 PNG 输出，体积往往仍达数百 KB，下载和解码耗时明显高于 WebP。
- **改造方案**：
  - 在 EdgeOne 图片处理参数中为封面与头像统一启用格式转换与质量参数（例如 `eo-img.format=webp` 或 `avif` + `eo-img.quality=80`，按实际 EdgeOne 文档参数名配置）；
  - 保留原图查看/下载场景不加裁剪压缩参数。
- **验收标准**：
  - 实测封面响应头 `Content-Type` 为 `image/webp`（或 `image/avif`），单张 `400×600` 封面体积控制在 `20 ~ 60 KB` 级别（较 PNG 下降 60% ~ 85%）。

---

#### [ ] PERF-14：签名 URL 时间桶对齐 + 浏览器缓存头（彻底解决切页/刷新重下）

- **归属**：后端 / 对象存储 & EdgeOne
- **问题根因**：目前每次调 `/app/projects` 返回的 EdgeOne 签名参数 `?token=...&t=...` 都随当前秒级时间戳变化，导致浏览器 HTTP Cache 几乎零命中，切路由或刷新列表就会把所有封面重新拉一遍。
- **改造方案**：
  1. **签名时间桶对齐**：服务端生成图片鉴权时间戳 `t` 时，不取实时秒数，而是按固定时间窗口向上/向下取整（例如每 **30 分钟或 1 小时** 一个桶，如 `16:00`、`17:00`，并在窗口末尾提前平滑切桶，确保有效期内始终留足剩余可用时间）。同一时间窗口内，同一张图片对同一组织/对象始终签出**完全一致的 URL**。
  2. **补齐缓存响应头**：在 EdgeOne / 源站为图片响应配置 `Cache-Control: private, max-age=1800`（不超过最短剩余签名有效期）。
- **验收标准**：
  - 连续刷新 `/dashboard/planning`、翻页后再翻回、或在企划页与任务大厅间反复切换，Network 中封面图与头像全部显示 `(disk cache)` / `(memory cache)`，`0` 次回源重下。

---

#### [ ] PERF-15：前端上传链路限制最大边长并默认压缩为 WebP

- **归属**：前端
- **定位代码**：
  - `src/lib/imageCrop.ts`（第 3–100 行）
  - `src/hooks/useUploadFile.ts`（第 178–226 行）
- **问题根因**：
  - 允许最大 10MB 原图上传；裁剪后按原像素尺寸导出无损 PNG / 0.95 JPEG；转 WebP 时（仅 `> 1MB` 触发）也不缩放像素宽高。过大的源图既拖慢上传，也增加 EdgeOne 回源拉图和实时缩放的延迟。
- **改造方案**：
  1. 在 `imageCrop.ts` 中按 `bizType` 增加上传前等比缩放上限（动图 GIF 跳过重绘以保留动画）：
     - `avatar`：最大边长 `512px`；
     - `thumbnail`：最大边长 `600px`；
     - `cover`：最大宽 `1200px`（或最大边 `1600px`）。
  2. 静态封面/缩略图/头像上传前统一转为 `image/webp`（质量 `0.85`），仅在转换后体积反而更大时保留原格式。
- **验收标准**：
  - 上传一张 5MB 4K PNG 封面后，实际上传至对象存储的文件尺寸缩小至 `≤ 1200px` 宽的 WebP（通常 `< 300 KB`），清晰度在详情页与列表页均无肉眼劣化。

---

## 四、整体优化目标对照

| 指标                           | 优化前（测试服实测）                 | 阶段性目标（完成 P0+P1）                 | 终态目标（完成 P0+P1+P2）     |
| :----------------------------- | :----------------------------------- | :--------------------------------------- | :---------------------------- |
| `/dashboard/planning` 整页重载 | `5,346 ms` / `95` 个 `modulepreload` | `< 2,000 ms` / `< 20` 个 `modulepreload` | `< 1,200 ms`                  |
| 切路由返回企划页封面表现       | 9 张重新 `HTTP 200` + 闪灰淡入       | 本地内存命中不闪灰                       | 100% 命中缓存、0 重下、秒出图 |
| 翻页 / 切排序体感响应          | `649 ~ 1,775 ms` 阻塞无反馈          | 点击即刻响应 + 旧页平滑过渡              | `< 300 ms` 流畅切换           |
| 搜索框打字 & 悬停卡片          | 每敲一字 11 组同步强制回流           | 0 卡片重渲染、0 强制回流                 | 0 卡片重渲染、0 强制回流      |
| 卡片头像下载                   | 原图直下且与顶栏重复拉取             | 延迟加载 + 异步解码                      | 统一 `64×64` WebP、零重复请求 |
| 列表后台刷新 CLS               | 顶部插字下推 `~44px`                 | `CLS = 0`                                | `CLS = 0`                     |

---

## 五、推荐推进节奏

1. **第一批 PR（纯前端 P0：`PERF-01` ~ `PERF-06`）**：最直接消除“打字/悬停卡顿、首屏抢带宽、切页闪灰、刷新跳动”。
2. **第二批 PR（纯前端 P1：`PERF-07` ~ `PERF-11`）**：彻底治好切页慢、包体积膨胀与重复拉取接口。
3. **第三批（前后端协同 P2：`PERF-12` ~ `PERF-15`）**：后端补齐头像缩放 + WebP + 签名时间桶，前端补上传前限分辨率压缩，把图片体验拉到“秒开”级别。
