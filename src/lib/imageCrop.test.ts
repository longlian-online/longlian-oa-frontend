import { expect, test } from "vite-plus/test";
import { centerSquareArea, getCropOutput } from "@/lib/imageCrop";

test("GIF 裁剪输出静态 PNG，JPEG 保持原格式", () => {
  expect(getCropOutput(new File([], "animation.gif", { type: "image/gif" }))).toEqual({
    name: "animation.png",
    type: "image/png",
  });
  expect(getCropOutput(new File([], "photo.jpeg", { type: "image/jpeg" }))).toEqual({
    name: "photo.jpeg",
    type: "image/jpeg",
  });
});

test("2:3 封面默认截取正中 1:1", () => {
  expect(centerSquareArea(600, 900)).toEqual({ x: 0, y: 150, width: 600, height: 600 });
  expect(centerSquareArea(900, 600)).toEqual({ x: 150, y: 0, width: 600, height: 600 });
});
