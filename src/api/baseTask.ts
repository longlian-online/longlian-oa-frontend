import { orgAdminRequest } from "@/api/request";
import type { PageResult } from "@/types/planning";
import type {
  BaseTaskCreateDTO,
  BaseTaskListDTO,
  BaseTaskStatus,
  BaseTaskVO,
} from "@/types/workflowTemplate";

export async function createBaseTask(dto: BaseTaskCreateDTO): Promise<void> {
  return orgAdminRequest("/orgadmin/task/base", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export async function getBaseTaskList(params?: BaseTaskListDTO): Promise<PageResult<BaseTaskVO>> {
  return orgAdminRequest("/orgadmin/task/base/list", {
    method: "POST",
    body: JSON.stringify(params || {}),
  });
}

export async function changeBaseTaskStatus(taskId: string, status: BaseTaskStatus): Promise<void> {
  return orgAdminRequest(`/orgadmin/task/base/${taskId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
