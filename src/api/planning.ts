// 企划相关 API 客户端
// 对应后端接口: /app/project/*, /app/task/*, /app/project/item/*

import type {
  PageResult,
  ProjectInfoVO,
  ProjectDetailInfoVO,
  ProjectListDTO,
  ProjectCreateDTO,
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
import { request } from "@/api/request";
import {
  USE_MOCK,
  mockGetProjectTypes,
  mockGetProjectList,
  mockGetProjectDetail,
  mockCreateProject,
  mockGetProjectItemList,
  mockCreateProjectItem,
  mockGetTaskTemplateOptions,
  mockGetTaskTemplateDetail,
  mockGetTaskFlow,
  mockCreateTaskFlow,
  mockGetTaskInstances,
  mockClaimTask,
  mockAbandonTask,
  mockSubmitTask,
  mockRejectTask,
  mockResetTask,
  mockGetTaskSubmissions,
} from "@/mock";

const API_BASE = "/app";

// ==================== 企划类型 ====================

/**
 * 获取企划类型列表
 * GET /app/project/type/list
 */
export async function getProjectTypes(): Promise<ProjectTypeInfoVO[]> {
  if (USE_MOCK) {
    return mockGetProjectTypes();
  }
  return request("/project/type/list");
}

// ==================== 企划 ====================

/**
 * 分页查询企划列表
 * POST /app/project/list
 */
export async function getProjectList(dto: ProjectListDTO): Promise<PageResult<ProjectInfoVO>> {
  if (USE_MOCK) {
    return mockGetProjectList(dto);
  }
  return request("/project/list", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

/**
 * 获取企划详情
 * GET /app/project/{projectId}
 */
export async function getProjectDetail(projectId: number | string): Promise<ProjectDetailInfoVO> {
  if (USE_MOCK) {
    return mockGetProjectDetail(projectId);
  }
  return request(`/project/${projectId}`);
}

/**
 * 创建企划
 * POST /app/project
 */
export async function createProject(dto: ProjectCreateDTO): Promise<void> {
  if (USE_MOCK) {
    return mockCreateProject(dto);
  }
  return request("/project", {
    method: "POST",
    body: JSON.stringify(dto),
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
  if (USE_MOCK) {
    return mockCreateProjectItem(projectId, dto);
  }
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
  if (USE_MOCK) {
    return mockGetProjectItemList(projectId, params);
  }
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
  if (USE_MOCK) {
    return mockGetTaskFlow(itemId);
  }
  return request(`/project/item/${itemId}/task-flow`);
}

/**
 * 为项目创建任务流
 * POST /app/project/item/{itemId}/task-flow
 */
export async function createTaskFlow(itemId: number, taskTemplateId: number): Promise<void> {
  if (USE_MOCK) {
    return mockCreateTaskFlow(itemId, taskTemplateId);
  }
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
  if (USE_MOCK) {
    return mockGetTaskTemplateOptions();
  }
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
  if (USE_MOCK) {
    return mockGetTaskTemplateDetail(templateId);
  }
  return request(`/task/template/${templateId}`);
}

// ==================== 任务实例 ====================

/**
 * 查询企划下可执行的任务列表
 * GET /app/task/instance/project/{projectId}
 */
export async function getTaskInstances(projectId: number | string): Promise<TaskInstanceVO[]> {
  if (USE_MOCK) {
    return mockGetTaskInstances(projectId);
  }
  return request(`/task/instance/project/${projectId}`);
}

/**
 * 接取任务
 * POST /app/task/instance/{instanceId}/claim
 */
export async function claimTask(instanceId: number): Promise<void> {
  if (USE_MOCK) {
    return mockClaimTask(instanceId);
  }
  return request(`/task/instance/${instanceId}/claim`, {
    method: "POST",
  });
}

/**
 * 放弃任务
 * POST /app/task/instance/{instanceId}/abandon
 */
export async function abandonTask(instanceId: number): Promise<void> {
  if (USE_MOCK) {
    return mockAbandonTask(instanceId);
  }
  return request(`/task/instance/${instanceId}/abandon`, {
    method: "POST",
  });
}

/**
 * 提交任务
 * POST /app/task/instance/{instanceId}/submit
 */
export async function submitTask(instanceId: number, dto: TaskSubmitDTO): Promise<void> {
  if (USE_MOCK) {
    return mockSubmitTask(instanceId, dto);
  }
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
  if (USE_MOCK) {
    return mockRejectTask(instanceId, dto);
  }
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
  if (USE_MOCK) {
    return mockResetTask(instanceId);
  }
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
  if (USE_MOCK) {
    return mockGetTaskSubmissions(instanceId);
  }
  return request(`/task/instance/${instanceId}/submissions`);
}

/**
 * 下载任务文件
 * GET /app/task/instance/submission/{submissionId}/download
 */
export function getSubmissionDownloadUrl(submissionId: number): string {
  return `${API_BASE}/task/instance/submission/${submissionId}/download`;
}
