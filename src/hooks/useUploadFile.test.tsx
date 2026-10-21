import { QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { beforeEach, expect, test, vi } from "vite-plus/test";

import { createQueryClient } from "@/lib/queryClient";
import { saveSession } from "@/lib/session";
import { $tip } from "@/components/tip";
import { UploadCancelledError } from "@/lib/imageCropRequest";
import { useUploadFile } from "@/hooks/useUploadFile";
import type { UseUploadFileResult } from "@/hooks/useUploadFile";
import * as imageCrop from "@/lib/imageCrop";

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
vi.mock("@/lib/imageCrop", async (importOriginal) => {
  const original = await importOriginal<typeof imageCrop>();
  return { ...original, convertImageToWebp: vi.fn(original.convertImageToWebp) };
});

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

test("缩略图裁剪为方形且不提供上传原图，已裁好的文件不再打开裁剪窗", async () => {
  const cropped = new File(["square"], "thumb.png", { type: "image/png" });
  crop.mockResolvedValue(cropped);
  create.mockResolvedValue({ fileId: "thumb-id", uploadUrl: "" });
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
  await upload!(new File(["source"], "thumb.png", { type: "image/png" }), {
    bizType: "thumbnail",
    bizId: "project",
    accept: ["png"],
    maxSize: 10 * 1024 * 1024,
  });
  expect(crop).toHaveBeenCalledWith(expect.any(File), 1, { shape: "rect", allowOriginal: false });

  crop.mockClear();
  await upload!(cropped, {
    bizType: "thumbnail",
    bizId: "project",
    accept: ["png"],
    maxSize: 10 * 1024 * 1024,
    skipCrop: true,
  });
  expect(crop).not.toHaveBeenCalled();
});

test.each(["cover", "thumbnail"] as const)(
  "%s 原图超过 10MB 时裁剪前拒绝，不能通过裁剪绕过限制",
  async (bizType) => {
    create.mockClear();
    crop.mockClear();
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
    const oversized = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "large.png", {
      type: "image/png",
    });
    await expect(upload!(oversized, { bizType, bizId: "project" })).rejects.toThrow(
      "文件大小不能超过 10.0MB",
    );
    expect(crop).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  },
);

test.each(["cover", "thumbnail"] as const)(
  "%s 接受恰好 10MB 的 WebP 文件，不再限制缩略图为 1MB",
  async (bizType) => {
    create.mockResolvedValue({ fileId: "image-id", uploadUrl: "" });
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
    const image = new File([new Uint8Array(10 * 1024 * 1024)], "large.webp", {
      type: "image/webp",
    });
    const result = await upload!(image, { bizType, bizId: "project", skipCrop: true });
    expect(result.fileSize).toBe(10 * 1024 * 1024);
    expect(result.fileMime).toBe("image/webp");
    if (result.previewUrl) URL.revokeObjectURL(result.previewUrl);
  },
);

test.each(["cover", "thumbnail"] as const)(
  "%s 按转换前后大小选择上传文件，保留对应名称、类型和正文",
  async (bizType) => {
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
    const source = new File([new Uint8Array(1024 * 1024 + 1)], "cover.avif", {
      type: "image/avif",
    });
    const transfer = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", transfer);
    create.mockResolvedValue({ fileId: "image-id", uploadUrl: "https://storage.example/upload" });
    for (const size of [source.size + 1, source.size - 1, source.size]) {
      const converted = new File([new Uint8Array(size)], "cover.webp", { type: "image/webp" });
      vi.mocked(imageCrop.convertImageToWebp).mockResolvedValueOnce(converted);
      const expected = size > source.size ? source : converted;
      const result = await upload!(source, { bizType, bizId: "project", skipCrop: true });
      expect(create).toHaveBeenLastCalledWith(
        expect.objectContaining({
          fileName: expected.name,
          fileExt: expected === source ? "avif" : "webp",
          fileSize: expected.size,
          fileMime: expected.type,
        }),
      );
      expect(transfer).toHaveBeenLastCalledWith("https://storage.example/upload", {
        method: "PUT",
        headers: { "Content-Type": expected.type },
        body: expected,
      });
      expect(result.fileMime).toBe(expected.type);
      if (result.previewUrl) URL.revokeObjectURL(result.previewUrl);
    }
  },
);

function fileWithSize(name: string, type: string, size: number): File {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

function mountUpload(): UseUploadFileResult["uploadFile"] {
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
  if (!upload) throw new Error("upload hook did not mount");
  return upload;
}

const ORDINARY_LIMIT = 50 * 1024 * 1024;
const ARCHIVE_LIMIT = 500 * 1024 * 1024;

test.each(["pack.zip", "backup.rar", "archive.7z", "PACK.ZIP"])(
  "%s 在 50MB 以上、500MB 以内可以上传",
  async (name) => {
    create.mockClear();
    create.mockResolvedValue({ fileId: "archive-id", uploadUrl: "" });
    const upload = mountUpload();
    const file = fileWithSize(
      name,
      name.toLowerCase().endsWith(".rar")
        ? "application/vnd.rar"
        : name.toLowerCase().endsWith(".7z")
          ? "application/x-7z-compressed"
          : "application/zip",
      ORDINARY_LIMIT + 1,
    );
    const result = await upload(file, { bizType: "task_submit", bizId: "task" });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ fileSize: ORDINARY_LIMIT + 1 }));
    expect(result.fileSize).toBe(ORDINARY_LIMIT + 1);
  },
);

test("压缩包恰好 500MB 可以上传，超过 1 字节被拒绝", async () => {
  create.mockClear();
  create.mockResolvedValue({ fileId: "archive-id", uploadUrl: "" });
  const upload = mountUpload();
  await upload(fileWithSize("pack.zip", "application/zip", ARCHIVE_LIMIT), {
    bizType: "task_submit",
    bizId: "task",
  });
  expect(create).toHaveBeenCalledWith(expect.objectContaining({ fileSize: ARCHIVE_LIMIT }));

  create.mockClear();
  await expect(
    upload(fileWithSize("pack.zip", "application/zip", ARCHIVE_LIMIT + 1), {
      bizType: "task_submit",
      bizId: "task",
    }),
  ).rejects.toThrow("文件大小不能超过 500.0MB");
  expect(create).not.toHaveBeenCalled();
});

test("非压缩包超过 50MB 被拒绝，恰好 50MB 可以上传", async () => {
  create.mockClear();
  create.mockResolvedValue({ fileId: "pdf-id", uploadUrl: "" });
  const upload = mountUpload();
  await expect(
    upload(fileWithSize("notes.pdf", "application/pdf", ORDINARY_LIMIT + 1), {
      bizType: "task_submit",
      bizId: "task",
    }),
  ).rejects.toThrow("文件大小不能超过 50.0MB");
  expect(create).not.toHaveBeenCalled();

  await upload(fileWithSize("notes.pdf", "application/pdf", ORDINARY_LIMIT), {
    bizType: "task_submit",
    bizId: "task",
  });
  expect(create).toHaveBeenCalledWith(expect.objectContaining({ fileSize: ORDINARY_LIMIT }));
});

test("调用方传入的更小上限仍然限制压缩包", async () => {
  create.mockClear();
  const upload = mountUpload();
  await expect(
    upload(fileWithSize("pack.zip", "application/zip", 4), {
      bizType: "task_submit",
      bizId: "task",
      maxSize: 3,
    }),
  ).rejects.toThrow("文件大小不能超过");
  expect(create).not.toHaveBeenCalled();
});
