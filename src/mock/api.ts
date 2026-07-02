// Mock API 实现

import type {
  PageResult,
  ProjectInfoVO,
  ProjectDetailInfoVO,
  ProjectItemListVO,
  ProjectListDTO,
  ProjectCreateDTO,
  ProjectItemCreateDTO,
  ProjectTypeInfoVO,
  TaskTemplateOptionVO,
  TaskTemplateDetailVO,
  ItemTaskFlowVO,
  TaskInstanceVO,
  TaskSubmissionVO,
  TaskSubmitDTO,
  TaskRejectDTO,
} from "@/types/planning";
import type {
  EmailCodeDTO,
  JoinByInviteCodeDTO,
  LoginByCodeDTO,
  LoginByPwdDTO,
  LoginVO,
  RegisterByInviteDTO,
} from "@/types/auth";
import type { UserInfoVO } from "@/types/user";
import {
  mockCurrentUser,
  mockCurrentUserInfo,
  mockProjects,
  mockProjectDetails,
  mockProjectItems,
  mockTaskTemplateOptions,
  mockTaskTemplateDetails,
  mockTaskFlows,
  mockTaskInstances,
  mockTaskSubmissions,
  mockProjectTypes,
  mockDelay,
} from "./data";

// ==================== 认证 ====================

export async function mockLoginByPassword(dto: LoginByPwdDTO): Promise<LoginVO> {
  await mockDelay(500);
  if (dto.username === "admin" && dto.password === "123456") {
    return mockCurrentUser;
  }
  throw new Error("用户名或密码错误");
}

export async function mockLoginByCode(dto: LoginByCodeDTO): Promise<LoginVO> {
  await mockDelay(500);
  if (dto.code === "123456") {
    return mockCurrentUser;
  }
  throw new Error("验证码错误");
}

export async function mockSendVerificationCode(dto: EmailCodeDTO): Promise<void> {
  await mockDelay(300);
  console.log(`[Mock] ${dto.businessType} 验证码已发送到 ${dto.email}: 123456`);
}

export async function mockRegisterJoinOrganization(dto: RegisterByInviteDTO): Promise<void> {
  await mockDelay(500);
  console.log("[Mock] 注册并加入组织成功:", dto.username);
}

export async function mockRegisterCreateOrganization(dto: RegisterByInviteDTO): Promise<void> {
  await mockDelay(500);
  console.log("[Mock] 注册并创建组织成功:", dto.username, dto.orgName);
}

export async function mockLogout(): Promise<void> {
  await mockDelay(200);
}

export async function mockGetCurrentUser(): Promise<UserInfoVO> {
  await mockDelay(200);
  return mockCurrentUserInfo;
}

export async function mockGetInviteInfo(inviteCode: string) {
  await mockDelay(300);
  if (!inviteCode.trim()) {
    throw new Error("邀请码不能为空");
  }
  return {
    orgId: "1",
    orgName: "Longlian 汉化组",
  };
}

export async function mockJoinOrganizationByInvite(dto: JoinByInviteCodeDTO): Promise<void> {
  await mockDelay(400);
  console.log("[Mock] 已加入组织:", dto.inviteCode);
}

// ==================== 企划类型 ====================

export async function mockGetProjectTypes(): Promise<ProjectTypeInfoVO[]> {
  await mockDelay(200);
  return mockProjectTypes;
}

// ==================== 企划 ====================

export async function mockGetProjectList(dto: ProjectListDTO): Promise<PageResult<ProjectInfoVO>> {
  await mockDelay(300);
  let list = [...mockProjects];

  // 关键词过滤
  if (dto.keyword) {
    const keyword = dto.keyword.toLowerCase();
    list = list.filter(
      (p) =>
        p.title.toLowerCase().includes(keyword) ||
        (p.description && p.description.toLowerCase().includes(keyword)),
    );
  }

  // 类型过滤
  if (dto.projectType) {
    list = list.filter((p) => p.projectType === dto.projectType);
  }

  // 分页
  const pageNum = dto.pageNum || 1;
  const pageSize = dto.pageSize || 10;
  const start = (pageNum - 1) * pageSize;
  const end = start + pageSize;

  return {
    list: list.slice(start, end),
    total: list.length,
    pageNum,
    pageSize,
    hasNext: end < list.length,
  };
}

export async function mockGetProjectDetail(
  projectId: number | string,
): Promise<ProjectDetailInfoVO> {
  await mockDelay(300);
  const detail = mockProjectDetails[Number(projectId)];
  if (!detail) {
    throw new Error("企划不存在");
  }
  return detail;
}

export async function mockCreateProject(dto: ProjectCreateDTO): Promise<void> {
  await mockDelay(500);
  const newProject: ProjectInfoVO = {
    id: Date.now(),
    title: dto.title,
    description: dto.description,
    projectType: "漫画",
    projectStatus: "IN_PROGRESS",
  };
  mockProjects.unshift(newProject);
  console.log("[Mock] 创建企划:", dto.title);
}

// ==================== 项目 ====================

export async function mockGetProjectItemList(
  projectId: number | string,
  params?: { pageNum?: number; pageSize?: number; keyword?: string },
): Promise<PageResult<ProjectItemListVO>> {
  await mockDelay(300);
  let list = mockProjectItems[Number(projectId)] || [];

  if (params?.keyword) {
    const keyword = params.keyword.toLowerCase();
    list = list.filter((item) => item.title.toLowerCase().includes(keyword));
  }

  const pageNum = params?.pageNum || 1;
  const pageSize = params?.pageSize || 10;
  const start = (pageNum - 1) * pageSize;
  const end = start + pageSize;

  return {
    list: list.slice(start, end),
    total: list.length,
    pageNum,
    pageSize,
    hasNext: end < list.length,
  };
}

export async function mockCreateProjectItem(
  projectId: number | string,
  dto: ProjectItemCreateDTO,
): Promise<void> {
  await mockDelay(500);
  const items = mockProjectItems[Number(projectId)] || [];
  const newItem: ProjectItemListVO = {
    id: Date.now(),
    title: dto.title,
    status: "IN_PROGRESS",
    progressPercent: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nodes: [],
  };
  items.push(newItem);
  console.log("[Mock] 创建项目:", dto.title);
}

// ==================== 任务模板 ====================

export async function mockGetTaskTemplateOptions(): Promise<TaskTemplateOptionVO[]> {
  await mockDelay(200);
  return mockTaskTemplateOptions;
}

export async function mockGetTaskTemplateDetail(templateId: number): Promise<TaskTemplateDetailVO> {
  await mockDelay(300);
  const detail = mockTaskTemplateDetails[templateId];
  if (!detail) {
    throw new Error("模板不存在");
  }
  return detail;
}

// ==================== 任务流 ====================

export async function mockGetTaskFlow(itemId: number): Promise<ItemTaskFlowVO> {
  await mockDelay(300);
  const flow = mockTaskFlows[itemId];
  if (!flow) {
    return {
      id: Date.now(),
      itemId,
      projectId: 1,
      taskTemplateId: 1,
      name: `项目${itemId}任务流`,
      nodes: [],
    };
  }
  return flow;
}

export async function mockCreateTaskFlow(itemId: number, taskTemplateId: number): Promise<void> {
  await mockDelay(500);
  const template = mockTaskTemplateDetails[taskTemplateId];
  if (!template) {
    throw new Error("模板不存在");
  }
  mockTaskFlows[itemId] = {
    id: Date.now(),
    itemId,
    projectId: 1,
    taskTemplateId,
    name: `项目${itemId}任务流`,
    nodes: template.nodes.map((n) => ({
      id: n.id,
      baseTaskId: n.baseTaskId,
      name: n.baseTaskName,
      sort: n.sort,
      parallelSort: n.parallelSort,
      taskStatus: "PENDING",
    })),
  };
  console.log("[Mock] 创建任务流，模板:", template.name);
}

// ==================== 任务实例 ====================

export async function mockGetTaskInstances(projectId: number | string): Promise<TaskInstanceVO[]> {
  await mockDelay(300);
  return mockTaskInstances[Number(projectId)] || [];
}

export async function mockClaimTask(instanceId: number): Promise<void> {
  await mockDelay(300);
  console.log("[Mock] 接取任务:", instanceId);
}

export async function mockAbandonTask(instanceId: number): Promise<void> {
  await mockDelay(300);
  console.log("[Mock] 放弃任务:", instanceId);
}

export async function mockSubmitTask(instanceId: number, dto: TaskSubmitDTO): Promise<void> {
  await mockDelay(500);
  console.log("[Mock] 提交任务:", instanceId, dto);
}

export async function mockRejectTask(instanceId: number, dto: TaskRejectDTO): Promise<void> {
  await mockDelay(500);
  console.log("[Mock] 打回任务:", instanceId, dto);
}

export async function mockResetTask(instanceId: number): Promise<void> {
  await mockDelay(300);
  console.log("[Mock] 重置任务:", instanceId);
}

// ==================== 提交记录 ====================

export async function mockGetTaskSubmissions(
  instanceId: number,
): Promise<PageResult<TaskSubmissionVO>> {
  await mockDelay(300);
  const list = mockTaskSubmissions[instanceId] || [];
  return {
    list,
    total: list.length,
    pageNum: 1,
    pageSize: list.length || 10,
    hasNext: false,
  };
}
