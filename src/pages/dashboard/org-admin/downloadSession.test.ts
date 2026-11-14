import { beforeEach, expect, test } from "vite-plus/test";

import type { DownloadDirectoryHandle } from "./downloadDirectory";
import {
  beginDownload,
  finishDownload,
  getDownloadSession,
  noteDownloadProgress,
  rememberDownloadDirectory,
  resetDownloadSession,
} from "./downloadSession";

beforeEach(() => {
  resetDownloadSession();
});

test("离页保留进度，下载中不替换目录，完成后可更换", () => {
  const directory: DownloadDirectoryHandle = {
    name: "原目录",
    getFileHandle: async () => ({ createWritable: async () => new WritableStream<Uint8Array>() }),
    getDirectoryHandle: async () => directory,
  };
  const next = { ...directory, name: "新目录" };
  rememberDownloadDirectory({ handle: directory, name: directory.name });
  beginDownload();
  noteDownloadProgress(1, 3);
  rememberDownloadDirectory(null);
  rememberDownloadDirectory({ handle: next, name: next.name });
  expect(getDownloadSession()).toEqual({
    running: true,
    progress: { done: 1, total: 3 },
    directory,
  });
  finishDownload();
  expect(getDownloadSession()).toEqual({ running: false, progress: null, directory });
  rememberDownloadDirectory({ handle: next, name: next.name });
  expect(getDownloadSession().directory).toBe(next);
});
