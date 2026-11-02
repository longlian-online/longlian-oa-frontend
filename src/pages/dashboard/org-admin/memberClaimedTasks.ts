import { formatSlotLabel, formatTaskTitle } from "@/lib/slotLabel";
import type { MemberClaimedTaskItemVO, MemberClaimedTaskVO } from "@/types/organizationAdmin";

export type ClaimedTaskTab = "ALL" | MemberClaimedTaskItemVO["bucket"];

export const CLAIMED_TASK_TABS: { value: ClaimedTaskTab; label: string }[] = [
  { value: "ALL", label: "全部" },
  { value: "SUBMITTABLE", label: "进行中" },
  { value: "WAITING", label: "等待中" },
];

/** 三个 Tab 的数量由服务端给出，与列表口径保持一致。 */
export function claimedTaskTabCount(
  tab: ClaimedTaskTab,
  counts: Pick<MemberClaimedTaskVO, "totalCount" | "submittableCount" | "waitingCount">,
): number {
  if (tab === "SUBMITTABLE") return counts.submittableCount;
  if (tab === "WAITING") return counts.waitingCount;
  return counts.totalCount;
}

export function filterClaimedTasks(
  tasks: MemberClaimedTaskItemVO[],
  tab: ClaimedTaskTab,
): MemberClaimedTaskItemVO[] {
  if (tab === "ALL") return tasks;
  return tasks.filter((task) => task.bucket === tab);
}

/** 与工坊待办、任务详情同一套槽位文案：项目名 · 槽位。 */
export function claimedTaskTitle(task: MemberClaimedTaskItemVO): string {
  return formatTaskTitle(task.itemTitle ?? "", {
    name: task.nodeName ?? "",
    slotIndex: task.slotIndex,
    slotTotal: task.slotTotal,
    serialStep: task.serialStep,
  });
}

/** 任务页通过 taskInstanceId 定位精确的任务实例，包括同一阶段的并行槽位。 */
export function claimedTaskPath(task: MemberClaimedTaskItemVO): string {
  const search = new URLSearchParams({ taskInstanceId: task.instanceId });
  return `/dashboard/planning/${task.projectId}/items/${task.itemId}?${search}`;
}

/** 等待中的任务显示挡住它的前置节点，写作「等校对（第 2 步）」；进行中时为 null。 */
export function claimedTaskWaitingLabel(task: MemberClaimedTaskItemVO): string | null {
  if (!task.waitingStageName) return null;
  return `等${formatSlotLabel({
    name: task.waitingStageName,
    slotIndex: task.waitingSlotIndex,
    slotTotal: task.waitingSlotTotal,
    serialStep: task.waitingSerialStep,
  })}`;
}
