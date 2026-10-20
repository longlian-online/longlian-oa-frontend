import { expect, test } from "vite-plus/test";
import { findBlockingNode } from "./taskNavigation";
import type { ItemTaskNodeVO } from "@/types/workflowInstance";

function node(
  id: string,
  sort: number,
  parallelSort: number,
  taskStatus: ItemTaskNodeVO["taskStatus"] = "CLAIMED",
): ItemTaskNodeVO {
  return { id, name: "翻译", baseTaskId: "base", submitFields: [], sort, parallelSort, taskStatus };
}

test("blocker agrees with the waiting bucket: nearest incomplete predecessor, then parallel order and numeric ID", () => {
  const target = node("50", 5, 1);
  const earlier = node("1", 1, 1);
  const nearest = node("9007199254740993", 3, 2);
  const laterId = node("10000000000000000", 3, 2);
  const completed = node("2", 4, 1, "COMPLETED");
  const parallel = node("51", 5, 2);
  expect(findBlockingNode(target, [parallel, target, laterId, earlier, nearest, completed])).toBe(
    nearest,
  );
  expect(findBlockingNode(target, [target, parallel, completed])).toBeUndefined();
});
