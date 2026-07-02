export type UploadBizType = "avatar" | "cover" | "task_submit";

export type StorageType = "NONE" | "LOCAL" | "OSS";

export interface CreateFileReqDTO {
  fileName: string;
  fileExt: string;
  fileSize: number;
  fileMime: string;
  bizType: UploadBizType;
  bizId: string;
}

export interface ResourceCreateVO {
  fileId: string;
  uploadUrl: string;
  key: string;
  storageType: StorageType;
}

export interface UploadedFileInfo {
  fileId: string;
  fileName: string;
  fileSize: number;
  fileMime: string;
  previewUrl?: string;
}

export interface FileValidationOptions {
  accept?: string[];
  maxSize?: number;
}
