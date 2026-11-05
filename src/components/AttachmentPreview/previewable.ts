export const ARCHIVE_PREVIEW_LIMIT = 50 * 1024 * 1024;

const PREVIEWABLE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "avif",
  "bmp",
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "txt",
  "csv",
  "zip",
  "rar",
  "7z",
  "mp4",
  "webm",
  "mp3",
  "wav",
  "ogg",
  "oga",
  "opus",
  "m4a",
  "aac",
  "flac",
  "weba",
]);

export function fileExtension(fileName: string): string {
  const path = fileName.split(/[?#]/)[0] ?? fileName;
  const slash = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  const base = slash >= 0 ? path.slice(slash + 1) : path;
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return "";
  return base.slice(dot + 1).toLowerCase();
}

export function isArchiveFile(fileName: string): boolean {
  const extension = fileExtension(fileName);
  return extension === "zip" || extension === "rar" || extension === "7z";
}

export function isPreviewableFile(fileName: string): boolean {
  return PREVIEWABLE_EXTENSIONS.has(fileExtension(fileName));
}

/** 压缩包体积看不出来时返回 undefined，交给读取响应的长度再判断。 */
export function archiveBytesFromSizeText(sizeText: string): number | undefined {
  const match = /^(\d+(?:\.\d+)?) (B|KB|MB|GB)$/.exec(sizeText.trim());
  if (!match) return undefined;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return undefined;
  const unit = match[2];
  if (unit === "GB") return ARCHIVE_PREVIEW_LIMIT + 1;
  if (unit === "MB" && value > 50) return ARCHIVE_PREVIEW_LIMIT + 1;
  return undefined;
}

export type PreviewRejection = "unsupported" | "archive-too-large";

export function rejectPreview(fileName: string, fileSize?: number): PreviewRejection | null {
  if (!isPreviewableFile(fileName)) return "unsupported";
  if (isArchiveFile(fileName) && fileSize !== undefined && fileSize > ARCHIVE_PREVIEW_LIMIT) {
    return "archive-too-large";
  }
  return null;
}

export function previewRejectionMessage(reason: PreviewRejection): string {
  if (reason === "archive-too-large") return "压缩包超过 50MB，请下载后查看。";
  return "这个类型不能在页面内预览，请下载后查看。";
}

export class PreviewReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PreviewReadError";
  }
}

export async function readPreviewFile(
  fileName: string,
  url: string,
  signal: AbortSignal,
): Promise<File> {
  let response: Response;
  try {
    response = await fetch(url, { signal });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new PreviewReadError("无法读取文件，请稍后重试。");
  }
  if (!response.ok) throw new PreviewReadError("无法读取文件，请稍后重试。");

  if (isArchiveFile(fileName)) {
    const length = Number(response.headers.get("content-length"));
    if (Number.isFinite(length) && length > ARCHIVE_PREVIEW_LIMIT) {
      await response.body?.cancel();
      throw new PreviewReadError(previewRejectionMessage("archive-too-large"));
    }
  }

  const blob = await response.blob();
  if (isArchiveFile(fileName) && blob.size > ARCHIVE_PREVIEW_LIMIT) {
    throw new PreviewReadError(previewRejectionMessage("archive-too-large"));
  }
  return new File([blob], fileName, { type: blob.type || "application/octet-stream" });
}
