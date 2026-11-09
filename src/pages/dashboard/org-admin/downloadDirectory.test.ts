import { afterEach, expect, test, vi } from "vite-plus/test";

import {
  removeDownloadedFiles,
  saveDownloadedFiles,
  type DownloadDirectoryHandle,
} from "./downloadDirectory";
import {
  parseManifest,
  resourceFileName,
  serializeManifest,
  type DownloadRecord,
} from "./fileDownload";

const KEPT: DownloadRecord = {
  taskInstanceId: "1",
  fieldKey: "script",
  fileId: "101",
  name: "已有.pdf",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

test("并行下载重读清单，不覆盖别人刚记下的记录", async () => {
  installLocks();
  const disk = memoryDirectory([KEPT]);
  vi.stubGlobal("fetch", async () => new Response(Uint8Array.from([1, 2, 3])));
  const onUpdate = vi.fn();
  const sign = async () => "https://example.test/file";

  await Promise.all([
    saveDownloadedFiles(disk.directory, [], [file("202", "甲.pdf")], sign, onUpdate),
    saveDownloadedFiles(disk.directory, [], [file("303", "乙.pdf")], sign, onUpdate),
  ]);

  expect(
    disk
      .records()
      .map((record) => record.fileId)
      .sort(),
  ).toEqual(["101", "202", "303"]);
});

test("没有 Web Locks 时同页写入仍然合并", async () => {
  vi.stubGlobal("navigator", {});
  const disk = memoryDirectory([KEPT]);
  vi.stubGlobal("fetch", async () => new Response(Uint8Array.from([1])));
  const sign = async () => "https://example.test/file";

  await Promise.all([
    saveDownloadedFiles(disk.directory, [], [file("202", "甲.pdf")], sign, () => undefined),
    saveDownloadedFiles(disk.directory, [], [file("303", "乙.pdf")], sign, () => undefined),
  ]);

  expect(
    disk
      .records()
      .map((record) => record.fileId)
      .sort(),
  ).toEqual(["101", "202", "303"]);
});

test("签发失败不改已有下载记录", async () => {
  installLocks();
  const disk = memoryDirectory([KEPT]);
  const failed = await saveDownloadedFiles(
    disk.directory,
    [KEPT],
    [file("202", "甲.pdf")],
    async () => {
      throw new Error("签不了");
    },
    () => undefined,
  );

  expect(failed).toBe(1);
  expect(disk.writes()).toBe(0);
  expect(disk.records()).toEqual([KEPT]);
});

test("删除已下载文件时更新清单，缺失文件也去掉记录", async () => {
  installLocks();
  const other: DownloadRecord = {
    taskInstanceId: "8",
    fieldKey: "script",
    fileId: "202",
    name: "另一.pdf",
  };
  const kept: DownloadRecord = {
    taskInstanceId: "3",
    fieldKey: "extra",
    fileId: "303",
    name: "留着.txt",
  };
  const disk = memoryDirectory([KEPT, other, kept], {
    present: [resourceFileName(KEPT.fileId, KEPT.name)],
  });

  const next = await removeDownloadedFiles(disk.directory, [KEPT, other]);

  expect(next.map((record) => record.fileId)).toEqual(["303"]);
  expect(disk.records().map((record) => record.fileId)).toEqual(["303"]);
  expect(disk.has(resourceFileName(KEPT.fileId, KEPT.name))).toBe(false);
});

test("删除中途失败时保留尚未删除的记录", async () => {
  installLocks();
  const other: DownloadRecord = {
    taskInstanceId: "8",
    fieldKey: "script",
    fileId: "202",
    name: "另一.pdf",
  };
  const disk = memoryDirectory([KEPT, other], {
    present: [resourceFileName(KEPT.fileId, KEPT.name), resourceFileName(other.fileId, other.name)],
    fail: [resourceFileName(other.fileId, other.name)],
  });

  await expect(removeDownloadedFiles(disk.directory, [KEPT, other])).rejects.toThrow("磁盘忙");
  expect(disk.records().map((record) => record.fileId)).toEqual(["202"]);
  expect(disk.has(resourceFileName(KEPT.fileId, KEPT.name))).toBe(false);
});

function file(fileId: string, fileName: string) {
  return { taskInstanceId: "8", fieldKey: "script", fileId, fileName };
}

function installLocks(): void {
  let chain = Promise.resolve();
  vi.stubGlobal("navigator", {
    locks: {
      request: (_name: string, callback: () => Promise<unknown>) => {
        const run = chain.then(callback, callback);
        chain = run.then(
          () => undefined,
          () => undefined,
        );
        return run;
      },
    },
  });
}

function memoryDirectory(
  initial: DownloadRecord[],
  files?: { present?: string[]; fail?: string[] },
): {
  directory: DownloadDirectoryHandle;
  records: () => DownloadRecord[];
  writes: () => number;
  has: (name: string) => boolean;
} {
  let manifest = serializeManifest(initial);
  let writes = 0;
  const present = new Set(files?.present ?? []);
  const fail = new Set(files?.fail ?? []);
  const directory = {
    name: "下载",
    async getFileHandle(name: string, options?: { create?: boolean }) {
      if (name !== ".downloads.json") {
        return {
          async getFile() {
            throw new Error("不读文件正文");
          },
          async createWritable() {
            return new WritableStream<Uint8Array>();
          },
        };
      }
      if (!options?.create && manifest === "") {
        throw new DOMException("missing", "NotFoundError");
      }
      return {
        async getFile() {
          return {
            async text() {
              return manifest;
            },
          };
        },
        async createWritable() {
          let next = "";
          return {
            async write(data: string) {
              next = data;
            },
            async close() {
              manifest = next;
              writes += 1;
            },
            async abort() {},
          };
        },
      };
    },
    async removeEntry(name: string) {
      if (fail.has(name)) throw new Error("磁盘忙");
      if (!present.has(name)) throw new DOMException("missing", "NotFoundError");
      present.delete(name);
    },
    async queryPermission() {
      return "granted" as PermissionState;
    },
  };
  return {
    directory: directory as unknown as DownloadDirectoryHandle,
    records: () => parseManifest(manifest),
    writes: () => writes,
    has: (name: string) => present.has(name),
  };
}
