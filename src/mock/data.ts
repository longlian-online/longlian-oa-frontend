// Mock 数据

import type {
  ProjectInfoVO,
  ProjectDetailInfoVO,
  ProjectItemListVO,
  ItemTaskFlowVO,
  TaskInstanceVO,
  TaskSubmissionVO,
  TaskTemplateOptionVO,
  TaskTemplateDetailVO,
  ProjectTypeInfoVO,
  ProjectItemNodeVO,
} from "@/types/planning";
import type { AdminLoginVO, LoginVO } from "@/types/auth";
import type { UserInfoVO } from "@/types/user";

// 当前登录用户
export const mockCurrentUser: LoginVO = {
  userId: "1",
  currentOrgId: "1",
  token: "mock_token_12345",
  roles: ["USER", "ADMIN"],
};

export const mockCurrentUserInfo: UserInfoVO = {
  id: "1",
  username: "admin",
  email: "admin@example.com",
  nickname: "管理员",
  avatarUrl: "https://picsum.photos/seed/admin/100/100",
  defaultOrgId: "1",
  roles: ["USER", "ADMIN"],
};

export const mockAdminUser: AdminLoginVO = {
  adminId: "1001",
  username: "superadmin",
  role: "SUPER_ADMIN",
  token: "mock_admin_token_12345",
};

// 企划类型
export const mockProjectTypes: ProjectTypeInfoVO[] = [
  { id: 1, name: "漫画" },
  { id: 2, name: "小说" },
  { id: 3, name: "美术" },
  { id: 4, name: "视频" },
];

// 企划列表
export const mockProjects: ProjectInfoVO[] = [
  {
    id: 1,
    title: "《鬼灭之刃》漫画汉化",
    description: "鬼灭之刃第1-100话汉化企划",
    coverUrl: "https://picsum.photos/seed/demon/300/200",
    projectType: "漫画",
    projectStatus: "IN_PROGRESS",
    creatorAvatarUrl: "https://picsum.photos/seed/user1/100/100",
  },
  {
    id: 2,
    title: "《间谍过家家》第2季",
    description: "间谍过家家第二季全集汉化",
    coverUrl: "https://picsum.photos/seed/spy/300/200",
    projectType: "视频",
    projectStatus: "IN_PROGRESS",
    creatorAvatarUrl: "https://picsum.photos/seed/user2/100/100",
  },
  {
    id: 3,
    title: "《葬送的芙莉莲》小说",
    description: "葬送的芙莉莲轻小说汉化",
    coverUrl: "https://picsum.photos/seed/frieren/300/200",
    projectType: "小说",
    projectStatus: "COMPLETED",
    creatorAvatarUrl: "https://picsum.photos/seed/user3/100/100",
  },
];

// 企划详情
export const mockProjectDetails: Record<number, ProjectDetailInfoVO> = {
  1: {
    id: 1,
    title: "《鬼灭之刃》漫画汉化",
    alias: "鬼灭汉化",
    coverUrl: "https://picsum.photos/seed/demon/400/300",
    typeName: "漫画",
    description: "鬼灭之刃第1-100话汉化企划",
    status: "IN_PROGRESS",
    progressPercent: 65,
    claimedTaskCount: 12,
    pendingTaskCount: 8,
    inWorkshop: true,
    isCreator: false,
  },
  2: {
    id: 2,
    title: "《间谍过家家》第2季",
    alias: "间谍过家家S2",
    coverUrl: "https://picsum.photos/seed/spy/400/300",
    typeName: "视频",
    description: "间谍过家家第二季",
    status: "IN_PROGRESS",
    progressPercent: 40,
    claimedTaskCount: 5,
    pendingTaskCount: 15,
    inWorkshop: true,
    isCreator: false,
  },
};

// 帮助函数创建项目节点
function createNodes(status: string): ProjectItemNodeVO[] {
  const states: Record<string, Array<"COMPLETED" | "IN_PROGRESS" | "LOCKED">> = {
    COMPLETED: ["COMPLETED", "COMPLETED", "COMPLETED"],
    IN_PROGRESS: ["COMPLETED", "IN_PROGRESS", "LOCKED"],
    PUBLISHED: ["COMPLETED", "COMPLETED", "COMPLETED"],
  };
  const nodeStates = states[status] || ["LOCKED", "LOCKED", "LOCKED"];
  return [
    {
      name: "翻译",
      sort: 1,
      parallelSort: 1,
      state: nodeStates[0],
      parallelCount: 1,
    },
    {
      name: "校对",
      sort: 2,
      parallelSort: 1,
      state: nodeStates[1],
      parallelCount: 1,
    },
    {
      name: "嵌字",
      sort: 3,
      parallelSort: 1,
      state: nodeStates[2],
      parallelCount: 1,
    },
  ];
}

// 项目列表
export const mockProjectItems: Record<number, ProjectItemListVO[]> = {
  1: [
    {
      id: 101,
      title: "第1话",
      status: "COMPLETED",
      progressPercent: 100,
      createdAt: "2024-01-01T00:00:00",
      updatedAt: "2024-01-05T00:00:00",
      nodes: createNodes("COMPLETED"),
    },
    {
      id: 102,
      title: "第2话",
      status: "COMPLETED",
      progressPercent: 100,
      createdAt: "2024-01-06T00:00:00",
      updatedAt: "2024-01-10T00:00:00",
      nodes: createNodes("COMPLETED"),
    },
    {
      id: 103,
      title: "第3话",
      status: "IN_PROGRESS",
      progressPercent: 80,
      createdAt: "2024-01-11T00:00:00",
      updatedAt: "2024-01-15T00:00:00",
      currentNodeName: "嵌字",
      nodes: createNodes("IN_PROGRESS"),
    },
  ],
  2: [
    {
      id: 201,
      title: "第1集",
      status: "COMPLETED",
      progressPercent: 100,
      createdAt: "2024-01-01T00:00:00",
      updatedAt: "2024-01-05T00:00:00",
      nodes: createNodes("COMPLETED"),
    },
    {
      id: 202,
      title: "第2集",
      status: "IN_PROGRESS",
      progressPercent: 60,
      createdAt: "2024-01-06T00:00:00",
      updatedAt: "2024-01-12T00:00:00",
      currentNodeName: "时轴",
      nodes: createNodes("IN_PROGRESS"),
    },
  ],
};

// 任务模板选项
export const mockTaskTemplateOptions: TaskTemplateOptionVO[] = [
  { id: 1, name: "标准漫画汉化流程" },
  { id: 2, name: "视频字幕制作流程" },
];

// 任务模板详情
export const mockTaskTemplateDetails: Record<number, TaskTemplateDetailVO> = {
  1: {
    id: 1,
    name: "标准漫画汉化流程",
    description: "适用于大多数漫画汉化项目",
    status: "ENABLED",
    refCount: 10,
    creatorId: 1,
    creatorNickname: "管理员",
    createdAt: "2024-01-01T00:00:00",
    nodes: [
      {
        id: 11,
        baseTaskId: 101,
        baseTaskName: "翻译",
        metaSchema: JSON.stringify([{ name: "翻译文本", fieldType: "textarea", required: true }]),
        sort: 1,
        parallelSort: 1,
      },
      {
        id: 12,
        baseTaskId: 102,
        baseTaskName: "校对",
        metaSchema: JSON.stringify([{ name: "校对意见", fieldType: "textarea", required: true }]),
        sort: 2,
        parallelSort: 1,
      },
      {
        id: 13,
        baseTaskId: 103,
        baseTaskName: "嵌字",
        metaSchema: JSON.stringify([{ name: "嵌字文件", fieldType: "file", required: true }]),
        sort: 3,
        parallelSort: 1,
      },
    ],
  },
};

// 任务流
export const mockTaskFlows: Record<number, ItemTaskFlowVO> = {
  101: {
    id: 1001,
    itemId: 101,
    projectId: 1,
    taskTemplateId: 1,
    name: "第1话任务流",
    nodes: [
      {
        id: 1011,
        baseTaskId: 101,
        name: "翻译",
        sort: 1,
        parallelSort: 1,
        taskStatus: "COMPLETED",
        assigneeId: 2,
        assigneeNickname: "翻译大佬",
      },
      {
        id: 1012,
        baseTaskId: 102,
        name: "校对",
        sort: 2,
        parallelSort: 1,
        taskStatus: "COMPLETED",
        assigneeId: 3,
        assigneeNickname: "校对君",
      },
      {
        id: 1013,
        baseTaskId: 103,
        name: "嵌字",
        sort: 3,
        parallelSort: 1,
        taskStatus: "COMPLETED",
        assigneeId: 4,
        assigneeNickname: "嵌字王",
      },
    ],
  },
  103: {
    id: 1003,
    itemId: 103,
    projectId: 1,
    taskTemplateId: 1,
    name: "第3话任务流",
    nodes: [
      {
        id: 1031,
        baseTaskId: 101,
        name: "翻译",
        sort: 1,
        parallelSort: 1,
        taskStatus: "COMPLETED",
        assigneeId: 2,
        assigneeNickname: "翻译大佬",
      },
      {
        id: 1032,
        baseTaskId: 102,
        name: "校对",
        sort: 2,
        parallelSort: 1,
        taskStatus: "COMPLETED",
        assigneeId: 3,
        assigneeNickname: "校对君",
      },
      {
        id: 1033,
        baseTaskId: 103,
        name: "嵌字",
        sort: 3,
        parallelSort: 1,
        taskStatus: "CLAIMED",
        assigneeId: 5,
        assigneeNickname: "新人嵌字",
      },
    ],
  },
};

// 任务实例
export const mockTaskInstances: Record<number, TaskInstanceVO[]> = {
  1: [
    {
      id: 10011,
      itemId: 101,
      projectId: 1,
      itemTaskNodeId: 1011,
      baseTaskName: "翻译",
      status: "COMPLETED",
      assigneeId: 2,
      assigneeNickname: "翻译大佬",
      createdAt: "2024-01-10T09:00:00",
      submittedAt: "2024-01-10T18:00:00",
    },
    {
      id: 10031,
      itemId: 103,
      projectId: 1,
      itemTaskNodeId: 1031,
      baseTaskName: "翻译",
      status: "COMPLETED",
      assigneeId: 3,
      assigneeNickname: "翻译A",
      createdAt: "2024-01-14T10:00:00",
      submittedAt: "2024-01-14T20:00:00",
    },
    {
      id: 10032,
      itemId: 103,
      projectId: 1,
      itemTaskNodeId: 1033,
      baseTaskName: "嵌字",
      status: "CLAIMED",
      assigneeId: 5,
      assigneeNickname: "新人嵌字",
      createdAt: "2024-01-15T09:00:00",
    },
  ],
};

// 提交记录
export const mockTaskSubmissions: Record<number, TaskSubmissionVO[]> = {
  10011: [
    {
      id: 5001,
      taskInstanceId: 10011,
      itemTaskNodeId: 1011,
      baseTaskName: "翻译",
      status: "SUBMITTED",
      submitterId: 2,
      submitterNickname: "翻译大佬",
      submitterAvatarUrl: "https://picsum.photos/seed/user2/100/100",
      metadata: JSON.stringify({ 翻译文本: "这是翻译好的文本" }),
      createdAt: "2024-01-10T18:00:00",
    },
  ],
  10031: [
    {
      id: 5002,
      taskInstanceId: 10031,
      itemTaskNodeId: 1031,
      baseTaskName: "翻译",
      status: "SUBMITTED",
      submitterId: 3,
      submitterNickname: "翻译A",
      submitterAvatarUrl: "https://picsum.photos/seed/user3/100/100",
      metadata: JSON.stringify({ 翻译文本: "第3话内容" }),
      createdAt: "2024-01-14T20:00:00",
    },
  ],
};

// 模拟延迟
export const mockDelay = (ms: number = 300) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
