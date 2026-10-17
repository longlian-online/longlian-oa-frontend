import type { Area } from "react-easy-crop";

export const PROJECT_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const WEBP_THRESHOLD_BYTES = 1024 * 1024;

interface CropOutput {
  name: string;
  type: string;
}

export function getCropOutput(file: File): CropOutput {
  const jpeg = /\.jpe?g$/i.test(file.name);
  return {
    name: jpeg ? file.name : file.name.replace(/\.[^.]+$/, "") + ".png",
    type: jpeg ? "image/jpeg" : "image/png",
  };
}

export function centerSquareArea(width: number, height: number): Area {
  if (width <= 0 || height <= 0) throw new Error("图片尺寸无效");
  const size = Math.min(width, height);
  return { x: (width - size) / 2, y: (height - size) / 2, width: size, height: size };
}

export async function centerCropSquare(file: File): Promise<File> {
  const image = await loadImage(file);
  return cropImageFile(file, image, centerSquareArea(image.naturalWidth, image.naturalHeight));
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

export async function convertImageToWebp(file: File): Promise<File> {
  if (file.type === "image/webp") return file;
  const image = await loadImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("浏览器无法处理图片");
  context.drawImage(image, 0, 0);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) =>
        value?.type === "image/webp"
          ? resolve(value)
          : reject(new Error("图片处理失败，请更换图片或浏览器后重试")),
      "image/webp",
      0.9,
    );
  });
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", {
    type: "image/webp",
  });
}

export async function cropImageFile(
  file: File,
  image: HTMLImageElement,
  area: Area,
): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(area.width));
  canvas.height = Math.max(1, Math.round(area.height));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("浏览器无法处理图片");
  context.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  const output = getCropOutput(file);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) => (value ? resolve(value) : reject(new Error("图片裁剪失败"))),
      output.type,
      0.95,
    );
  });
  return new File([blob], output.name, { type: output.type });
}
