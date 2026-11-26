import { afterEach, expect, test, vi } from "vite-plus/test";

import { cropImageFile, optimizeImageForUpload, WEBP_QUALITY } from "@/lib/imageCrop";

afterEach(() => vi.unstubAllGlobals());

function stubImageLoader(naturalWidth: number, naturalHeight: number): void {
  class MockImage {
    naturalWidth = naturalWidth;
    naturalHeight = naturalHeight;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;

    set src(_value: string) {
      queueMicrotask(() => this.onload?.());
    }
  }
  vi.stubGlobal("Image", MockImage);
  vi.stubGlobal("URL", {
    createObjectURL: vi.fn(() => "blob:mock"),
    revokeObjectURL: vi.fn(),
  });
}

test("未指定业务类型时只将选中区域按原像素写入导出文件", async () => {
  const drawImage = vi.fn();
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({
      drawImage,
      imageSmoothingEnabled: false,
      imageSmoothingQuality: "low",
    }),
    toBlob: (callback: BlobCallback, type: string): void =>
      callback(new Blob(["cropped"], { type })),
  };
  vi.stubGlobal("document", { createElement: () => canvas });
  const image = { naturalWidth: 2000, naturalHeight: 1000 } as HTMLImageElement;
  const result = await cropImageFile(new File([], "photo.png", { type: "image/png" }), image, {
    x: 500,
    y: 100,
    width: 1000,
    height: 600,
  });
  expect(drawImage).toHaveBeenCalledWith(image, 500, 100, 1000, 600, 0, 0, 1000, 600);
  expect([canvas.width, canvas.height]).toEqual([1000, 600]);
  expect(result.type).toBe("image/png");
  expect(await result.text()).toBe("cropped");
});

test("指定业务类型裁剪时一步完成等比缩放并以 0.85 质量导出 WebP", async () => {
  const drawImage = vi.fn();
  const toBlob = vi.fn((callback: BlobCallback, type: string) =>
    callback(new Blob(["w"], { type })),
  );
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({
      drawImage,
      imageSmoothingEnabled: false,
      imageSmoothingQuality: "low",
    }),
    toBlob,
  };
  vi.stubGlobal("document", { createElement: () => canvas });
  const image = { naturalWidth: 2400, naturalHeight: 3600 } as HTMLImageElement;
  const source = new File([new Uint8Array(100)], "cover.png", { type: "image/png" });
  const result = await cropImageFile(
    source,
    image,
    { x: 0, y: 0, width: 2400, height: 3600 },
    "cover",
  );
  expect([canvas.width, canvas.height]).toEqual([1067, 1600]);
  expect(drawImage).toHaveBeenCalledWith(image, 0, 0, 2400, 3600, 0, 0, 1067, 1600);
  expect(toBlob).toHaveBeenCalledWith(expect.any(Function), "image/webp", WEBP_QUALITY);
  expect(result.name).toBe("cover.webp");
  expect(result.type).toBe("image/webp");
});

test("图片导出失败时拒绝上传", async () => {
  vi.stubGlobal("document", {
    createElement: () => ({
      getContext: () => ({
        drawImage: (): void => {},
        imageSmoothingEnabled: false,
        imageSmoothingQuality: "low",
      }),
      toBlob: (callback: BlobCallback): void => callback(null),
    }),
  });
  await expect(
    cropImageFile(
      new File([], "photo.png"),
      { naturalWidth: 100, naturalHeight: 100 } as HTMLImageElement,
      { x: 0, y: 0, width: 100, height: 100 },
    ),
  ).rejects.toThrow("图片裁剪失败");
});

test("未超尺寸的 WebP 原图直接跳过重绘，超尺寸 WebP 仍按上限等比缩放", async () => {
  const createElement = vi.fn();
  vi.stubGlobal("document", { createElement });
  stubImageLoader(400, 400);
  const smallWebp = new File([new Uint8Array(64)], "avatar.webp", { type: "image/webp" });
  expect(await optimizeImageForUpload(smallWebp, "avatar")).toBe(smallWebp);
  expect(createElement).not.toHaveBeenCalled();

  const drawImage = vi.fn();
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({
      drawImage,
      imageSmoothingEnabled: false,
      imageSmoothingQuality: "low",
    }),
    toBlob: (callback: BlobCallback, type: string): void =>
      callback(new Blob([new Uint8Array(32)], { type })),
  };
  vi.stubGlobal("document", { createElement: () => canvas });
  stubImageLoader(2000, 1000);
  const largeWebp = new File([new Uint8Array(200)], "avatar.webp", { type: "image/webp" });
  const resized = await optimizeImageForUpload(largeWebp, "avatar");
  expect([canvas.width, canvas.height]).toEqual([512, 256]);
  expect(resized.type).toBe("image/webp");
  expect(resized.size).toBe(32);
});

test("未缩放时 WebP 体积反而更大则保留原文件，已缩放时绝不退回未缩放原图", async () => {
  const toBlob = vi.fn((callback: BlobCallback, type: string) =>
    callback(new Blob([new Uint8Array(type === "image/webp" ? 120 : 150)], { type })),
  );
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({
      drawImage: (): void => {},
      imageSmoothingEnabled: false,
      imageSmoothingQuality: "low",
    }),
    toBlob,
  };
  vi.stubGlobal("document", { createElement: () => canvas });

  stubImageLoader(300, 300);
  const smallJpg = new File([new Uint8Array(80)], "avatar.jpg", { type: "image/jpeg" });
  expect(await optimizeImageForUpload(smallJpg, "avatar")).toBe(smallJpg);

  stubImageLoader(2000, 2000);
  const largeJpg = new File([new Uint8Array(80)], "avatar.jpg", { type: "image/jpeg" });
  const resized = await optimizeImageForUpload(largeJpg, "avatar");
  expect([canvas.width, canvas.height]).toEqual([512, 512]);
  expect(resized).not.toBe(largeJpg);
  expect(resized.type).toBe("image/webp");
});

test("浏览器不支持 WebP 编码时自动降级回原格式", async () => {
  const toBlob = vi.fn((callback: BlobCallback, type: string) => {
    if (type === "image/webp") {
      callback(new Blob([new Uint8Array(50)], { type: "image/png" }));
      return;
    }
    callback(new Blob([new Uint8Array(40)], { type }));
  });
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({
      drawImage: (): void => {},
      imageSmoothingEnabled: false,
      imageSmoothingQuality: "low",
    }),
    toBlob,
  };
  vi.stubGlobal("document", { createElement: () => canvas });

  stubImageLoader(1200, 1200);
  const jpg = new File([new Uint8Array(100)], "thumb.jpg", { type: "image/jpeg" });
  const result = await optimizeImageForUpload(jpg, "thumbnail");
  expect([canvas.width, canvas.height]).toEqual([600, 600]);
  expect(result.type).toBe("image/jpeg");
  expect(result.name).toBe("thumb.jpg");
});
