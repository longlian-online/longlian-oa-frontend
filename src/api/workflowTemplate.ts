import { request } from "@/api/request";
import type { PageResult } from "@/types/planning";
import type {
  BaseTaskListDTO,
  BaseTaskVO,
  TaskTemplateOptionVO,
  WorkshopTaskTemplateCreateDTO,
  WorkshopTaskTemplateDTO,
  WorkshopTaskTemplateVO,
} from "@/types/workflowTemplate";

export async function createWorkshopTaskTemplate(
  dto: WorkshopTaskTemplateCreateDTO,
): Promise<void> {
  return request("/workshop/task-template", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export async function getWorkshopTaskTemplateList(
  params?: WorkshopTaskTemplateDTO,
): Promise<PageResult<WorkshopTaskTemplateVO>> {
  return request("/workshop/task-template/list", {
    method: "POST",
    body: JSON.stringify(params || {}),
  });
}

export async function updateWorkshopTaskTemplate(
  templateId: string,
  dto: WorkshopTaskTemplateCreateDTO,
): Promise<void> {
  return request(`/workshop/task-template/${templateId}`, {
    method: "PUT",
    body: JSON.stringify(dto),
  });
}

export async function getTaskTemplateOptions(): Promise<TaskTemplateOptionVO[]> {
  return request("/task-template/options");
}

export async function getBaseTaskList(params?: BaseTaskListDTO): Promise<PageResult<BaseTaskVO>> {
  return request("/task/base/list", {
    method: "POST",
    body: JSON.stringify(params || {}),
  });
}
