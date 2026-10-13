import { renderToString } from "react-dom/server";
import { expect, test, vi } from "vite-plus/test";
import { $tip } from "@/components/tip";
import { UploadCancelledError } from "@/lib/imageCropRequest";
import { useUploadFile } from "@/hooks/useUploadFile";

const { crop, create } = vi.hoisted(() => ({ crop: vi.fn(), create: vi.fn() }));
vi.mock("@/lib/imageCropRequest", () => ({
  requestImageCrop: crop,
  UploadCancelledError: class extends Error {},
}));
vi.mock("@/api/file", () => ({ createFileUpload: create }));
vi.mock("@/components/tip", () => ({ $tip: vi.fn() }));

test("底层上传自动裁剪图片，并仅上传裁剪结果", async () => {
  const selected = new File(["selected"], "photo.png", { type: "image/png" });
  crop.mockResolvedValue(selected);
  create.mockResolvedValue({ fileId: "id", uploadUrl: "" });
  let upload: ReturnType<typeof useUploadFile>["uploadFile"] | undefined;
  function Probe(): null {
    upload = useUploadFile().uploadFile;
    return null;
  }
  renderToString(<Probe />);
  const result = await upload!(new File(["original"], "photo.png", { type: "image/png" }), {
    bizType: "avatar",
    bizId: "user",
  });
  expect(crop).toHaveBeenCalledWith(expect.any(File), 1);
  expect(create).toHaveBeenCalledWith(expect.objectContaining({ fileSize: selected.size }));
  expect(result.fileSize).toBe(selected.size);
  if (result.previewUrl) URL.revokeObjectURL(result.previewUrl);
});

test("非图片附件直接上传，不打开裁剪框", async () => {
  crop.mockClear();
  create.mockClear();
  create.mockResolvedValue({ fileId: "pdf-id", uploadUrl: "" });
  let upload: ReturnType<typeof useUploadFile>["uploadFile"] | undefined;
  function Probe(): null {
    upload = useUploadFile().uploadFile;
    return null;
  }
  renderToString(<Probe />);
  await upload!(new File(["pdf"], "task.pdf", { type: "application/pdf" }), {
    bizType: "task_submit",
    bizId: "task",
  });
  expect(crop).not.toHaveBeenCalled();
  expect(create).toHaveBeenCalledTimes(1);
});

test("裁剪后文件超过大小限制时不创建上传资源", async () => {
  create.mockClear();
  crop.mockResolvedValue(new File(["too large"], "photo.png", { type: "image/png" }));
  let upload: ReturnType<typeof useUploadFile>["uploadFile"] | undefined;
  function Probe(): null {
    upload = useUploadFile().uploadFile;
    return null;
  }
  renderToString(<Probe />);
  await expect(
    upload!(new File(["ok"], "photo.png", { type: "image/png" }), {
      bizType: "avatar",
      bizId: "user",
      maxSize: 3,
    }),
  ).rejects.toThrow("文件大小不能超过");
  expect(create).not.toHaveBeenCalled();
});

test("取消底层裁剪时不上传，也不弹失败提示", async () => {
  create.mockClear();
  vi.mocked($tip).mockClear();
  crop.mockRejectedValue(new UploadCancelledError());
  let upload: ReturnType<typeof useUploadFile>["uploadFile"] | undefined;
  function Probe(): null {
    upload = useUploadFile().uploadFile;
    return null;
  }
  renderToString(<Probe />);
  await expect(
    upload!(new File(["image"], "photo.png", { type: "image/png" }), {
      bizType: "avatar",
      bizId: "user",
    }),
  ).rejects.toBeInstanceOf(UploadCancelledError);
  expect(create).not.toHaveBeenCalled();
  expect($tip).not.toHaveBeenCalled();
});
