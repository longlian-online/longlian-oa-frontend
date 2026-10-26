import { describe, expect, test } from "vite-plus/test";
import { canReset, canReject, canOwnerAct, canProxySubmit } from "./taskPermissions";
import type { ItemTaskInstanceVO, ItemTaskNodeVO } from "@/types/workflowInstance";
const task = (
  id: string,
  sort: number,
  status: ItemTaskInstanceVO["status"],
  assigneeId = "me",
): ItemTaskInstanceVO => ({
  id,
  revision: "0",
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
  test("reject shares the later-completion guard and requires a server revision", () => {
    const completed = task("a", 1, "COMPLETED", "other");
    const next = task("next", 3, "CLAIMED");
    expect(canReject(completed, nodes, [next, task("parallel", 1, "COMPLETED")], "me")).toBe(true);
    expect(canReject(completed, nodes, [next, task("farther", 9, "COMPLETED")], "me")).toBe(false);
    for (const revision of [undefined, "", "-1", "1.5", " 0 "]) {
      expect(canReject({ ...completed, revision: revision as string }, nodes, [next], "me")).toBe(
        false,
      );
    }
  });
});

describe("project creator task permissions", () => {
  test("only explicit project creator capability grants owner actions, not assignee or admin membership", () => {
    for (const action of ["cancel", "reject"] as const) {
      const target = task("a", 1, action === "cancel" ? "CLAIMED" : "COMPLETED");
      expect(canOwnerAct(action, target, [], true)).toBe(true);
      expect(canOwnerAct(action, target, [], false)).toBe(false);
      expect(canOwnerAct(action, { ...target, assigneeId: "admin" }, [], false)).toBe(false);
      expect(canOwnerAct(action, { ...target, assigneeId: "other" }, [], true)).toBe(true);
    }
  });

  test("each action requires its exact state and a valid server revision", () => {
    for (const action of ["cancel", "reject"] as const) {
      for (const status of ["PENDING", "CLAIMED", "COMPLETED"] as const) {
        expect(canOwnerAct(action, task("a", 1, status), [], true)).toBe(
          status === (action === "cancel" ? "CLAIMED" : "COMPLETED"),
        );
      }
      for (const revision of [undefined, "", "-1", "1.5", " 0 "]) {
        expect(
          canOwnerAct(
            action,
            {
              ...task("a", 1, action === "cancel" ? "CLAIMED" : "COMPLETED"),
              revision: revision as string,
            },
            [],
            true,
          ),
        ).toBe(false);
      }
    }
  });

  test("parallel completions and later claims are allowed, any later completed stage blocks both actions", () => {
    for (const action of ["cancel", "reject"] as const) {
      const target = task("a", 3, action === "cancel" ? "CLAIMED" : "COMPLETED");
      const retained = [
        task("earlier", 1, "COMPLETED"),
        task("parallel", 3, "COMPLETED"),
        task("later", 5, "CLAIMED"),
      ];
      expect(canOwnerAct(action, target, retained, true)).toBe(true);
      expect(
        canOwnerAct(action, target, [...retained, task("farther", 9, "COMPLETED")], true),
      ).toBe(false);
    }
  });
});

describe("proxy submit permission", () => {
  const pendingNodes: ItemTaskNodeVO[] = [
    {
      id: "first",
      baseTaskId: "base",
      name: "翻译",
      submitFields: [],
      sort: 1,
      parallelSort: 1,
      taskInstanceId: "a",
      taskStatus: "COMPLETED",
    },
    {
      id: "second",
      baseTaskId: "base",
      name: "校对",
      submitFields: [],
      sort: 2,
      parallelSort: 1,
      taskInstanceId: "b",
      taskStatus: "PENDING",
    },
  ];

  test("only the project creator can proxy-submit an unclaimed unlocked task", () => {
    const pending = task("b", 2, "PENDING", undefined);
    expect(canProxySubmit(pending, pendingNodes, true)).toBe(true);
    expect(canProxySubmit(pending, pendingNodes, false)).toBe(false);
    expect(canProxySubmit(task("b", 2, "CLAIMED", "member"), pendingNodes, true)).toBe(false);
    expect(canProxySubmit(task("b", 2, "COMPLETED", "member"), pendingNodes, true)).toBe(false);
    expect(canProxySubmit({ ...pending, revision: "" }, pendingNodes, true)).toBe(false);
    expect(
      canProxySubmit(
        pending,
        pendingNodes.map((node) =>
          node.id === "first" ? { ...node, taskStatus: "PENDING" } : node,
        ),
        true,
      ),
    ).toBe(false);
  });
});
