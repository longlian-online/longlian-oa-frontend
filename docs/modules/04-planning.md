# 04 企划模块

## 目标

完成企划的基础管理能力：列表、创建、编辑、详情基础信息、类型动态获取，并为项目和工作流入口提供承载页面。

## 范围

必须实现：

- 查询企划列表。
- 查询企划类型。
- 创建企划。
- 查看企划详情。
- 编辑企划。
- 添加企划到工坊。
- 从工坊移除企划。企划负责人不能退出自己创建的企划，详情页不展示退出按钮。

暂不实现：

- 企划删除，当前 Swagger 未暴露接口。
- 归档管理。
- 企划统计。
- 成员邀请。
- 复杂权限配置。

## 页面

```txt
src/pages/dashboard/planning/index.tsx
src/pages/dashboard/planning/create.tsx
src/pages/dashboard/planning/[projectId].tsx
```

## 建议文件

```txt
src/
├── api/
│   └── planning.ts
├── types/
│   └── planning.ts
├── components/
│   └── Planning/
└── hooks/
    └── useProjectTypes.ts
```

## 接口

| 方法     | 路径                                 | 用途             |
| -------- | ------------------------------------ | ---------------- |
| `GET`    | `/app/projects`                      | 分页查询企划列表 |
| `POST`   | `/app/projects`                      | 创建企划         |
| `GET`    | `/app/projects/types`                | 获取企划类型列表 |
| `GET`    | `/app/projects/{projectId}`          | 获取企划详情     |
| `PUT`    | `/app/projects/{projectId}`          | 编辑企划         |
| `POST`   | `/app/projects/{projectId}/workshop` | 添加企划到工坊   |
| `DELETE` | `/app/projects/{projectId}/workshop` | 从工坊移除企划   |

## 数据结构

```ts
interface ProjectCreateDTO {
  title: string;
  alias: string;
  typeId: string;
  metadata: string;
  description: string;
  coverFileId: string;
}

interface ProjectTypeInfoVO {
  id: string;
  name: string;
}

interface ProjectInfoVO {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  projectType: string;
  projectStatus: "进行中" | "已完成" | "已归档";
  metadata: string;
  creatorAvatarUrl?: string | null;
  creatorUsername?: string | null;
  creatorLastSubmittedAt?: string | null;
}
```

## 元信息标签

- `metadata` 继续通过现有创建、编辑接口存取 JSON 字符串，无需数据库迁移；带颜色的标签依赖后端扩展校验契约，应先部署配套后端，再上线前端。
- 标签结构为 `{ key: string, value: string, color?: "blue" | "green" | "amber" | "rose" | "violet" }`，存放在 `metadata.tags` 数组中。
- 标签名必填，新增时标签名和值会去除首尾空白。值可留空，保存为 `value: ""`；读取历史 `{ key }` 时也归一化为空字符串，旧键值对无需迁移。
- 颜色按标签独立配置，支持蓝色、绿色、琥珀色、玫瑰色、紫色以及默认颜色；已添加标签可修改颜色或恢复默认。默认颜色不写入 `color` 字段。
- 颜色只接受上述标识，非法类型、未知或超长字符串都回退默认样式，不丢弃有效标签。不接受任意 CSS/HEX/RGB 值，也不将用户输入拼接为样式或类名。
- 后端写入接口严格校验：`value` 可省略，但提供时必须为字符串；`color` 可省略，但提供时必须为上述颜色标识。非法类型、未知颜色及额外标签字段返回参数错误。前端读取容错不代表后端接受非法数据。
- 标签按数组顺序保存与展示，不按名称去重。编辑器提供上移、下移和删除，首尾移动按钮禁用；编辑态稳定 ID 不写入 metadata。
- 点击创建或保存时，尚未点击“添加”的有效草稿会连同颜色追加到末尾；只有值而没有标签名时阻止提交，取消则清空草稿。
- 编辑器、列表、详情共用标签展示组件：单键标签为完整胶囊，键值对区分主次，支持浅色与深色主题。详情展示全部标签并支持长文本换行；列表按卡片可用空间展示完整标签行，空间不足时隐藏超出部分。
- 界面统一使用“标签”和“添加标签”文案；仅填写值时提示“请填写标签名”，不要求补填选填的值。

### 标签验收

- 创建和编辑均能保存单键、键值对及混合标签；保存、刷新和重新编辑后内容、颜色与顺序一致。
- 排序、改色和删除互不串项；重复标签名允许存在，键盘移动后焦点仍属于原标签。
- 只有标签名的待添加草稿能直接提交，只有值的草稿提示填写标签名，取消草稿不会追加标签。
- 非法 metadata 或标签记录安全忽略；非法颜色不影响标签内容，单键标签不出现空值区域。

## 验收标准

- 企划列表可以分页展示。
- 企划类型来自接口，不在前端写死。
- 创建企划可以上传封面并提交 `coverFileId`。
- 企划详情能展示基础信息和当前状态。
- 编辑企划后列表和详情能刷新。
- 当前无删除接口时，不展示不可用删除功能。

## 依赖

- 依赖登录与会话模块。
- 依赖文件上传模块。
- 依赖公共 UI 与反馈模块。
- 后续项目模块会挂在企划详情下。

## 任务大厅

- 独立页面入口：`/dashboard/task-plaza`，在广场侧栏与企划平级，不属于企划子页面，不显示企划层级面包屑。
- 页签“所有待接取”默认选中，显式请求 `stageScope=ALL`；“当前阶段”请求 `CURRENT`。
- URL 查询参数 `stageScope` 保留刷新、分享及浏览器前进后退时的视图。
- 切换视图重置到第一页并收起分组，保留搜索、企划类型和排序。
- 每个企划默认展示 6 项，超出可展开/收起；按企划分页，每页 8 个。
- 任务卡通过 `isCurrentStage` 标注当前阶段或后续阶段，两者均可接取；后续阶段支持提前认领，不代表前置工作已完成。
- 接口：`GET /app/task/instance/plaza`，未传 `stageScope` 时后端默认 `CURRENT`。
