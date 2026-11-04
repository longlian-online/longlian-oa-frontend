import { describe, expect, test, vi } from "vite-plus/test";

import {
  ARCHIVE_PREVIEW_LIMIT,
  PreviewReadError,
  archiveBytesFromSizeText,
  previewRejectionMessage,
  readPreviewFile,
  rejectPreview,
} from "./previewable";

describe("attachment preview decisions", () => {
  test("accepts the existing upload types and rejects anything else", () => {
    expect(rejectPreview("设定集.PDF")).toBeNull();
    expect(rejectPreview("样片.mp4")).toBeNull();
    expect(rejectPreview("样片.webm")).toBeNull();
    expect(rejectPreview("术语表.xlsx")).toBeNull();
    expect(rejectPreview("原图包.7z", ARCHIVE_PREVIEW_LIMIT)).toBeNull();
    expect(rejectPreview("脚本.exe")).toBe("unsupported");
    expect(rejectPreview("样片.mov")).toBe("unsupported");
    expect(rejectPreview("没有扩展名")).toBe("unsupported");
    expect(previewRejectionMessage("unsupported")).toBe("这个类型不能在页面内预览，请下载后查看。");
  });

  test("refuses archives above 50MB before they are read", () => {
    expect(rejectPreview("成品包.zip", ARCHIVE_PREVIEW_LIMIT + 1)).toBe("archive-too-large");
    expect(archiveBytesFromSizeText("50.0 MB")).toBeUndefined();
    expect(archiveBytesFromSizeText("50.1 MB")).toBe(ARCHIVE_PREVIEW_LIMIT + 1);
    expect(archiveBytesFromSizeText("1.2 GB")).toBe(ARCHIVE_PREVIEW_LIMIT + 1);
    expect(archiveBytesFromSizeText("860 KB")).toBeUndefined();
  });

  test("stops reading an archive once the response declares it is over 50MB", async () => {
    const cancel = vi.fn(async () => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        headers: { get: () => String(ARCHIVE_PREVIEW_LIMIT + 1) },
        body: { cancel },
        blob: vi.fn(),
      })),
    );

    await expect(
      readPreviewFile("成品包.zip", "https://cdn.test/pack", new AbortController().signal),
    ).rejects.toThrow(previewRejectionMessage("archive-too-large"));
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  test("names a failed read without retrying it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );

    await expect(
      readPreviewFile("设定集.pdf", "https://cdn.test/file", new AbortController().signal),
    ).rejects.toBeInstanceOf(PreviewReadError);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
