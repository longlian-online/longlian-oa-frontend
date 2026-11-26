import { expect, test } from "vite-plus/test";

import {
  centerSquareArea,
  fitImageDimensions,
  getCropOutput,
  IMAGE_RESIZE_LIMITS,
  STATIC_IMAGE_ACCEPT,
} from "@/lib/imageCrop";

test("裁剪回退格式保持 JPEG，其余输出 PNG", () => {
  expect(getCropOutput(new File([], "photo.png", { type: "image/png" }))).toEqual({
    name: "photo.png",
    type: "image/png",
  });
  expect(getCropOutput(new File([], "photo.jpeg", { type: "image/jpeg" }))).toEqual({
    name: "photo.jpeg",
    type: "image/jpeg",
  });
});

test("静态展示图白名单包含 WebP 且不包含 GIF", () => {
  expect(STATIC_IMAGE_ACCEPT).toContain("webp");
  expect(STATIC_IMAGE_ACCEPT).not.toContain("gif");
});

test("2:3 封面默认截取正中 1:1", () => {
  expect(centerSquareArea(600, 900)).toEqual({ x: 0, y: 150, width: 600, height: 600 });
  expect(centerSquareArea(900, 600)).toEqual({ x: 150, y: 0, width: 600, height: 600 });
});

test("按业务类型等比限制最大尺寸且只缩不放", () => {
  expect(fitImageDimensions(300, 300, IMAGE_RESIZE_LIMITS.avatar)).toEqual({
    width: 300,
    height: 300,
    resized: false,
  });
  expect(fitImageDimensions(2048, 1024, IMAGE_RESIZE_LIMITS.avatar)).toEqual({
    width: 512,
    height: 256,
    resized: true,
  });
  expect(fitImageDimensions(1200, 1200, IMAGE_RESIZE_LIMITS.thumbnail)).toEqual({
    width: 600,
    height: 600,
    resized: true,
  });
  expect(fitImageDimensions(2400, 3600, IMAGE_RESIZE_LIMITS.cover)).toEqual({
    width: 1067,
    height: 1600,
    resized: true,
  });
  expect(fitImageDimensions(2400, 1200, IMAGE_RESIZE_LIMITS.cover)).toEqual({
    width: 1200,
    height: 600,
    resized: true,
  });
  expect(fitImageDimensions(800, 3200, IMAGE_RESIZE_LIMITS.cover)).toEqual({
    width: 400,
    height: 1600,
    resized: true,
  });
  expect(fitImageDimensions(1000, 1500, IMAGE_RESIZE_LIMITS.cover)).toEqual({
    width: 1000,
    height: 1500,
    resized: false,
  });
});
