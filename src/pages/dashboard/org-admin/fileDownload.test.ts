import { expect, test } from "vite-plus/test";

import type { OrgFileBatchFileVO } from "@/types/organizationAdmin";
import type { OrgFileLocation } from "./fileLocation";
import { downloadRelativePaths, downloadTarget } from "./fileDownload";

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
  versionNo: 2,
};

test("文件夹按当前分层展开，文件只认可用的提交", () => {
  expect(downloadTarget({ id: "3", kind: "FOLDER" }, { view: "item" })).toEqual({
    kind: "TYPE",
    typeId: "3",
  });
  expect(downloadTarget({ id: "2", kind: "FOLDER" }, { view: "item", typeId: "4" })).toEqual({
    kind: "PROJECT",
    projectId: "2",
  });
  expect(
    downloadTarget({ id: "10", kind: "FOLDER" }, { view: "item", typeId: "4", projectId: "2" }),
  ).toEqual({ kind: "ITEM", itemId: "10" });
  expect(
    downloadTarget({ id: "5", kind: "FOLDER" }, { view: "task", typeId: "4", projectId: "2" }),
  ).toEqual({ kind: "TASK", projectId: "2", taskId: "5" });
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
      { view: "task", typeId: "4", projectId: "2", taskId: "5" },
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
      { view: "item", typeId: "4", projectId: "2", itemId: "10" },
    ),
  ).toBeNull();
  expect(
    downloadTarget(
      { id: "10", kind: "FOLDER" },
      { view: "item", typeId: "4", projectId: "2", itemId: "10" },
    ),
  ).toBeNull();
});

test.each([
  [{ view: "item" }, "小说/阿企划/第一章/成果.pdf", "小说/阿企划/翻译/成果.pdf"],
  [{ view: "item", typeId: "4" }, "阿企划/第一章/成果.pdf", "阿企划/翻译/成果.pdf"],
  [{ view: "item", typeId: "4", projectId: "2" }, "第一章/成果.pdf", "翻译/成果.pdf"],
  [{ view: "item", typeId: "4", projectId: "2", itemId: "10" }, "成果.pdf", "成果.pdf"],
  [{ view: "task", typeId: "4", projectId: "2", taskId: "5" }, "成果.pdf", "成果.pdf"],
] satisfies [OrgFileLocation, string, string][])(
  "下载目录相对当前浏览位置展开：%j",
  (location, itemPath, taskPath) => {
    expect(downloadRelativePaths([FILE], location, "item")).toEqual([itemPath]);
    expect(downloadRelativePaths([FILE], location, "task")).toEqual([taskPath]);
  },
);

test("同层重名才消歧，保留原名且路径不能越出批次目录", () => {
  const files = [
    FILE,
    { ...FILE, fileId: "202", fileName: "成果.PDF" },
    { ...FILE, fileId: "303", fileName: "CON.txt" },
    { ...FILE, fileId: "404", fileName: "../../" },
    { ...FILE, fileId: "505", itemTitle: "第二章" },
    {
      ...FILE,
      fileId: "606",
      typeName: "..",
      projectTitle: "a/b",
      itemTitle: "CON",
      fileName: "归档.tar.gz",
    },
  ];
  expect(downloadRelativePaths(files, { view: "item" }, "item")).toEqual([
    "小说/阿企划/第一章/成果.pdf",
    "小说/阿企划/第一章/成果_202.PDF",
    "小说/阿企划/第一章/CON_303.txt",
    "小说/阿企划/第一章/404",
    "小说/阿企划/第二章/成果.pdf",
    "未命名/ab/CON_/归档.tar.gz",
  ]);
});
