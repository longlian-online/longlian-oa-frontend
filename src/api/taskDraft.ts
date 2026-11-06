import { request } from "@/api/request";
import type {
  TaskDraftDetailVO,
  TaskDraftSaveDTO,
  TaskDraftSubmitDTO,
  TaskDraftSubmitResultVO,
} from "@/types/taskDraft";

// 对应后端 TaskDraftConstants.CONFLICT_MESSAGE，经 AppException 拼接操作失败前缀后的完整响应。
export const TASK_DRAFT_CONFLICT_MESSAGE = "操作失败,草稿或任务已更新，请重新加载后重试";

export async function getTaskDraft(
  instanceId: string,
  signal?: AbortSignal,
): Promise<TaskDraftDetailVO> {
  return request(`/task/instance/${instanceId}/draft`, { signal });
}

export async function saveTaskDraft(
  instanceId: string,
  dto: TaskDraftSaveDTO,
): Promise<TaskDraftDetailVO> {
  return request(`/task/instance/${instanceId}/draft`, {
    method: "PUT",
    body: JSON.stringify(dto),
  });
}

export async function submitTaskDraft(
  instanceId: string,
  dto: TaskDraftSubmitDTO,
): Promise<TaskDraftSubmitResultVO> {
  return request(`/task/instance/${instanceId}/draft/submit`, {
    method: "POST",
    body: JSON.stringify(dto),
  });
}
