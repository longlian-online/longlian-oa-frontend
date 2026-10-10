import { expect, test } from "vite-plus/test";
import {
  completeImageCrop,
  getImageCropRequest,
  requestImageCrop,
  UploadCancelledError,
} from "@/lib/imageCropRequest";

test("多入口同时上传图片时依次裁剪，不覆盖前一个请求", async () => {
  const first = new File([], "first.png");
  const second = new File([], "second.png");
  const firstResult = requestImageCrop(first, 1);
  const secondResult = requestImageCrop(second, 2 / 3);
  const request = getImageCropRequest()!;
  expect(request.file).toBe(first);
  completeImageCrop(request.id, first);
  expect(await firstResult).toBe(first);
  const next = getImageCropRequest()!;
  expect(next.file).toBe(second);
  completeImageCrop(next.id, second);
  expect(await secondResult).toBe(second);
  expect(getImageCropRequest()).toBeNull();
});

test("取消裁剪结束请求，且不会返回原图供上传", async () => {
  const result = requestImageCrop(new File([], "cancel.png"));
  const assertion = expect(result).rejects.toBeInstanceOf(UploadCancelledError);
  completeImageCrop(getImageCropRequest()!.id, null);
  await assertion;
  expect(getImageCropRequest()).toBeNull();
});
