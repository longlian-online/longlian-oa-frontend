import { afterEach, expect, test, vi } from "vite-plus/test";

import type { OrgFileBatchFileVO } from "@/types/organizationAdmin";
import { saveDownloadedFiles, type DownloadDirectoryHandle } from "./downloadDirectory";

const FILE: OrgFileBatchFileVO = {
  taskInstanceId: "8",
  fieldKey: "script",
  fileId: "101",
  fileName: "成果.pdf",
  fileSize: 3,
  typeName: "小说",
  projectTitle: "阿企划",
  itemTitle: "第一章",
  taskName: "翻译",
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test("根目录下载小说到时间目录，两种视图保留网页层级和原名", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 14, 12, 34, 56, 789));
  const disk = memoryDirectory();
  vi.stubGlobal("fetch", async () => new Response(Uint8Array.from([1, 2, 3])));
  const progress = vi.fn();
  const sign = async (): Promise<string> => "https://example.test/file";
  await saveDownloadedFiles(disk.directory, [FILE], { view: "item" }, "item", sign, progress);
  await saveDownloadedFiles(disk.directory, [FILE], { view: "item" }, "task", sign, progress);
  expect([...disk.files.entries()]).toEqual([
    ["2026-11-14_12-34-56-789/小说/阿企划/第一章/成果.pdf", [1, 2, 3]],
    ["2026-11-14_12-34-56-789_2/小说/阿企划/翻译/成果.pdf", [1, 2, 3]],
  ]);
  expect(progress.mock.calls).toEqual([
    [0, 1],
    [1, 1],
    [0, 1],
    [1, 1],
  ]);
});

test("同时开始的批次不混写，不读写清单或更改原文件", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 14, 12, 34, 56, 789));
  vi.stubGlobal("navigator", {});
  const disk = memoryDirectory();
  disk.files.set(".downloads.json", [9]);
  disk.files.set("用户文件.txt", [8]);
  vi.stubGlobal("fetch", async () => new Response(Uint8Array.from([1])));
  await Promise.all(
    ["甲.pdf", "乙.pdf"].map((fileName) =>
      saveDownloadedFiles(
        disk.directory,
        [{ ...FILE, fileName }],
        { view: "item", typeId: "4", projectId: "2", itemId: "10" },
        "item",
        async () => "https://example.test/file",
        () => undefined,
      ),
    ),
  );
  expect([...disk.files.entries()]).toEqual([
    [".downloads.json", [9]],
    ["用户文件.txt", [8]],
    ["2026-11-14_12-34-56-789/甲.pdf", [1]],
    ["2026-11-14_12-34-56-789_2/乙.pdf", [1]],
  ]);
});

test("签发和写入失败只跳过该文件，进度仍覆盖整个批次", async () => {
  const disk = memoryDirectory("坏.pdf");
  const files = [
    FILE,
    { ...FILE, fileId: "202", fileName: "签发失败.pdf" },
    { ...FILE, fileId: "303", fileName: "坏.pdf" },
  ];
  const sign = vi.fn(async (file: OrgFileBatchFileVO): Promise<string> => {
    if (file.fileId === "202") throw new Error("签发失败");
    return "https://example.test/file";
  });
  vi.stubGlobal("fetch", async () => new Response(Uint8Array.from([1, 2, 3])));
  const progress = vi.fn();
  const failed = await saveDownloadedFiles(
    disk.directory,
    files,
    { view: "item" },
    "item",
    sign,
    progress,
  );
  expect(failed).toBe(2);
  expect([...disk.files.values()]).toEqual([[1, 2, 3]]);
  expect(progress.mock.calls.map(([done]) => done)).toEqual([0, 1, 2, 3]);
  expect(sign.mock.calls.filter(([file]) => file.fileId === "202")).toHaveLength(2);
});

test("空批次不创建时间目录", async () => {
  const disk = memoryDirectory();
  const failed = await saveDownloadedFiles(
    disk.directory,
    [],
    { view: "item" },
    "item",
    async () => "",
    () => undefined,
  );
  expect(failed).toBe(0);
  expect([...disk.directories]).toEqual([]);
});

function memoryDirectory(failingName?: string): {
  directory: DownloadDirectoryHandle;
  files: Map<string, number[]>;
  directories: Set<string>;
} {
  const files = new Map<string, number[]>();
  const directories = new Set<string>();
  function handle(path: string, name: string): DownloadDirectoryHandle {
    return {
      name,
      async getDirectoryHandle(child, options) {
        const next = path ? `${path}/${child}` : child;
        if (files.has(next)) throw new DOMException("file", "TypeMismatchError");
        if (!directories.has(next)) {
          if (!options?.create) throw new DOMException("missing", "NotFoundError");
          directories.add(next);
        }
        return handle(next, child);
      },
      async getFileHandle(child, options) {
        if (!options?.create) throw new Error("不应读取本地下载记录");
        const next = path ? `${path}/${child}` : child;
        return {
          async createWritable() {
            const chunks: number[] = [];
            return new WritableStream<Uint8Array>({
              write(chunk) {
                if (child === failingName) throw new Error("磁盘忙");
                chunks.push(...chunk);
              },
              close() {
                files.set(next, chunks);
              },
            });
          },
        };
      },
    };
  }
  return { directory: handle("", "下载"), files, directories };
}
