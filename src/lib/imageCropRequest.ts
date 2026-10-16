export type ImageCropShape = "rect" | "round";

export interface ImageCropOptions {
  shape?: ImageCropShape;
  allowOriginal?: boolean;
}

interface ImageCropRequest {
  id: number;
  file: File;
  aspect?: number;
  shape?: ImageCropShape;
  allowOriginal: boolean;
  resolve: (file: File) => void;
  reject: (error: Error) => void;
}

export class UploadCancelledError extends Error {
  constructor() {
    super("已取消图片上传");
    this.name = "UploadCancelledError";
  }
}

const queue: ImageCropRequest[] = [];
const listeners = new Set<() => void>();
let nextId = 0;

function notify(): void {
  listeners.forEach((listener) => listener());
}

export function subscribeImageCrop(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getImageCropRequest(): ImageCropRequest | null {
  return queue[0] ?? null;
}

export function requestImageCrop(
  file: File,
  aspect?: number,
  options?: ImageCropOptions,
): Promise<File> {
  return new Promise((resolve, reject) => {
    queue.push({
      id: ++nextId,
      file,
      aspect,
      shape: options?.shape,
      allowOriginal: options?.allowOriginal !== false,
      resolve,
      reject,
    });
    notify();
  });
}

export function completeImageCrop(id: number, file: File | null): void {
  const request = queue[0];
  if (!request || request.id !== id) return;
  queue.shift();
  if (file) request.resolve(file);
  else request.reject(new UploadCancelledError());
  notify();
}
