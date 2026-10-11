import { expect, test } from "vite-plus/test";
import { getCropOutput } from "@/lib/imageCrop";

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
