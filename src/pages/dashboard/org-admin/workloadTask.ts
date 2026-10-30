import { formatSlotLabel, formatTaskTitle } from "@/lib/slotLabel";
import type { OrganizationMemberWorkloadTaskVO } from "@/types/organizationAdmin";

export function workloadTaskTitle(task: OrganizationMemberWorkloadTaskVO): string {
  const slot = formatTaskTitle(task.itemTitle ?? "", {
    name: task.nodeName ?? "",
    slotIndex: task.slotIndex,
    slotTotal: task.slotTotal,
    serialStep: task.serialStep,
  });
  const project = task.projectName?.trim() ?? "";
  return project ? `${project} / ${slot}` : slot;
}

export function workloadTaskState(task: OrganizationMemberWorkloadTaskVO): string {
  if (!task.waitingStageName) return "可提交";
  return `等${formatSlotLabel({
    name: task.waitingStageName,
    slotIndex: task.waitingSlotIndex,
    slotTotal: task.waitingSlotTotal,
    serialStep: task.waitingSerialStep,
  })}`;
}

export function workloadTaskPath(task: OrganizationMemberWorkloadTaskVO): string {
  const params = new URLSearchParams({ taskInstanceId: task.instanceId });
  return `/dashboard/planning/${task.projectId}/items/${task.itemId}?${params}`;
}
