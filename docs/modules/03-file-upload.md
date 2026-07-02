# 03 文件上传模块

## 目标

封装文件上传流程，为企划封面、用户头像、任务提交附件提供统一的 `fileId` 获取能力。

## 范围

必须实现：

- 创建文件上传资源。
- 使用后端返回的预签名地址上传文件。
- 返回业务接口需要的 `fileId`。
- 支持上传失败提示。
- 支持基础文件类型和大小校验。

暂不实现：

- 文件管理中心。
- 文件预览器。
- 分片上传。
- 上传历史。

## 建议文件

```txt
src/
├── api/
│   └── file.ts
├── types/
│   └── file.ts
├── components/
│   └── FileUpload/
│       └── index.tsx
└── hooks/
    └── useUploadFile.ts
```

## 接口

| 方法   | 路径                  | 用途                             |
| ------ | --------------------- | -------------------------------- |
| `POST` | `/common/file/upload` | 创建文件上传，获取预签名上传地址 |

## 数据结构

```ts
interface CreateFileReqDTO {
  fileName: string;
  fileExt: string;
  fileSize: number;
  fileMime: string;
  bizType: "avatar" | "cover" | "task_submit";
  bizId: string;
}

interface ResourcCreateVO {
  fileId: string;
  uploadUrl: string;
  key: string;
  storageType: "NONE" | "LOCAL" | "OSS";
}
```

## 上传流程

1. 用户选择文件。
2. 前端校验扩展名、MIME、大小。
3. 调用 `/common/file/upload`。
4. 使用返回的 `uploadUrl` 上传到存储服务。
5. 上传成功后返回 `fileId`。
6. 业务表单保存 `fileId`。

## 验收标准

- 上传企划封面后能得到 `coverFileId`。
- 上传任务附件后能写入提交 `metadata`。
- 上传失败有全局错误提示。
- 文件上传组件不直接调用企划或任务接口。

## 依赖

- 依赖登录与会话模块提供认证上下文。
- 依赖公共 UI 与反馈模块展示提示。
