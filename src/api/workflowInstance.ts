import { request } from "@/api/request";
import type {
  ItemTaskFlowVO,
  ItemTaskInstanceVO,
  TaskAbandonDTO,
  TaskClaimResultVO,
  TaskInstanceDetailVO,
  TaskRejectDTO,
  TaskSubmissionVersionVO,
  TaskSubmitDTO,
} from "@/types/workflowInstance";

export async function getItemTaskFlow(itemId: string): Promise<ItemTaskFlowVO> {
  return request(`/item/${itemId}/flow`);
}

export async function getItemTaskInstances(itemId: string): Promise<ItemTaskInstanceVO[]> {
  return request(`/task/instance/item/${itemId}`);
}

export async function getTaskInstanceDetail(
  instanceId: string,
  signal?: AbortSignal,
): Promise<TaskInstanceDetailVO> {
  return request(`/task/instance/${instanceId}/detail`, { signal });
}

export async function getTaskSubmissionVersions(
  instanceId: string,
  signal?: AbortSignal,
): Promise<TaskSubmissionVersionVO[]> {
  return request(`/task/instance/${instanceId}/submissions`, { signal });
}

export async function claimTask(instanceId: string): Promise<TaskClaimResultVO> {
  return request(`/task/instance/${instanceId}/claim`, {
    method: "POST",
  });
}

export async function abandonTask(instanceId: string, dto: TaskAbandonDTO): Promise<void> {
  return request(`/task/instance/${instanceId}/abandon`, {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export async function submitTask(instanceId: string, dto: TaskSubmitDTO): Promise<void> {
  return request(`/task/instance/${instanceId}/submit`, {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export async function rejectTask(instanceId: string, dto: TaskRejectDTO): Promise<void> {
  return request(`/task/instance/${instanceId}/reject`, {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export async function resetTask(instanceId: string): Promise<void> {
  return request(`/task/instance/${instanceId}/reset`, {
    method: "POST",
  });
}
