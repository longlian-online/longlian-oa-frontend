import { beforeEach, expect, test } from "vite-plus/test";

import type { DownloadDirectoryHandle } from "./downloadDirectory";
import {
  beginDownload,
  finishDownload,
  getDownloadSession,
  noteDownloadProgress,
  rememberDownloads,
  resetDownloadSession,
} from "./downloadSession";
import type { DownloadRecord } from "./fileDownload";

const record: DownloadRecord = {
  taskInstanceId: "8",
  fieldKey: "script",
  fileId: "101",
  name: "成果.pdf",
};

beforeEach(() => {
  resetDownloadSession();
});

test("离开页面再回来时，进行中的下载进度还在", () => {
  beginDownload();
  noteDownloadProgress([record], 1, 3);
  rememberDownloads(null);
  rememberDownloads({
    handle: { name: "别的文件夹" } as DownloadDirectoryHandle,
    name: "别的文件夹",
    records: [],
    view: "planning",
  });

  expect(getDownloadSession()).toMatchObject({
    running: true,
    progress: { done: 1, total: 3 },
    records: [record],
    directoryName: null,
  });

  finishDownload();
  expect(getDownloadSession().running).toBe(false);
  expect(getDownloadSession().progress).toBeNull();
  expect(getDownloadSession().records).toEqual([record]);
});
