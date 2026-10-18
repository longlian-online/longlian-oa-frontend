import { request } from "@/api/request";

import type {
  PageResult,
  ProjectCreateDTO,
  ProjectDetailInfoVO,
  ProjectInfoVO,
  ProjectListDTO,
  ProjectTypeInfoVO,
  ProjectUpdateDTO,
} from "@/types/planning";

function toQueryString(params: Record<string, string | number | undefined>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  });
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

export async function getProjectTypes(): Promise<ProjectTypeInfoVO[]> {
  const result = await request<PageResult<ProjectTypeInfoVO> | ProjectTypeInfoVO[]>(
    "/projects/types",
  );
  return Array.isArray(result) ? result : result.list;
}

export async function getProjectList(dto: ProjectListDTO): Promise<PageResult<ProjectInfoVO>> {
  return request(
    `/projects${toQueryString({ keyword: dto.keyword, projectType: dto.projectType, pageNum: dto.pageNum, pageSize: dto.pageSize, offset: dto.offset, sortByTime: dto.sortByTime, orderDir: dto.orderDir })}`,
  );
}

export async function getProjectDetail(projectId: number | string): Promise<ProjectDetailInfoVO> {
  return request(`/projects/${projectId}`);
}

export async function createProject(dto: ProjectCreateDTO): Promise<void> {
  return request("/projects", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export async function updateProject(
  projectId: number | string,
  dto: ProjectUpdateDTO,
): Promise<void> {
  return request(`/projects/${projectId}`, {
    method: "PUT",
    body: JSON.stringify(dto),
  });
}

export async function addProjectToWorkshop(projectId: number | string): Promise<void> {
  return request(`/projects/${projectId}/workshop`, {
    method: "POST",
  });
}

export async function removeProjectFromWorkshop(projectId: number | string): Promise<void> {
  return request(`/projects/${projectId}/workshop`, {
    method: "DELETE",
  });
}

export async function deleteProject(projectId: number | string): Promise<void> {
  return request(`/projects/${projectId}`, {
    method: "DELETE",
  });
}

export async function createProjectDeletionRequest(
  projectId: number | string,
  reason: string,
): Promise<void> {
  return request(`/projects/${projectId}/deletion-requests`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}
