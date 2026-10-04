import type { ItemTaskInstanceVO, ItemTaskNodeVO } from "@/types/workflowInstance";

export function canReset(instance: ItemTaskInstanceVO, currentUserId?: string | null): boolean {
  return Boolean(
    currentUserId && instance.status === "COMPLETED" && instance.assigneeId === currentUserId,
  );
}

export function canReject(
  instance: ItemTaskInstanceVO,
  nodes: ItemTaskNodeVO[],
  instances: ItemTaskInstanceVO[],
  currentUserId?: string | null,
): boolean {
  if (!currentUserId || instance.status !== "COMPLETED") return false;
  const nextStage = nodes.reduce<number | undefined>(
    (next, node) =>
      node.sort > instance.sort && (next === undefined || node.sort < next) ? node.sort : next,
    undefined,
  );
  return (
    nextStage !== undefined &&
    instances.some(
      (candidate) =>
        candidate.sort === nextStage &&
        candidate.status === "CLAIMED" &&
        candidate.assigneeId === currentUserId,
    )
  );
}
