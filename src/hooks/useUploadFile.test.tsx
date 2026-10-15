import { QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { beforeEach, expect, test, vi } from "vite-plus/test";

import { createQueryClient } from "@/lib/queryClient";
import { saveSession } from "@/lib/session";
import { $tip } from "@/components/tip";
import { UploadCancelledError } from "@/lib/imageCropRequest";
import { useUploadFile, type UseUploadFileResult } from "@/hooks/useUploadFile";

const { storageValues } = vi.hoisted(() => {
  const storageValues = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string): string | null => storageValues.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      storageValues.set(key, value);
    },
    removeItem: (key: string): void => {
      storageValues.delete(key);
    },
  });
  return { storageValues };
});
beforeEach(() => {
  storageValues.clear();
  saveSession({ token: "token", userId: "1", defaultOrgId: "1", role: "MEMBER" });
});

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
  renderToString(
    <QueryClientProvider client={createQueryClient()}>
      <Probe />
    </QueryClientProvider>,
  );
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
  renderToString(
    <QueryClientProvider client={createQueryClient()}>
      <Probe />
    </QueryClientProvider>,
  );
  await upload!(new File(["pdf"], "task.pdf", { type: "application/pdf" }), {
    bizType: "task_submit",
    bizId: "task",
  });
  expect(crop).not.toHaveBeenCalled();
  expect(create).toHaveBeenCalledTimes(1);
});

test("默认白名单接受 ppt/pptx/txt/csv/webp/rar/7z 等新增格式", async () => {
  create.mockClear();
  create.mockResolvedValue({ fileId: "id", uploadUrl: "" });
  let upload: UseUploadFileResult["uploadFile"] | undefined;
  function Probe(): null {
    upload = useUploadFile().uploadFile;
    return null;
  }
  renderToString(
    <QueryClientProvider client={createQueryClient()}>
      <Probe />
    </QueryClientProvider>,
  );
  const cases: Array<[string, string]> = [
    ["report.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"],
    ["deck.ppt", "application/vnd.ms-powerpoint"],
    ["notes.txt", "text/plain"],
    ["data.csv", "text/csv"],
    ["photo.webp", "image/webp"],
    ["scan.bmp", "image/bmp"],
    ["backup.rar", "application/vnd.rar"],
    ["archive.7z", "application/x-7z-compressed"],
  ];
  for (const [name, mime] of cases) {
    await upload!(new File(["x"], name, { type: mime }), {
      bizType: "task_submit",
      bizId: "task",
    });
  }
  expect(create).toHaveBeenCalledTimes(cases.length);
});

test("默认白名单拒绝未收录的扩展名", async () => {
  create.mockClear();
  vi.mocked($tip).mockClear();
  let upload: UseUploadFileResult["uploadFile"] | undefined;
  function Probe(): null {
    upload = useUploadFile().uploadFile;
    return null;
  }
  renderToString(
    <QueryClientProvider client={createQueryClient()}>
      <Probe />
    </QueryClientProvider>,
  );
  await expect(
    upload!(new File(["x"], "evil.exe", { type: "application/x-msdownload" }), {
      bizType: "task_submit",
      bizId: "task",
    }),
  ).rejects.toThrow("仅支持");
  expect(create).not.toHaveBeenCalled();
});

test("裁剪后文件超过大小限制时不创建上传资源", async () => {
  create.mockClear();
  crop.mockResolvedValue(new File(["too large"], "photo.png", { type: "image/png" }));
  let upload: ReturnType<typeof useUploadFile>["uploadFile"] | undefined;
  function Probe(): null {
    upload = useUploadFile().uploadFile;
    return null;
  }
  renderToString(
    <QueryClientProvider client={createQueryClient()}>
      <Probe />
    </QueryClientProvider>,
  );
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
  renderToString(
    <QueryClientProvider client={createQueryClient()}>
      <Probe />
    </QueryClientProvider>,
  );
  await expect(
    upload!(new File(["image"], "photo.png", { type: "image/png" }), {
      bizType: "avatar",
      bizId: "user",
    }),
  ).rejects.toBeInstanceOf(UploadCancelledError);
  expect(create).not.toHaveBeenCalled();
  expect($tip).not.toHaveBeenCalled();
});

test("存储直传失败时保留失败语义，不报告上传成功", async () => {
  vi.mocked($tip).mockClear();
  create.mockResolvedValue({ fileId: "id", uploadUrl: "https://storage.example/upload" });
  const transfer = vi.fn().mockResolvedValue({ ok: false, status: 503 });
  vi.stubGlobal("fetch", transfer);
  let upload: UseUploadFileResult["uploadFile"] | undefined;
  function Probe(): null {
    upload = useUploadFile().uploadFile;
    return null;
  }
  renderToString(
    <QueryClientProvider client={createQueryClient()}>
      <Probe />
    </QueryClientProvider>,
  );
  const file = new File(["pdf"], "task.pdf", { type: "application/pdf" });
  await expect(upload!(file, { bizType: "task_submit", bizId: "task" })).rejects.toThrow(
    "文件上传失败：503",
  );
  expect(transfer).toHaveBeenCalledWith(
    "https://storage.example/upload",
    expect.objectContaining({ method: "PUT", body: file }),
  );
  expect($tip).not.toHaveBeenCalledWith("文件上传成功", "success");
});

test("直传期间账号切换后不把旧文件回填到新会话", async () => {
  vi.mocked($tip).mockClear();
  create.mockResolvedValue({ fileId: "old-id", uploadUrl: "https://storage.example/upload" });
  let finish: ((result: { ok: boolean }) => void) | undefined;
  const transfer = vi.fn(
    () =>
      new Promise<{ ok: boolean }>((resolve) => {
        finish = resolve;
      }),
  );
  vi.stubGlobal("fetch", transfer);
  let upload: UseUploadFileResult["uploadFile"] | undefined;
  function Probe(): null {
    upload = useUploadFile().uploadFile;
    return null;
  }
  renderToString(
    <QueryClientProvider client={createQueryClient()}>
      <Probe />
    </QueryClientProvider>,
  );
  const pending = upload!(new File(["pdf"], "task.pdf", { type: "application/pdf" }), {
    bizType: "task_submit",
    bizId: "task",
  });
  const rejected = expect(pending).rejects.toMatchObject({ name: "AbortError" });
  await vi.waitFor(() => expect(transfer).toHaveBeenCalledTimes(1));
  saveSession({ token: "new-token", userId: "2", defaultOrgId: "1" });
  finish!({ ok: true });
  await rejected;
  expect($tip).not.toHaveBeenCalled();
});
