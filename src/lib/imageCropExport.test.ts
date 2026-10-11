import { afterEach, expect, test, vi } from "vite-plus/test";
import { cropImageFile } from "@/lib/imageCrop";

afterEach(() => vi.unstubAllGlobals());

test("只将选中区域写入导出的上传文件", async () => {
  const drawImage = vi.fn();
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({ drawImage, fillRect: (): void => {} }),
    toBlob: (callback: BlobCallback, type: string): void =>
      callback(new Blob(["cropped"], { type })),
  };
  vi.stubGlobal("document", { createElement: () => canvas });
  const image = { naturalWidth: 2000, naturalHeight: 1000 } as HTMLImageElement;
  const result = await cropImageFile(new File([], "photo.png"), image, {
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

test("图片导出失败时拒绝上传", async () => {
  vi.stubGlobal("document", {
    createElement: () => ({
      getContext: () => ({ drawImage: (): void => {}, fillRect: (): void => {} }),
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
