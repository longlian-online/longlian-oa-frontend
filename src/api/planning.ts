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

const projectListRequests = new Map<string, Promise<PageResult<ProjectInfoVO>>>();
const projectDetailRequests = new Map<string, Promise<ProjectDetailInfoVO>>();
let projectTypesRequest: Promise<ProjectTypeInfoVO[]> | null = null;

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
  projectTypesRequest ??= request<PageResult<ProjectTypeInfoVO> | ProjectTypeInfoVO[]>(
    "/projects/types",
  )
    .then((result) => (Array.isArray(result) ? result : result.list))
    .finally(() => {
      projectTypesRequest = null;
    });
  return projectTypesRequest;
}

export async function getProjectList(dto: ProjectListDTO): Promise<PageResult<ProjectInfoVO>> {
  const requestKey = JSON.stringify(dto);
  const existingRequest = projectListRequests.get(requestKey);
  if (existingRequest) {
    return existingRequest;
  }

  const listRequest = request<PageResult<ProjectInfoVO>>(
    `/projects${toQueryString({
      keyword: dto.keyword,
      projectType: dto.projectType,
      pageNum: dto.pageNum,
      pageSize: dto.pageSize,
      sortByTime: dto.sortByTime,
      orderDir: dto.orderDir,
    })}`,
  ).finally(() => {
    projectListRequests.delete(requestKey);
  });
  projectListRequests.set(requestKey, listRequest);
  return listRequest;
}

export async function getProjectDetail(projectId: number | string): Promise<ProjectDetailInfoVO> {
  const requestKey = String(projectId);
  const existingRequest = projectDetailRequests.get(requestKey);
  if (existingRequest) {
    return existingRequest;
  }

  const detailRequest = request<ProjectDetailInfoVO>(`/projects/${projectId}`).finally(() => {
    projectDetailRequests.delete(requestKey);
  });
  projectDetailRequests.set(requestKey, detailRequest);
  return detailRequest;
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
