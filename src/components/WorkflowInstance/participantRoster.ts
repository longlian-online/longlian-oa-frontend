import type { ItemTaskInstanceVO } from "@/types/workflowInstance";

function compareInstances(left: ItemTaskInstanceVO, right: ItemTaskInstanceVO): number {
  if (left.sort !== right.sort) return left.sort - right.sort;
  return left.parallelSort - right.parallelSort;
}

function summarizeParticipants(nicknames: string[]): string {
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const nickname of nicknames) {
    if (seen.has(nickname)) continue;
    seen.add(nickname);
    labels.push(nickname);
  }

  return labels.join("、");
}

/**
 * 按任务聚合当前项目的参与人，生成可直接粘贴的参与名单。
 * 每个有执行人的任务单独一段，段间空一行；任务名使用实例名称。
 * 同一任务内重复出现的参与者只保留一次昵称。
 * 没有执行人的任务不产生文案，全部未接取时返回空字符串。
 */
export function buildParticipantRoster(instances: ItemTaskInstanceVO[]): string {
  const participants = new Map<string, string[]>();
  for (const instance of [...instances].sort(compareInstances)) {
    const nickname = instance.assigneeNickname?.trim();
    if (!nickname) continue;
    const nicknames = participants.get(instance.name);
    if (nicknames) {
      nicknames.push(nickname);
      continue;
    }
    participants.set(instance.name, [nickname]);
  }

  if (participants.size === 0) return "";

  return [...participants.entries()]
    .map(([taskName, nicknames]) => `${taskName}：${summarizeParticipants(nicknames)}`)
    .join("\n\n");
}
