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
  bizType: "avatar" | "cover" | "thumbnail" | "task_submit";
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
   - 头像、封面与缩略图仅支持静态图片（jpg、jpeg、png、webp、avif），不支持 GIF；选择器、扩展名和 MIME 校验保持一致。
   - 封面与缩略图（创建、编辑、自定义上传及从封面截取）最大 10MB，1MB = 1024 × 1024 字节。
   - 压缩包（zip、rar、7z）最大 500MB。未单独指定上限时，其他文件最大 50MB；调用方传入更小的上限时仍以该值为准。
   - 原图超过大小限制时在裁剪、缩放及申请上传资源前拒绝；裁剪结果和最终上传文件也不得超过上限。
   - 头像、缩略图、封面上传前按业务类型等比限制最大像素尺寸（只缩不放）：
     - `avatar`：最大边长 512px；
     - `thumbnail`：最大边长 600px；
     - `cover`：最大宽 1200px 且最大边长 1600px。
   - 头像、缩略图、封面上传前统一使用浏览器 Canvas 编码为 `image/webp`（质量 0.85），保留透明度；裁剪场景在单次绘制中同时完成裁切、等比缩放与 WebP 编码。
   - 未触发缩放且转换后体积大于原文件时保留原文件；已触发缩放时优先保持尺寸上限，若 WebP 体积更大则与同尺寸原格式对比取较小者。浏览器不支持 WebP 编码时自动降级回原格式。界面不展示转换策略。
   - 上传资源申请的文件名、扩展名、MIME、大小及存储直传的正文、Content-Type 均采用处理后的文件。任务提交附件（`task_submit`）与项目附件（`project_attachment`）不应用此缩放与 WebP 策略。
3. 调用 `/common/file/upload`。
4. 使用返回的 `uploadUrl` 上传到存储服务。
5. 上传成功后返回 `fileId`。
6. 业务表单保存 `fileId`。

## 验收标准

- 上传企划封面后能得到 `coverFileId`。
- 上传任务附件后通过提交请求 `values` 中的 `{ fileId }` 引用文件；文件信息及 CDN 签名读取链接由任务详情接口返回。
- 上传失败有全局错误提示。
- 文件上传组件不直接调用企划或任务接口。

## 依赖

- 依赖登录与会话模块提供认证上下文。
- 依赖公共 UI 与反馈模块展示提示。
