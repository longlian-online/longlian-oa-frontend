import type { Area } from "react-easy-crop";

import type { UploadBizType } from "@/types/file";

export const PROJECT_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const WEBP_QUALITY = 0.85;
export const FALLBACK_JPEG_QUALITY = 0.85;

export const STATIC_IMAGE_ACCEPT = ["jpg", "jpeg", "png", "webp", "avif"] as const;
export const STATIC_IMAGE_ACCEPT_ATTR = ".jpg,.jpeg,.png,.webp,.avif";

export type ImageOptimizeBizType = "avatar" | "thumbnail" | "cover";

export interface ImageResizeLimit {
  maxEdge: number;
  maxWidth?: number;
}

export interface FittedDimensions {
  width: number;
  height: number;
  resized: boolean;
}

export const IMAGE_RESIZE_LIMITS: Record<ImageOptimizeBizType, ImageResizeLimit> = {
  avatar: { maxEdge: 512 },
  thumbnail: { maxEdge: 600 },
  cover: { maxWidth: 1200, maxEdge: 1600 },
};

export function isOptimizableImageBizType(bizType: UploadBizType): bizType is ImageOptimizeBizType {
  return bizType === "avatar" || bizType === "thumbnail" || bizType === "cover";
}

interface CropOutput {
  name: string;
  type: string;
}

function replaceFileExt(fileName: string, ext: string): string {
  return /\.[^.]+$/.test(fileName) ? fileName.replace(/\.[^.]+$/, `.${ext}`) : `${fileName}.${ext}`;
}

export function getCropOutput(file: File): CropOutput {
  const jpeg = /\.jpe?g$/i.test(file.name);
  return {
    name: jpeg ? file.name : replaceFileExt(file.name, "png"),
    type: jpeg ? "image/jpeg" : "image/png",
  };
}

export function fitImageDimensions(
  width: number,
  height: number,
  limit?: ImageResizeLimit,
): FittedDimensions {
  if (width <= 0 || height <= 0) throw new Error("图片尺寸无效");
  if (!limit) {
    return {
      width: Math.max(1, Math.round(width)),
      height: Math.max(1, Math.round(height)),
      resized: false,
    };
  }
  const edgeScale = limit.maxEdge / Math.max(width, height);
  const widthScale = limit.maxWidth ? limit.maxWidth / width : 1;
  const scale = Math.min(1, edgeScale, widthScale);
  if (scale >= 1) {
    return {
      width: Math.max(1, Math.round(width)),
      height: Math.max(1, Math.round(height)),
      resized: false,
    };
  }
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    resized: true,
  };
}

export function centerSquareArea(width: number, height: number): Area {
  if (width <= 0 || height <= 0) throw new Error("图片尺寸无效");
  const size = Math.min(width, height);
  return { x: (width - size) / 2, y: (height - size) / 2, width: size, height: size };
}

export async function centerCropSquare(
  file: File,
  bizType: ImageOptimizeBizType = "thumbnail",
): Promise<File> {
  const image = await loadImage(file);
  return cropImageFile(
    file,
    image,
    centerSquareArea(image.naturalWidth, image.naturalHeight),
    bizType,
  );
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("图片无法读取"));
    };
    image.src = url;
  });
}

function encodeCanvasBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((value) => resolve(value), type, quality);
  });
}

function drawToCanvas(
  image: HTMLImageElement,
  source: Area,
  targetWidth: number,
  targetHeight: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("浏览器无法处理图片");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    image,
    source.x,
    source.y,
    source.width,
    source.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return canvas;
}

async function encodeFallbackFile(
  canvas: HTMLCanvasElement,
  sourceFile: File,
  quality: number,
  errorMessage: string,
): Promise<File> {
  const output = getCropOutput(sourceFile);
  const blob = await encodeCanvasBlob(
    canvas,
    output.type,
    output.type === "image/jpeg" ? quality : undefined,
  );
  if (!blob) throw new Error(errorMessage);
  return new File([blob], output.name, { type: output.type });
}

export async function optimizeImageForUpload(
  file: File,
  bizType: ImageOptimizeBizType,
): Promise<File> {
  const image = await loadImage(file);
  const fitted = fitImageDimensions(
    image.naturalWidth,
    image.naturalHeight,
    IMAGE_RESIZE_LIMITS[bizType],
  );
  if (!fitted.resized && file.type === "image/webp") return file;

  const canvas = drawToCanvas(
    image,
    { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight },
    fitted.width,
    fitted.height,
  );

  const webpBlob = await encodeCanvasBlob(canvas, "image/webp", WEBP_QUALITY);
  if (webpBlob && webpBlob.type === "image/webp") {
    const webpFile = new File([webpBlob], replaceFileExt(file.name, "webp"), {
      type: "image/webp",
    });
    if (!fitted.resized) {
      return webpFile.size > file.size ? file : webpFile;
    }
    if (webpFile.size <= file.size) return webpFile;

    const fallback = await encodeFallbackFile(
      canvas,
      file,
      FALLBACK_JPEG_QUALITY,
      "图片处理失败，请更换图片或浏览器后重试",
    ).catch(() => null);
    return fallback && fallback.size < webpFile.size ? fallback : webpFile;
  }

  if (!fitted.resized) return file;
  return encodeFallbackFile(
    canvas,
    file,
    FALLBACK_JPEG_QUALITY,
    "图片处理失败，请更换图片或浏览器后重试",
  );
}

export async function cropImageFile(
  file: File,
  image: HTMLImageElement,
  area: Area,
  bizType?: ImageOptimizeBizType,
): Promise<File> {
  const limit = bizType ? IMAGE_RESIZE_LIMITS[bizType] : undefined;
  const fitted = fitImageDimensions(area.width, area.height, limit);
  const canvas = drawToCanvas(image, area, fitted.width, fitted.height);

  if (bizType) {
    const webpBlob = await encodeCanvasBlob(canvas, "image/webp", WEBP_QUALITY);
    if (webpBlob && webpBlob.type === "image/webp") {
      const webpFile = new File([webpBlob], replaceFileExt(file.name, "webp"), {
        type: "image/webp",
      });
      if (webpFile.size <= file.size || file.type === "image/webp") return webpFile;
      const fallback = await encodeFallbackFile(
        canvas,
        file,
        FALLBACK_JPEG_QUALITY,
        "图片裁剪失败",
      ).catch(() => null);
      return fallback && fallback.size < webpFile.size ? fallback : webpFile;
    }
    return encodeFallbackFile(canvas, file, FALLBACK_JPEG_QUALITY, "图片裁剪失败");
  }

  return encodeFallbackFile(canvas, file, 0.95, "图片裁剪失败");
}
