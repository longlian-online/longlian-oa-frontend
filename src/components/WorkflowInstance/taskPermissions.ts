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
): boolean {
  if (
    !currentUserId ||
    instance.status !== "COMPLETED" ||
    typeof instance.revision !== "string" ||
    !/^\d+$/.test(instance.revision) ||
    hasLaterCompletion(instance, instances)
  )
    return false;
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

export type OwnerTaskAction = "cancel" | "reject";

export function canOwnerAct(
  action: OwnerTaskAction,
  instance: ItemTaskInstanceVO,
  instances: ItemTaskInstanceVO[],
  isProjectCreator: boolean,
): boolean {
  return (
    isProjectCreator &&
    typeof instance.revision === "string" &&
    /^\d+$/.test(instance.revision) &&
    instance.status === (action === "cancel" ? "CLAIMED" : "COMPLETED") &&
    !hasLaterCompletion(instance, instances)
  );
}

export function canAssign(instance: ItemTaskInstanceVO, isProjectCreator: boolean): boolean {
  return (
    isProjectCreator &&
    instance.status === "PENDING" &&
    typeof instance.revision === "string" &&
    /^\d+$/.test(instance.revision)
  );
}

export function canProxySubmit(
  instance: ItemTaskInstanceVO,
  nodes: ItemTaskNodeVO[],
  isProjectCreator: boolean,
): boolean {
  if (
    !isProjectCreator ||
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
