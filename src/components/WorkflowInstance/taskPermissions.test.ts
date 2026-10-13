import { describe, expect, test } from "vite-plus/test";
import { canReset, canReject } from "./taskPermissions";
import type { ItemTaskInstanceVO, ItemTaskNodeVO } from "@/types/workflowInstance";
const task = (
  id: string,
  sort: number,
  status: ItemTaskInstanceVO["status"],
  assigneeId = "me",
): ItemTaskInstanceVO => ({
  id,
  name: id,
  sort,
  parallelSort: 1,
  status,
  assigneeId,
  createdAt: "",
});
const nodes: ItemTaskNodeVO[] = [1, 3, 5].map((sort) => ({
  id: String(sort),
  baseTaskId: "base",
  name: "task",
  submitFields: [],
  sort,
  parallelSort: 1,
}));
describe("task permissions", () => {
  test("reset requires completed task assigned to current user", () => {
    expect(canReset(task("a", 1, "COMPLETED"), "me")).toBe(true);
    expect(canReset(task("a", 1, "CLAIMED"), "me")).toBe(false);
    expect(canReset(task("a", 1, "COMPLETED", "other"), "me")).toBe(false);
    expect(canReset(task("a", 1, "COMPLETED"), null)).toBe(false);
  });
  test("reject requires own claimed task in the immediately following stage", () => {
    const completed = task("a", 1, "COMPLETED", "other");
    expect(canReject(completed, nodes, [task("b", 3, "CLAIMED")], "me")).toBe(true);
    for (const status of ["PENDING", "COMPLETED"] as const)
      expect(canReject(completed, nodes, [task("b", 3, status)], "me")).toBe(false);
    expect(canReject(completed, nodes, [task("b", 5, "CLAIMED")], "me")).toBe(false);
    expect(canReject(completed, nodes, [task("b", 3, "CLAIMED", "other")], "me")).toBe(false);
    expect(canReject(task("a", 1, "PENDING"), nodes, [task("b", 3, "CLAIMED")], "me")).toBe(false);
    expect(
      canReject(
        completed,
        nodes,
        [task("b", 3, "CLAIMED", "other"), task("c", 3, "CLAIMED")],
        "me",
      ),
    ).toBe(true);
    expect(canReject(task("a", 5, "COMPLETED"), nodes, [], "me")).toBe(false);
  });
});
