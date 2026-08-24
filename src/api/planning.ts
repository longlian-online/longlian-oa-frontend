// 企划相关 API 客户端
// 对应后端接口: /app/project/*, /app/task/*, /app/project/item/*

import type {
  PageResult,
  ProjectInfoVO,
  ProjectDetailInfoVO,
  ProjectListDTO,
  ProjectCreateDTO,
  ProjectUpdateDTO,
  ProjectTypeInfoVO,
  ProjectItemListVO,
  ProjectItemCreateDTO,
  TaskTemplateOptionVO,
  TaskTemplateListVO,
  TaskTemplateDetailVO,
  ItemTaskFlowVO,
  TaskInstanceVO,
  TaskSubmissionVO,
  TaskSubmitDTO,
  TaskRejectDTO,
} from "@/types/planning";
import { buildApiUrl, request } from "@/api/request";

const API_BASE = "/app";
const projectListRequests = new Map<string, Promise<PageResult<ProjectInfoVO>>>();
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

// ==================== 企划类型 ====================

/**
 * 获取企划类型列表
 * GET /app/projects/types
 */
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

// ==================== 企划 ====================

/**
 * 分页查询企划列表
 * GET /app/projects
 */
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

/**
 * 获取企划详情
 * GET /app/projects/{projectId}
 */
export async function getProjectDetail(projectId: number | string): Promise<ProjectDetailInfoVO> {
  return request(`/projects/${projectId}`);
}

/**
 * 创建企划
 * POST /app/projects
 */
export async function createProject(dto: ProjectCreateDTO): Promise<void> {
  return request("/projects", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

/**
 * 编辑企划
 * PUT /app/projects/{projectId}
 */
export async function updateProject(
  projectId: number | string,
  dto: ProjectUpdateDTO,
): Promise<void> {
  return request(`/projects/${projectId}`, {
    method: "PUT",
    body: JSON.stringify(dto),
  });
}

/**
 * 添加企划到工坊
 * POST /app/projects/{projectId}/workshop
 */
export async function addProjectToWorkshop(projectId: number | string): Promise<void> {
  return request(`/projects/${projectId}/workshop`, {
    method: "POST",
  });
}

/**
 * 从工坊移除企划
 * DELETE /app/projects/{projectId}/workshop
 */
export async function removeProjectFromWorkshop(projectId: number | string): Promise<void> {
  return request(`/projects/${projectId}/workshop`, {
    method: "DELETE",
  });
}

// ==================== 项目（企划下的具体项目）====================

/**
 * 创建项目
 * POST /app/project/{projectId}/item
 */
export async function createProjectItem(
  projectId: number | string,
  dto: ProjectItemCreateDTO,
): Promise<void> {
  return request(`/project/${projectId}/item`, {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

/**
 * 分页查询项目列表
 * POST /app/project/item/list
 */
export async function getProjectItemList(
  projectId: number | string,
  params?: { pageNum?: number; pageSize?: number; keyword?: string },
): Promise<PageResult<ProjectItemListVO>> {
  return request(`/project/${projectId}/item/list`, {
    method: "POST",
    body: JSON.stringify(params || {}),
  });
}

// ==================== 任务流 ====================

/**
 * 获取项目任务流详情
 * GET /app/project/item/{itemId}/task-flow
 */
export async function getTaskFlow(itemId: number): Promise<ItemTaskFlowVO> {
  return request(`/project/item/${itemId}/task-flow`);
}

/**
 * 为项目创建任务流
 * POST /app/project/item/{itemId}/task-flow
 */
export async function createTaskFlow(itemId: number, taskTemplateId: number): Promise<void> {
  return request(`/project/item/${itemId}/task-flow`, {
    method: "POST",
    body: JSON.stringify({ taskTemplateId }),
  });
}

// ==================== 任务模板 ====================

/**
 * 获取用户可选流程模板列表
 * GET /app/project/item/template-options
 */
export async function getTaskTemplateOptions(): Promise<TaskTemplateOptionVO[]> {
  return request("/project/item/template-options");
}

/**
 * 获取任务模板列表
 * POST /app/task/template/list
 */
export async function getTaskTemplateList(params?: {
  pageNum?: number;
  pageSize?: number;
  keyword?: string;
}): Promise<PageResult<TaskTemplateListVO>> {
  return request("/task/template/list", {
    method: "POST",
    body: JSON.stringify(params || {}),
  });
}

/**
 * 获取任务模板详情
 * GET /app/task/template/{templateId}
 */
export async function getTaskTemplateDetail(templateId: number): Promise<TaskTemplateDetailVO> {
  return request(`/task/template/${templateId}`);
}

// ==================== 任务实例 ====================

/**
 * 查询企划下可执行的任务列表
 * GET /app/task/instance/project/{projectId}
 */
export async function getTaskInstances(projectId: number | string): Promise<TaskInstanceVO[]> {
  return request(`/task/instance/project/${projectId}`);
}

/**
 * 接取任务
 * POST /app/task/instance/{instanceId}/claim
 */
export async function claimTask(instanceId: number): Promise<void> {
  return request(`/task/instance/${instanceId}/claim`, {
    method: "POST",
  });
}

/**
 * 放弃任务
 * POST /app/task/instance/{instanceId}/abandon
 */
export async function abandonTask(instanceId: number): Promise<void> {
  return request(`/task/instance/${instanceId}/abandon`, {
    method: "POST",
  });
}

/**
 * 提交任务
 * POST /app/task/instance/{instanceId}/submit
 */
export async function submitTask(instanceId: number, dto: TaskSubmitDTO): Promise<void> {
  return request(`/task/instance/${instanceId}/submit`, {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

/**
 * 打回任务
 * POST /app/task/instance/{instanceId}/reject
 */
export async function rejectTask(instanceId: number, dto: TaskRejectDTO): Promise<void> {
  return request(`/task/instance/${instanceId}/reject`, {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

/**
 * 重置任务提交（撤回）
 * POST /app/task/instance/{instanceId}/reset
 */
export async function resetTask(instanceId: number): Promise<void> {
  return request(`/task/instance/${instanceId}/reset`, {
    method: "POST",
  });
}

// ==================== 提交记录 ====================

/**
 * 查询任务提交记录列表
 * GET /app/task/instance/{instanceId}/submissions
 */
export async function getTaskSubmissions(
  instanceId: number,
): Promise<PageResult<TaskSubmissionVO>> {
  return request(`/task/instance/${instanceId}/submissions`);
}

/**
 * 下载任务文件
 * GET /app/task/instance/submission/{submissionId}/download
 */
export function getSubmissionDownloadUrl(submissionId: number): string {
  return buildApiUrl(`${API_BASE}/task/instance/submission/${submissionId}/download`);
}
