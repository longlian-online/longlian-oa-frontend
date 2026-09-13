import { useState } from "react";

import { createFileUpload } from "@/api/file";
import { $tip } from "@/components/tip";
import type { FileValidationOptions, UploadedFileInfo, UploadBizType } from "@/types/file";

const DEFAULT_MAX_SIZE = 50 * 1024 * 1024;
const DEFAULT_ACCEPT = ["jpg", "jpeg", "png", "gif", "pdf", "doc", "docx", "xls", "xlsx", "zip"];

const MIME_BY_EXT: Record<string, string[]> = {
  jpg: ["image/jpeg", "image/jpg"],
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
  const lastDotIndex = fileName.lastIndexOf(".");
  if (lastDotIndex < 0 || lastDotIndex === fileName.length - 1) return "";
  return fileName.slice(lastDotIndex + 1).toLowerCase();
}

function normalizeMimeType(file: File, fileExt: string): string {
  if (file.type === "image/jpg") return "image/jpeg";
  if (file.type) return file.type;
  return MIME_BY_EXT[fileExt]?.[0] ?? "application/octet-stream";
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
  const fileMime = normalizeMimeType(file, fileExt);

  if (!fileExt || !accept.map((item) => item.toLowerCase()).includes(fileExt)) {
    return `仅支持 ${accept.join("、")} 格式`;
  }

  const expectedMimeTypes = MIME_BY_EXT[fileExt] ?? [];
  if (expectedMimeTypes.length > 0 && !expectedMimeTypes.includes(fileMime)) {
    return "文件类型与扩展名不匹配";
  }

  if (file.size > maxSize) {
    return `文件大小不能超过 ${formatFileSize(maxSize)}`;
  }

  return null;
}

async function uploadToPresignedUrl(uploadUrl: string, file: File): Promise<void> {
  if (!uploadUrl) return;

  const fileExt = getFileExt(file.name);
  const fileMime = normalizeMimeType(file, fileExt);
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": fileMime,
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
      const fileMime = normalizeMimeType(file, fileExt);
      const resource = await createFileUpload({
        fileName: file.name,
        fileExt,
        fileSize: file.size,
        fileMime,
        bizType: options.bizType,
        bizId: options.bizId,
      });

      await uploadToPresignedUrl(resource.uploadUrl, file);

      const uploadedFile: UploadedFileInfo = {
        fileId: resource.fileId,
        fileName: file.name,
        fileSize: file.size,
        fileMime,
        previewUrl: fileMime.startsWith("image/") ? URL.createObjectURL(file) : undefined,
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
