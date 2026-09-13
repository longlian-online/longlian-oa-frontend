# MVP 模块实现顺序

本目录按 MVP 实现顺序拆分模块文档。后续开发按编号推进，完成一个模块后再进入下一个模块，避免企划、工坊、工作流、任务流转互相缠在一起。

## 实现顺序

| 顺序 | 模块                 | 文档                                                           |
| ---- | -------------------- | -------------------------------------------------------------- |
| 01   | 登录与会话模块       | [01-login-session.md](./01-login-session.md)                   |
| 02   | 公共 UI 与反馈模块   | [02-common-ui-feedback.md](./02-common-ui-feedback.md)         |
| 03   | 文件上传模块         | [03-file-upload.md](./03-file-upload.md)                       |
| 04   | 企划模块             | [04-planning.md](./04-planning.md)                             |
| 05   | 项目模块             | [05-project-item.md](./05-project-item.md)                     |
| 06   | 工作流模板模块       | [06-workflow-template.md](./06-workflow-template.md)           |
| 07   | 工作流编辑器模块     | [07-workflow-editor.md](./07-workflow-editor.md)               |
| 08   | 工作流实例与任务模块 | [08-workflow-instance-task.md](./08-workflow-instance-task.md) |
| 09   | 工坊模块             | [09-workshop.md](./09-workshop.md)                             |

## 总体依赖

```txt
01 登录与会话
  ↓
02 公共 UI 与反馈
  ↓
03 文件上传
  ↓
04 企划
  ↓
05 项目
  ↓
06 工作流模板
  ↓
07 工作流编辑器
  ↓
08 工作流实例与任务
  ↓
09 工坊整合
```

说明：

- 公共 UI 放在前面，是为了后续模块统一使用全局提示、确认、加载、空状态、分页等基础能力。
- 文件上传放在企划前面，是因为企划封面和任务提交附件都依赖 `fileId`。
- 工坊放最后，是因为它会聚合企划展示和工作流模板入口。
