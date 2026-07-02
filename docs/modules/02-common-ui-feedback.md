# 02 公共 UI 与反馈模块

## 目标

建立所有业务模块共用的基础交互能力，避免每个页面重复实现提示、确认、加载、空状态和分页。

## 范围

必须实现：

- 全局提示。
- 删除确认。
- 加载态。
- 空状态。
- 分页。
- 通用筛选布局。
- 通用表单区块。

暂不实现：

- 大型设计系统。
- 复杂表单引擎。
- 与业务接口强绑定的组件。

## 建议文件

```txt
src/
├── components/
│   ├── tip/
│   ├── ConfirmDialog/
│   ├── EmptyState/
│   ├── PageLoading/
│   ├── PaginationBar/
│   └── FilterToolbar/
└── hooks/
    └── useConfirm.ts
```

## 组件约束

- 优先使用 shadcn/ui 已有组件组合。
- `src/components/ui/` 原始组件不直接改。
- 业务封装放在 `src/components/`。
- 样式只用 Tailwind utility class 和 `cn()`。
- 全局提示默认中文。

## 全局提示

建议能力：

```ts
$tip(message, type, icon, time);
```

参数：

- `message`：提示文本。
- `type`：`success`、`error`、`warning`、`info`。
- `icon`：可选图标。
- `time`：自动关闭时间。

## 验收标准

- 任意页面可以调用统一提示。
- 删除操作有统一确认体验。
- 列表为空时有统一空状态。
- 列表加载时有统一加载态。
- 分页组件能被企划、项目、工坊列表复用。

## 依赖

- 本模块应尽早完成。
- 后续所有业务模块都可以依赖本模块。
- 本模块不反向依赖任何业务模块。
