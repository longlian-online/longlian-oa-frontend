import { afterEach, expect, test, vi } from "vite-plus/test";

import { saveDownloadedFiles, type DownloadDirectoryHandle } from "./downloadDirectory";
import { parseManifest, serializeManifest, type DownloadRecord } from "./fileDownload";

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

function memoryDirectory(initial: DownloadRecord[]): {
  directory: DownloadDirectoryHandle;
  records: () => DownloadRecord[];
  writes: () => number;
} {
  let manifest = serializeManifest(initial);
  let writes = 0;
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
    async queryPermission() {
      return "granted" as PermissionState;
    },
  };
  return {
    directory: directory as unknown as DownloadDirectoryHandle,
    records: () => parseManifest(manifest),
    writes: () => writes,
  };
}
