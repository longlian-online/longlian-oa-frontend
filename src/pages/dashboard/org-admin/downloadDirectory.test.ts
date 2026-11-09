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
    saveDownloadedFiles(
      disk.directory,
      [],
      [file("202", "甲.pdf")],

      sign,
      () => undefined,
    ),
    saveDownloadedFiles(
      disk.directory,
      [],
      [file("303", "乙.pdf")],

      sign,
      () => undefined,
    ),
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

test("下载文件直接写在所选文件夹里，并记下文件名", async (): Promise<void> => {
  installLocks();
  const disk = memoryDirectory([]);
  vi.stubGlobal("fetch", async () => new Response(Uint8Array.from([1])));
  await saveDownloadedFiles(
    disk.directory,
    [],
    [
      {
        taskInstanceId: "8",
        fieldKey: "script",
        fileId: "101",
        fileName: "成果.pdf",
        projectTitle: "阿企划",
        itemTitle: "第一话",
        typeName: "漫画",
        taskName: "翻译",
        fieldLabel: "译稿",
      },
    ],
    async () => "https://example.test/file",
    () => undefined,
  );
  expect(disk.records().map((record) => record.path)).toEqual(["阿企划-第一话-翻译-译稿.pdf"]);
  expect(disk.hasPath("阿企划-第一话-翻译-译稿.pdf")).toBe(true);
  await removeDownloadedFiles(disk.directory, [
    { taskInstanceId: "8", fieldKey: "script", fileId: "101" },
  ]);
  expect(disk.records()).toEqual([]);
  expect(disk.hasPath("阿企划-第一话-翻译-译稿.pdf")).toBe(false);
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
  hasPath: (path: string) => boolean;
} {
  let manifest = serializeManifest(initial);
  let writes = 0;
  const fail = new Set(files?.fail ?? []);
  const root: MemDir = { files: new Set(files?.present ?? []), dirs: new Map() };

  function handleFor(dir: MemDir, name: string, isRoot: boolean): DownloadDirectoryHandle {
    return {
      name,
      async getDirectoryHandle(child: string, options?: { create?: boolean }) {
        let next = dir.dirs.get(child);
        if (!next) {
          if (!options?.create) throw new DOMException("missing", "NotFoundError");
          next = { files: new Set(), dirs: new Map() };
          dir.dirs.set(child, next);
        }
        return handleFor(next, child, false);
      },
      async getFileHandle(fileName: string, options?: { create?: boolean }) {
        if (isRoot && fileName === ".downloads.json") {
          if (!options?.create && manifest === "")
            throw new DOMException("missing", "NotFoundError");
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
        }
        if (!options?.create && !dir.files.has(fileName)) {
          throw new DOMException("missing", "NotFoundError");
        }
        dir.files.add(fileName);
        return {
          async getFile() {
            throw new Error("不读文件正文");
          },
          async createWritable() {
            return new WritableStream<Uint8Array>();
          },
        };
      },
      async removeEntry(entry: string) {
        if (isRoot && fail.has(entry)) throw new Error("磁盘忙");
        if (dir.files.has(entry)) {
          dir.files.delete(entry);
          return;
        }
        if (dir.dirs.has(entry)) {
          dir.dirs.delete(entry);
          return;
        }
        throw new DOMException("missing", "NotFoundError");
      },
      async queryPermission() {
        return "granted" as PermissionState;
      },
    } as unknown as DownloadDirectoryHandle;
  }

  return {
    directory: handleFor(root, "下载", true),
    records: () => parseManifest(manifest),
    writes: () => writes,
    has: (name: string) => root.files.has(name),
    hasPath: (path: string) => {
      const parts = path.split("/");
      const fileName = parts.pop() ?? "";
      let dir = root;
      for (const part of parts) {
        const next = dir.dirs.get(part);
        if (!next) return false;
        dir = next;
      }
      return dir.files.has(fileName);
    },
  };
}

interface MemDir {
  files: Set<string>;
  dirs: Map<string, MemDir>;
}
