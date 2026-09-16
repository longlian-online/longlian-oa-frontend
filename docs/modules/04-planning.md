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
- 从工坊移除企划。

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
  creatorAvatarUrl?: string;
}
```

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
