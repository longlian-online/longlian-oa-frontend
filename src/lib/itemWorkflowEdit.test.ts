import { expect, test } from "vite-plus/test";

import {
  buildItemEditorNodes,
  toItemWorkflowUpdate,
  validateItemEditorNodes,
} from "@/lib/itemWorkflowEdit";
import type { ItemTaskNodeVO } from "@/types/workflowInstance";
import type { BaseTaskVO } from "@/types/workflowTemplate";

const original: ItemTaskNodeVO[] = [
  {
    id: "11",
    baseTaskId: "1",
    name: "翻译",
    submitFields: [],
    sort: 1,
    parallelSort: 1,
    revision: "3",
    removable: false,
    taskStatus: "CLAIMED",
  },
  {
    id: "12",
    baseTaskId: "2",
    name: "校对",
    submitFields: [],
    sort: 2,
    parallelSort: 1,
    revision: "0",
    removable: true,
    taskStatus: "PENDING",
  },
];

test("keeps claimed nodes locked and sends their revision when removed nodes are included", (): void => {
  const editorNodes = buildItemEditorNodes(original);
  expect(editorNodes.find((node) => node.nodeId === "11")?.locked).toBe(true);
  expect(editorNodes.find((node) => node.nodeId === "12")?.locked).toBe(false);

  const payload = toItemWorkflowUpdate(
    original,
    editorNodes.filter((node) => node.nodeId !== "12"),
  );
  expect(payload.nodes).toEqual([
    {
      id: "11",
      revision: "3",
      baseTaskId: "1",
      sort: 1,
      parallelSort: 1,
      name: "翻译",
    },
  ]);
  expect(payload.removed).toEqual([{ id: "12", revision: "0" }]);
});

test("only new nodes need an enabled base task", (): void => {
  const [kept] = buildItemEditorNodes(original);
  const baseTasks: BaseTaskVO[] = [
    {
      id: "9",
      name: "嵌字",
      icon: "Type",
      status: "ENABLED",
      refCount: 0,
      submitFields: [],
      createdAt: "2026-10-29 00:00:00",
    },
  ];
  const added = {
    localId: "new",
    baseTaskId: "9",
    customName: "",
    sort: 2,
    parallelSort: 1,
  };
  expect(validateItemEditorNodes([kept, added], baseTasks).valid).toBe(true);
  expect(validateItemEditorNodes([kept, { ...added, baseTaskId: "404" }], baseTasks).valid).toBe(
    false,
  );
});
