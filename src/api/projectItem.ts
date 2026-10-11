import { request } from "@/api/request";
import type { PageResult } from "@/types/planning";
import type {
  ProjectItemCreateDTO,
  ProjectItemListDTO,
  ProjectItemListVO,
  TaskTemplateOptionVO,
} from "@/types/projectItem";

function buildQuery(params?: ProjectItemListDTO): string {
  if (!params) return "";

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

export async function getProjectItemList(
  projectId: string,
  params?: ProjectItemListDTO,
): Promise<PageResult<ProjectItemListVO>> {
  return request(`/projects/${projectId}/items${buildQuery(params)}`);
}

export async function createProjectItem(
  projectId: string,
  dto: ProjectItemCreateDTO,
): Promise<void> {
  return request(`/projects/${projectId}/items`, {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export async function deleteProjectItem(projectId: string, itemId: string): Promise<void> {
  return request(`/projects/${projectId}/items/${itemId}`, {
    method: "DELETE",
  });
}

export async function publishProjectItem(projectId: string, itemId: string): Promise<void> {
  return request(`/projects/${projectId}/items/${itemId}/publish`, {
    method: "PATCH",
  });
}

export async function getTaskTemplateOptions(): Promise<TaskTemplateOptionVO[]> {
  return request("/task-template/options");
}
