import { expect, test } from "vite-plus/test";

import {
  buildCreateItemNodes,
  createItemDraftSignature,
  toCreateItemNodes,
  validateCreateItemNodes,
} from "@/lib/createItemWorkflow";
import type { BaseTaskVO } from "@/types/workflowTemplate";

const tasks: BaseTaskVO[] = [
  {
    id: "1",
    name: "翻译",
    submitFields: [],
    refCount: 0,
    status: "ENABLED",
    createdAt: "",
  },
  {
    id: "2",
    name: "校对",
    submitFields: [],
    refCount: 0,
    status: "DISABLED",
    createdAt: "",
  },
];

test("template nodes keep a disabled task and new disabled tasks fail validation", () => {
  const nodes = buildCreateItemNodes(
    [
      {
        baseTaskId: "2",
        baseTaskName: "校对",
        baseTaskStatus: "DISABLED",
        sort: 2,
        parallelSort: 1,
      },
      {
        baseTaskId: "1",
        baseTaskName: "翻译",
        baseTaskStatus: "ENABLED",
        sort: 1,
        parallelSort: 1,
      },
    ],
    tasks,
  );
  expect(nodes.map((node) => node.customName)).toEqual(["翻译", "校对"]);
  expect(nodes[1]?.allowDisabled).toBe(true);
  expect(validateCreateItemNodes(nodes, tasks).valid).toBe(true);
  expect(
    validateCreateItemNodes(
      [...nodes, { localId: "new", baseTaskId: "2", customName: "再校", sort: 3, parallelSort: 1 }],
      tasks,
    ).errors,
  ).toContain("基础任务「校对」已停用");
});

test("payload keeps renamed nodes and only assigned members", () => {
  const nodes = buildCreateItemNodes([{ baseTaskId: "1", sort: 1, parallelSort: 1 }], tasks);
  const first = nodes[0];
  if (!first) throw new Error("缺少节点");
  first.customName = "  翻译甲  ";
  expect(toCreateItemNodes(nodes, { [first.localId]: "8" })).toEqual([
    {
      baseTaskId: "1",
      sort: 1,
      parallelSort: 1,
      name: "翻译甲",
      assigneeId: "8",
    },
  ]);
  expect(createItemDraftSignature(nodes, {})).not.toBe(
    createItemDraftSignature(nodes, { [first.localId]: "8" }),
  );
});
