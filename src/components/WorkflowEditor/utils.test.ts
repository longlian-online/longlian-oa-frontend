import { describe, expect, test } from "vite-plus/test";

import type { BaseTaskVO } from "@/types/workflowTemplate";
import {
  moveNodeToParallelGroup,
  moveNodeToStage,
  normalizeNodes,
  toCreateNodes,
  validateEditorNodes,
  type WorkflowEditorNode,
} from "./utils";

const BASE_TASKS: BaseTaskVO[] = [
  {
    id: "translate",
    name: "翻译",
    refCount: 1,
    status: "ENABLED",
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "review",
    name: "审核",
    refCount: 1,
    status: "ENABLED",
    createdAt: "2026-01-01T00:00:00Z",
  },
];

const NODES: WorkflowEditorNode[] = [
  { localId: "translate", baseTaskId: "translate", customName: "翻译", sort: 3, parallelSort: 4 },
  { localId: "review", baseTaskId: "review", customName: "审核", sort: 8, parallelSort: 2 },
];

describe("workflow editor utils", () => {
  test("normalizes stage and parallel indexes", () => {
    expect(normalizeNodes(NODES)).toEqual([
      { ...NODES[0], sort: 1, parallelSort: 1 },
      { ...NODES[1], sort: 2, parallelSort: 1 },
    ]);
  });

  test("moves a task into a parallel stage", () => {
    const result = moveNodeToParallelGroup(NODES, "review", 1);
    expect(result.map(({ sort, parallelSort }) => ({ sort, parallelSort }))).toEqual([
      { sort: 1, parallelSort: 1 },
      { sort: 1, parallelSort: 2 },
    ]);
  });

  test("moves a task to a new stage", () => {
    const parallelNodes = moveNodeToParallelGroup(NODES, "review", 1);
    const result = moveNodeToStage(parallelNodes, "review", 1);
    expect(result.map(({ localId, sort }) => ({ localId, sort }))).toEqual([
      { localId: "translate", sort: 1 },
      { localId: "review", sort: 2 },
    ]);
  });

  test("creates the current backend payload", () => {
    expect(toCreateNodes(NODES)).toEqual([
      { baseTaskId: "translate", customName: "翻译", sort: 1, parallelSort: 1 },
      { baseTaskId: "review", customName: "审核", sort: 2, parallelSort: 1 },
    ]);
  });

  test("rejects nodes whose base task is unavailable", () => {
    const validation = validateEditorNodes([{ ...NODES[0], baseTaskId: "missing" }], BASE_TASKS);
    expect(validation.valid).toBe(false);
    expect(validation.errors[0]).toContain("基础任务不存在");
  });
});
