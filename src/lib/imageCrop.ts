import type { Area } from "react-easy-crop";

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
