# 07 工作流编辑器模块

## 目标

提供模板创建和编辑时的拖拽编排能力。视觉上可以表现为工作流编辑器，但数据结构必须保持 `sort + parallelSort`，不做任意图结构。

## 范围

必须实现：

- 添加步骤。
- 删除步骤。
- 修改步骤名称。
- 拖拽调整步骤顺序。
- 设置并行组。
- 输出 `WorkshopTaskTemplateNodeCreateDTO[]`。

暂不实现：

- 任意节点连线。
- 条件分支。
- 循环流程。
- 多入口流程。
- 多出口流程。
- BPMN。

## 建议文件

```txt
src/
└── components/
    └── WorkflowEditor/
        ├── index.tsx
        ├── WorkflowCanvas.tsx
        ├── WorkflowNode.tsx
        ├── NodePanel.tsx
        └── utils.ts
```

## 输入输出

输入：

```ts
interface WorkflowEditorValue {
  nodes: WorkshopTaskTemplateNodeCreateDTO[];
}
```

输出：

```ts
interface WorkshopTaskTemplateNodeCreateDTO {
  baseTaskId: string;
  customName?: string;
  sort: number;
  parallelSort?: number;
}
```

## 编排规则

- `sort` 表示阶段顺序。
- `sort` 相同表示同一并行组。
- `parallelSort` 表示并行组内顺序。
- 单节点阶段也使用 `sort`。
- 拖拽后必须重新规范化 `sort` 和 `parallelSort`。

示例：

```txt
sort=1: 创建
sort=2: 翻译A / 翻译B / 翻译C
sort=3: 校对
sort=4: 审核
sort=5: 发布
```

## 验收标准

- 可以添加至少一个步骤。
- 可以将步骤拖到新的顺序。
- 可以把多个步骤放入同一并行组。
- 保存时输出的数据能直接提交给模板接口。
- 不会生成任意边、条件分支、循环结构。

## 依赖

- 依赖工作流模板模块保存模板。
- 当前 Swagger 未暴露原子任务列表接口，MVP 可先用固定 mock 原子任务，后续替换为接口。
