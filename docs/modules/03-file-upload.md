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
   - 图片上传支持 AVIF；选择器、扩展名和 MIME 校验保持一致。
   - 封面与缩略图（创建、编辑、自定义上传及从封面截取）最大 10MB，1MB = 1024 × 1024 字节。
   - 原图超过 10MB 时在裁剪、转换及申请上传资源前拒绝；裁剪结果和最终上传文件也不得超过 10MB。
   - 原图或裁剪结果超过 1MB 时，上传前转换为 WebP；恰好 1MB 不转换，恰好 10MB 允许处理。已有 WebP 无需重复编码。
   - 转换结果大于转换前文件时使用转换前文件；裁剪后以裁剪结果为比较基准，不能绕过裁剪要求。大小相等时使用 WebP。界面不展示转换策略。
   - 使用浏览器 Canvas 编码（质量 0.9），保留图片尺寸及透明度；GIF 转换后为静态图片。转换失败或浏览器不支持 WebP 编码时明确提示并终止上传，不回退上传原图。
   - 上传资源申请的文件名、扩展名、MIME、大小及存储直传的正文、Content-Type 均采用处理后的文件。头像和任务附件不应用此 WebP 策略。
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
