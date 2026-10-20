import type { ItemTaskNodeVO } from "@/types/workflowInstance";

/** 与待办接口一致：最近的未完成前置阶段，同阶段优先组内顺序和节点 ID。 */
export function findBlockingNode(
  node: ItemTaskNodeVO,
  nodes: ItemTaskNodeVO[],
): ItemTaskNodeVO | undefined {
  return nodes
    .filter((candidate) => candidate.sort < node.sort && candidate.taskStatus !== "COMPLETED")
    .sort(
      (prev, next) =>
        next.sort - prev.sort ||
        prev.parallelSort - next.parallelSort ||
        prev.id.localeCompare(next.id, "en", { numeric: true }),
    )[0];
}
