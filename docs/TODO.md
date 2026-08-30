# 待办事项

## 原子任务 Lucide 图标

**状态：等待后端支持**

当前原子任务接口仅支持 `iconFileId`，用于上传图片并由后端返回 `iconUrl`。前端现有的任务图标为按任务名称匹配的默认 Lucide 图标，不能保存管理员手动选择的图标。

### 后端改动

在原子任务模型中增加可选字段 `iconName`：

- `BaseTaskCreateDTO.iconName?: string`
- `BaseTaskVO.iconName?: string`
- 原子任务更新接口（后续提供时）也应支持 `iconName`

字段保存 Lucide 图标组件名称，例如 `Languages`、`SquarePen`、`Megaphone`、`BadgeCheck`。后端只需原样保存和返回字符串，无需依赖前端图标库。

`iconName` 与现有字段独立：

- `iconFileId`：管理员上传自定义图片图标时提交。
- `iconUrl`：后端返回的自定义图片地址。
- `iconName`：管理员选择内置 Lucide 图标时提交。

### 前端接入

后端 Swagger 更新后，前端完成以下工作：

1. 在“工坊 / 原子任务”的创建表单加入图标选择器，提供受控的 Lucide 图标集合。
2. 创建原子任务时提交 `iconName`。
3. 在任务管理卡片、流程编辑器和流程模板卡片统一展示图标。
4. 图标展示优先级固定为：`iconUrl` > `iconName` > 按任务名称自动匹配的默认图标。

不使用 `metaSchema` 保存图标。该字段仅用于任务提交字段定义，必须保持 JSON 数组结构。
