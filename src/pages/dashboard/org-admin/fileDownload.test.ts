import { expect, test } from "vite-plus/test";

import {
  archiveEntryPaths,
  downloadRelativePaths,
  downloadTarget,
  isDownloaded,
  parseManifest,
  resourceFileName,
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
  ).toEqual({ kind: "ITEM", itemId: "10" });
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

test("本地文件名使用资源 ID，只保留安全扩展名", () => {
  expect(resourceFileName("101", "企划/成果.pdf")).toBe("101.pdf");
  expect(resourceFileName("101", "..")).toBe("101");
  expect(resourceFileName("101", "CON.txt")).toBe("101.txt");
  expect(resourceFileName("202", "成果.PDF")).toBe("202.PDF");
  expect(resourceFileName("303", "归档.tar.gz")).toBe("303.gz");
});

test("压缩包目录跟着当前视图，同一层重名才加上资源 ID", () => {
  expect(
    archiveEntryPaths([
      { fileId: "101", name: "企划/成果.pdf" },
      { fileId: "202", name: "成果.PDF" },
      { fileId: "303", name: "CON.txt" },
      { fileId: "404", name: ".." },
    ]),
  ).toEqual(["成果.pdf", "成果_202.PDF", "CON_303.txt", "404"]);
  expect(
    archiveEntryPaths([
      { fileId: "101", name: "成果.pdf", directories: ["阿企划", "第一话"] },
      { fileId: "202", name: "成果.pdf", directories: ["阿企划", "第二话"] },
      { fileId: "303", name: "成果.pdf", directories: ["阿企划", "第一话"] },
    ]),
  ).toEqual(["阿企划/第一话/成果.pdf", "阿企划/第二话/成果.pdf", "阿企划/第一话/成果_303.pdf"]);
});

test("下载文件名在提交项后带上版本号，后缀仍在最后", () => {
  expect(
    downloadRelativePaths([
      {
        fileId: "101",
        name: "成果.pdf",
        projectTitle: "阿企划",
        itemTitle: "第一话",
        taskName: "翻译",
        fieldLabel: "译稿",
        versionNo: 2,
      },
      {
        fileId: "202",
        name: "对照.PDF",
        projectTitle: "阿企划",
        itemTitle: "第一话",
        taskName: "翻译",
        fieldLabel: "译稿",
        versionNo: 2,
      },
      {
        fileId: "303",
        name: "归档.tar.gz",
        projectTitle: "阿/企划",
        itemTitle: "",
        taskName: "CON",
      },
    ]),
  ).toEqual([
    "阿企划-第一话-翻译-译稿-2.pdf",
    "阿企划-第一话-翻译-译稿-2_202.PDF",
    "阿企划-未命名-CON_-未命名.gz",
  ]);
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
