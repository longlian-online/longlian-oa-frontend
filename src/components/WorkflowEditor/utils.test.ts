import { describe, expect, test } from "vite-plus/test";

import type { BaseTaskVO } from "@/types/workflowTemplate";
import {
  getWorkflowDropTarget,
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
    submitFields: [],
    refCount: 1,
    status: "ENABLED",
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "review",
    name: "审核",
    submitFields: [],
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

  test("inserts a task after a parallel stage at the requested stage index", () => {
    const nodes: WorkflowEditorNode[] = [
      { localId: "a", baseTaskId: "a", customName: "A", sort: 1, parallelSort: 1 },
      { localId: "b", baseTaskId: "b", customName: "B", sort: 1, parallelSort: 2 },
      { localId: "c", baseTaskId: "c", customName: "C", sort: 2, parallelSort: 1 },
    ];

    const result = moveNodeToStage(nodes, "c", 1);

    expect(result.map(({ localId, sort }) => ({ localId, sort }))).toEqual([
      { localId: "a", sort: 1 },
      { localId: "b", sort: 1 },
      { localId: "c", sort: 2 },
    ]);
  });

  test("moves the last task before the first without merging stages", () => {
    const nodes: WorkflowEditorNode[] = [
      { localId: "a", baseTaskId: "a", customName: "A", sort: 1, parallelSort: 1 },
      { localId: "b", baseTaskId: "b", customName: "B", sort: 2, parallelSort: 1 },
      { localId: "c", baseTaskId: "c", customName: "C", sort: 3, parallelSort: 1 },
    ];
    expect(moveNodeToStage(nodes, "c", 0).map(({ localId, sort }) => [localId, sort])).toEqual([
      ["c", 1],
      ["a", 2],
      ["b", 3],
    ]);
    expect(moveNodeToStage(nodes, "c", 1).map(({ localId, sort }) => [localId, sort])).toEqual([
      ["a", 1],
      ["c", 2],
      ["b", 3],
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

describe("workflow drop targets", () => {
  const nodes: WorkflowEditorNode[] = [
    { localId: "a", baseTaskId: "a", customName: "A", sort: 1, parallelSort: 1 },
    { localId: "b", baseTaskId: "b", customName: "B", sort: 2, parallelSort: 1 },
    { localId: "c", baseTaskId: "c", customName: "C", sort: 3, parallelSort: 1 },
  ];
  test("uses the leading area for insertion and card center for parallel", () => {
    expect(getWorkflowDropTarget(nodes, "c", { x: 60, y: 120 })).toEqual({
      type: "stage",
      stageIndex: 0,
    });
    expect(getWorkflowDropTarget(nodes, "c", { x: 184, y: 120 })).toEqual({
      type: "parallel",
      targetSort: 1,
    });
    expect(getWorkflowDropTarget(nodes, "c", { x: 340, y: 120 })).toEqual({
      type: "stage",
      stageIndex: 1,
    });
  });
  test("ignores the removed source stage when inserting later", () => {
    expect(getWorkflowDropTarget(nodes, "a", { x: 680, y: 120 })).toEqual({
      type: "stage",
      stageIndex: 1,
    });
  });
  test("does not merge with a distant card vertically or its own stage", () => {
    expect(getWorkflowDropTarget(nodes, "c", { x: 184, y: 600 }).type).toBe("stage");
    expect(getWorkflowDropTarget(nodes, "a", { x: 184, y: 120 })).toEqual({
      type: "stage",
      stageIndex: 0,
    });
  });
});
