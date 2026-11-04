import type { ItemTaskInstanceVO, ItemTaskNodeVO } from "@/types/workflowInstance";

function hasLaterCompletion(
  instance: ItemTaskInstanceVO,
  instances: ItemTaskInstanceVO[],
): boolean {
  return instances.some(
    (candidate) => candidate.sort > instance.sort && candidate.status === "COMPLETED",
  );
}

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
  canManage = false,
): boolean {
  if (
    instance.status !== "COMPLETED" ||
    typeof instance.revision !== "string" ||
    !/^\d+$/.test(instance.revision) ||
    hasLaterCompletion(instance, instances)
  )
    return false;
  if (canManage) return true;
  if (!currentUserId) return false;
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

export function canOwnerCancel(
  instance: ItemTaskInstanceVO,
  instances: ItemTaskInstanceVO[],
  canManage: boolean,
): boolean {
  return (
    canManage &&
    typeof instance.revision === "string" &&
    /^\d+$/.test(instance.revision) &&
    instance.status === "CLAIMED" &&
    !hasLaterCompletion(instance, instances)
  );
}

export function canAssign(instance: ItemTaskInstanceVO, canManage: boolean): boolean {
  return (
    canManage &&
    instance.status === "PENDING" &&
    typeof instance.revision === "string" &&
    /^\d+$/.test(instance.revision)
  );
}

export function canProxySubmit(
  instance: ItemTaskInstanceVO,
  nodes: ItemTaskNodeVO[],
  canManage: boolean,
): boolean {
  if (
    !canManage ||
    instance.status !== "PENDING" ||
    typeof instance.revision !== "string" ||
    !/^\d+$/.test(instance.revision)
  ) {
    return false;
  }
  const node = nodes.find((candidate) => candidate.taskInstanceId === instance.id);
  if (!node) return false;
  return nodes
    .filter((candidate) => candidate.sort < node.sort)
    .every((candidate) => candidate.taskStatus === "COMPLETED");
}
