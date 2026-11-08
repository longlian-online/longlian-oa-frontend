import { expect, test } from "vite-plus/test";

import {
  assignFlatNames,
  downloadTarget,
  isDownloaded,
  parseManifest,
  sanitizeFileName,
  serializeManifest,
  type DownloadRecord,
} from "./fileDownload";

const downloaded: DownloadRecord = {
  taskInstanceId: "8",
  fieldKey: "script",
  fileId: "101",
  name: "成果.pdf",
};

test("同一份文件换视图仍然算已下载，换文件则不算", () => {
  const records = [downloaded];
  expect(
    isDownloaded(records, {
      kind: "FILE",
      taskInstanceId: "8",
      fieldKey: "script",
      fileId: "101",
    }),
  ).toBe(true);
  expect(
    isDownloaded(records, {
      kind: "FILE",
      taskInstanceId: "8",
      fieldKey: "script",
      fileId: "202",
    }),
  ).toBe(false);
  expect(isDownloaded(records, { kind: "FOLDER" })).toBe(false);
});

test("文件夹按当前分层展开，文件只认可用的提交", () => {
  expect(downloadTarget({ id: "2", kind: "FOLDER" }, { tree: "planning" })).toEqual({
    kind: "PROJECT",
    projectId: "2",
  });
  expect(
    downloadTarget({ id: "10", kind: "FOLDER" }, { tree: "planning", projectId: "2" }),
  ).toEqual({
    kind: "ITEM",
    itemId: "10",
  });
  expect(downloadTarget({ id: "3", kind: "FOLDER" }, { tree: "type" })).toEqual({
    kind: "TYPE",
    typeId: "3",
  });
  expect(downloadTarget({ id: "10", kind: "FOLDER" }, { tree: "item" })).toEqual({
    kind: "ITEM",
    itemId: "10",
  });
  expect(
    downloadTarget(
      {
        id: "8:script",
        kind: "FILE",
        taskInstanceId: "8",
        fieldKey: "script",
        fileId: "101",
        availability: "available",
      },
      { tree: "type", typeId: "3" },
    ),
  ).toEqual({ kind: "FILE", taskInstanceId: "8", fieldKey: "script", fileId: "101" });
  expect(
    downloadTarget(
      {
        id: "8:script",
        kind: "FILE",
        taskInstanceId: "8",
        fieldKey: "script",
        fileId: "101",
        availability: "unavailable",
      },
      { tree: "item", itemId: "10" },
    ),
  ).toBeNull();
});

test("平铺文件名避开路径、设备名和同名冲突，已下载的沿用原名", () => {
  expect(sanitizeFileName("企划/成果.pdf", "101")).toBe("成果.pdf");
  expect(sanitizeFileName("..", "101")).toBe("file_101");
  expect(sanitizeFileName("CON.txt", "101")).toBe("CON_101.txt");

  const named = assignFlatNames(
    [downloaded],
    [
      { taskInstanceId: "8", fieldKey: "script", fileId: "101", fileName: "别的.pdf" },
      { taskInstanceId: "9", fieldKey: "script", fileId: "202", fileName: "成果.pdf" },
      { taskInstanceId: "10", fieldKey: "script", fileId: "303", fileName: "成果.PDF" },
    ],
  );
  expect(named.map((file) => file.localName)).toEqual(["成果.pdf", "成果_202.pdf", "成果_303.PDF"]);
});

test("下载记录只接受当前版本里完整的文件", () => {
  const text = serializeManifest([downloaded, { ...downloaded, fileId: "202", name: "对照.pdf" }]);
  expect(parseManifest(text)).toEqual([
    downloaded,
    { taskInstanceId: "8", fieldKey: "script", fileId: "202", name: "对照.pdf" },
  ]);
  expect(parseManifest('{"version":2,"files":[]}')).toEqual([]);
  expect(parseManifest("not-json")).toEqual([]);
  expect(parseManifest('{"version":1,"files":[{"taskInstanceId":"8"}]}')).toEqual([]);
});
