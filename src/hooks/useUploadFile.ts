import { useState } from "react";

import { createFileUpload } from "@/api/file";
import { $tip } from "@/components/tip";
import type { FileValidationOptions, UploadedFileInfo, UploadBizType } from "@/types/file";

const DEFAULT_MAX_SIZE = 50 * 1024 * 1024;
const DEFAULT_ACCEPT = ["jpg", "jpeg", "png", "gif", "pdf", "doc", "docx", "xls", "xlsx", "zip"];

const MIME_BY_EXT: Record<string, string[]> = {
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  png: ["image/png"],
  gif: ["image/gif"],
  pdf: ["application/pdf"],
  doc: ["application/msword"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  xls: ["application/vnd.ms-excel"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  zip: ["application/zip", "application/x-zip-compressed"],
};

interface UploadFileOptions extends FileValidationOptions {
  bizType: UploadBizType;
  bizId: string;
}

interface UseUploadFileResult {
  uploading: boolean;
  uploadFile: (file: File, options: UploadFileOptions) => Promise<UploadedFileInfo>;
}

export function getFileExt(fileName: string): string {
  const [, ...parts] = fileName.split(".").reverse();
  if (parts.length === 0) return "";
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

function formatFileSize(size: number): string {
  if (size < 1024 * 1024) {
    return `${Math.ceil(size / 1024)}KB`;
  }
  return `${(size / 1024 / 1024).toFixed(1)}MB`;
}

function validateFile(file: File, options: FileValidationOptions): string | null {
  const accept = options.accept ?? DEFAULT_ACCEPT;
  const maxSize = options.maxSize ?? DEFAULT_MAX_SIZE;
  const fileExt = getFileExt(file.name);

  if (!fileExt || !accept.map((item) => item.toLowerCase()).includes(fileExt)) {
    return `仅支持 ${accept.join("、")} 格式`;
  }

  const expectedMimeTypes = MIME_BY_EXT[fileExt] ?? [];
  if (file.type && expectedMimeTypes.length > 0 && !expectedMimeTypes.includes(file.type)) {
    return "文件类型与扩展名不匹配";
  }

  if (file.size > maxSize) {
    return `文件大小不能超过 ${formatFileSize(maxSize)}`;
  }

  return null;
}

async function uploadToPresignedUrl(uploadUrl: string, file: File): Promise<void> {
  if (!uploadUrl) return;

  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error(`文件上传失败：${response.status}`);
  }
}

export function useUploadFile(): UseUploadFileResult {
  const [uploading, setUploading] = useState(false);

  const uploadFile = async (file: File, options: UploadFileOptions): Promise<UploadedFileInfo> => {
    const validationError = validateFile(file, options);
    if (validationError) {
      $tip(validationError, "error");
      throw new Error(validationError);
    }

    setUploading(true);
    try {
      const fileExt = getFileExt(file.name);
      const resource = await createFileUpload({
        fileName: file.name,
        fileExt,
        fileSize: file.size,
        fileMime: file.type || "application/octet-stream",
        bizType: options.bizType,
        bizId: options.bizId,
      });

      await uploadToPresignedUrl(resource.uploadUrl, file);

      const uploadedFile: UploadedFileInfo = {
        fileId: resource.fileId,
        fileName: file.name,
        fileSize: file.size,
        fileMime: file.type || "application/octet-stream",
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      };

      $tip("文件上传成功", "success");
      return uploadedFile;
    } catch (error) {
      $tip(error instanceof Error ? error.message : "文件上传失败", "error");
      throw error;
    } finally {
      setUploading(false);
    }
  };

  return { uploading, uploadFile };
}
