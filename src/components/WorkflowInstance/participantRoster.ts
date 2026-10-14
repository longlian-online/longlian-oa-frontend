import type { ItemTaskInstanceVO } from "@/types/workflowInstance";

function compareInstances(left: ItemTaskInstanceVO, right: ItemTaskInstanceVO): number {
  if (left.sort !== right.sort) return left.sort - right.sort;
  return left.parallelSort - right.parallelSort;
}

function summarizeTasks(tasks: string[]): string {
  const total = new Map<string, number>();
  for (const task of tasks) {
    total.set(task, (total.get(task) ?? 0) + 1);
  }

  const seen = new Set<string>();
  const labels: string[] = [];
  for (const task of tasks) {
    const count = total.get(task) ?? 1;
    if (count === 1) {
      labels.push(task);
      continue;
    }
    if (seen.has(task)) continue;
    seen.add(task);
    labels.push(`${task}×${count}`);
  }

  return labels.join("、");
}

/**
 * 按人聚合当前项目的任务参与人，生成可直接粘贴的参与名单文案。
 * 没有执行人的任务（待接取）不产生文案，返回空字符串表示无可复制内容。
 */
export function buildParticipantRoster(itemTitle: string, instances: ItemTaskInstanceVO[]): string {
  const participants = new Map<string, string[]>();
  for (const instance of [...instances].sort(compareInstances)) {
    const nickname = instance.assigneeNickname?.trim();
    if (!nickname) continue;
    const tasks = participants.get(nickname) ?? [];
    tasks.push(instance.name);
    participants.set(nickname, tasks);
  }

  if (participants.size === 0) return "";

  const lines = [itemTitle ? `${itemTitle} · 参与名单` : "参与名单"];
  for (const [nickname, tasks] of participants) {
    lines.push(`${nickname}：${summarizeTasks(tasks)}`);
  }
  return lines.join("\n");
}
