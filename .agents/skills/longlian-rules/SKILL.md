---
name: longlian-rules
description: longlian-oa-frontend 项目规范。适用于本仓库中的代码、UI、依赖、构建、测试、lint、格式化、提交、产品文档和需求文档工作。用于把现有 Cursor .mdc 规则桥接为 Codex 可识别的项目 Skill。
---

# longlian-oa 前端项目规范

在 `longlian-oa-frontend` 仓库内工作时使用本 Skill。

本项目保留历史 Cursor 规则文件 `.cursor/rules/*.mdc`。Codex Agent 必须通过本 Skill 将这些 Cursor 规则视为一等项目规范。

## 必读规则来源

修改 TypeScript、React、shadcn/ui、Tailwind、路由、组件结构、命名、导入或 UI 代码前，必须读取并遵守：

- `../../../.cursor/rules/project-rules.mdc`

修改依赖、脚本、工具链用法、构建、lint、格式化、测试、检查、CI 或提交流程前，必须读取并遵守：

- `../../../.cursor/rules/viteplus.mdc`

涉及产品意图、目标用户、UI 氛围、权限、工作流行为或功能范围时，还必须读取：

- `../../../PRODUCT.md`

涉及 MVP 范围、功能边界、主流程、验收标准或“不做什么”时，还必须读取：

- `../../../docs/mvp-spec.md`

## 文档语言

新增或更新项目文档时，默认使用中文。除非用户明确要求英文，或外部协议、API 字段、代码标识、专有名词必须保留英文。

## Cursor Frontmatter 映射

按以下方式理解 Cursor `.mdc` frontmatter：

- `alwaysApply: true` 表示该规则在声明范围内必须应用。
- `globs` 表示该规则适用于匹配的文件。
- `description` 用于说明该规则何时相关。

## 优先级

规则冲突时按以下优先级处理：

1. `../../../AGENTS.md`
2. 本 Skill 及其引用的 Cursor rules
3. `../../../PRODUCT.md`
4. `../../../docs/mvp-spec.md`

除非用户明确要求修改 Cursor 规则，否则不要编辑原始 Cursor 规则文件。
