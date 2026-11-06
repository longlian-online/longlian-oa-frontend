import { request } from "@/api/request";
import type { TaskSubmitValue } from "@/types/task";
import type {
  ItemTaskFlowVO,
  ItemTaskInstanceVO,
  TaskAbandonDTO,
  TaskAssignDTO,
  TaskClaimResultVO,
  TaskInstanceDetailVO,
  TaskProxySubmitDTO,
  TaskRejectDTO,
  TaskSubmissionVersionVO,
  TaskSubmitDTO,
  ItemTaskFlowUpdateDTO,
} from "@/types/workflowInstance";

export async function getItemTaskFlow(itemId: string): Promise<ItemTaskFlowVO> {
  return request(`/item/${itemId}/flow`);
}

export async function updateItemTaskFlow(
  itemId: string,
  dto: ItemTaskFlowUpdateDTO,
): Promise<void> {
  return request(`/item/${itemId}/flow`, {
    method: "PUT",
    body: JSON.stringify(dto),
  });
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

export async function getTaskAttachmentDownload(
  instanceId: string,
  fileId: string,
  signal?: AbortSignal,
): Promise<{ readUrl: string }> {
  return request(`/task/instance/${instanceId}/attachments/${fileId}/download`, { signal });
}

export async function claimTask(instanceId: string): Promise<TaskClaimResultVO> {
  return request(`/task/instance/${instanceId}/claim`, {
    method: "POST",
  });
}

export async function assignTask(
  instanceId: string,
  dto: TaskAssignDTO,
): Promise<TaskClaimResultVO> {
  return request(`/task/instance/${instanceId}/assign`, {
    method: "POST",
    body: JSON.stringify(dto),
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

export async function getTaskDraft(
  instanceId: string,
): Promise<{ values: Record<string, TaskSubmitValue> }> {
  return request(`/task/instance/${instanceId}/draft`);
}

export async function saveTaskDraft(instanceId: string, dto: TaskSubmitDTO): Promise<string> {
  return request(`/task/instance/${instanceId}/draft`, {
    method: "PUT",
    body: JSON.stringify(dto),
  });
}

export async function submitTaskDraft(instanceId: string): Promise<void> {
  return request(`/task/instance/${instanceId}/draft/submit`, { method: "POST" });
}

export async function proxySubmitTask(instanceId: string, dto: TaskProxySubmitDTO): Promise<void> {
  return request(`/task/instance/${instanceId}/proxy-submit`, {
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
