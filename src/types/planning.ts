// 企划相关类型定义
// 对应后端 API: /app/project/*, /app/task/*, /app/project/item/*

// ==================== 基础枚举 ====================

export type ProjectStatus =
  | "IN_PROGRESS"
  | "COMPLETED"
  | "ARCHIVED"
  | "进行中"
  | "已完成"
  | "已归档";

export type TaskInstanceStatus = "PENDING" | "CLAIMED" | "COMPLETED";

export type TaskNodeStatus = "PENDING" | "CLAIMED" | "COMPLETED" | null;

export type SubmissionStatus = "SUBMITTED" | "REJECTED" | "RESET";

export type EnableStatus = "ENABLED" | "DISABLED";

// ==================== 企划类型 ====================

export interface ProjectTypeInfoVO {
  id: string;
  name: string; // 类型名称（如：漫画/小说/美术/视频）
}

export interface ProjectInfoVO {
  id: number;
  title: string; // 企划标题
  description?: string; // 企划简介
  coverUrl?: string; // 封面图片URL
  projectType: string; // 企划类型
  projectStatus: ProjectStatus; // 企划状态
  metadata?: string; // 扩展信息(JSON字符串)
  creatorAvatarUrl?: string; // 创建人头像URL
}

export interface ProjectDetailInfoVO {
  id: number;
  title: string; // 企划主标题
  alias?: string; // 企划别名
  coverUrl?: string; // 封面图片URL
  typeName: string; // 企划类型名称
  metadata?: string; // 扩展信息(JSON字符串)
  description?: string; // 企划简介
  status: ProjectStatus; // 企划状态
  progressPercent: number; // 整体进度百分比（0-100）
  claimedTaskCount: number; // 待提交任务数
  pendingTaskCount: number; // 待接取任务数
  inWorkshop: boolean; // 当前用户是否已将该企划添加到工坊
  isCreator: boolean; // 当前用户是否是该企划的创建者
}

// ==================== 项目（企划下的具体项目）====================

export interface ProjectItemListVO {
  id: number;
  title: string; // 项目标题
  status: "IN_PROGRESS" | "COMPLETED" | "PUBLISHED";
  createdAt: string;
  updatedAt: string;
  progressPercent: number; // 进度百分比（0-100）
  currentNodeName?: string; // 当前节点名称
  nodes: ProjectItemNodeVO[]; // 节点列表
}

export interface ProjectItemNodeVO {
  name: string; // 节点名称
  sort: number; // 节点顺序（相同值表示并行组）
  parallelSort: number; // 并行组内排序
  state: "COMPLETED" | "IN_PROGRESS" | "LOCKED";
  parallelCount: number; // 并行子任务数量
}

// ==================== 任务模板 ====================

export interface TaskTemplateOptionVO {
  id: number;
  name: string; // 流程模板名称
}

export interface TaskTemplateListVO {
  id: number;
  name: string; // 模板名称
  description?: string; // 模板说明
  status: EnableStatus;
  refCount: number; // 引用次数
  creatorId: number;
  creatorNickname: string;
  createdAt: string;
}

export interface TaskTemplateDetailVO {
  id: number;
  name: string;
  description?: string;
  status: EnableStatus;
  refCount: number;
  creatorId: number;
  creatorNickname: string;
  createdAt: string;
  nodes: TaskTemplateNodeVO[];
}

export interface TaskTemplateNodeVO {
  id: number;
  baseTaskId: number;
  baseTaskName: string;
  baseTaskIconUrl?: string;
  metaSchema?: string; // 元数据字段定义(JSON数组)
  sort: number; // 步骤顺序（相同 sort 值表示并行节点）
  parallelSort: number; // 并行组内排序
}

// ==================== 原子任务 ====================

export interface BaseTaskVO {
  id: number;
  name: string; // 任务名称
  description?: string; // 任务说明
  iconUrl?: string; // 图标URL
  metaSchema?: string; // 元数据字段定义(JSON数组)
  refCount: number; // 引用次数
  status: EnableStatus;
  createdAt: string;
}

// ==================== 任务流（运行时）====================

export interface ItemTaskFlowVO {
  id: number;
  itemId: number;
  projectId: number;
  taskTemplateId: number;
  name: string;
  description?: string;
  nodes: ItemTaskNodeVO[];
}

export interface ItemTaskNodeVO {
  id: number;
  baseTaskId: number;
  name: string;
  metaSchema?: string; // 节点元数据字段定义快照(JSON数组)
  sort: number;
  parallelSort: number;
  taskStatus: TaskNodeStatus;
  assigneeId?: number;
  assigneeNickname?: string;
  assigneeAvatarUrl?: string;
}

// ==================== 任务实例 ====================

export interface TaskInstanceVO {
  id: number;
  itemId: number;
  projectId: number;
  itemTaskNodeId: number;
  baseTaskName: string;
  baseTaskDescription?: string;
  status: TaskInstanceStatus;
  assigneeId?: number;
  assigneeNickname?: string;
  assigneeAvatarUrl?: string;
  createdAt: string;
  submittedAt?: string;
}

// ==================== 提交记录 ====================

export interface TaskSubmissionVO {
  id: number;
  taskInstanceId: number;
  itemTaskNodeId: number;
  baseTaskName: string;
  status: SubmissionStatus;
  submitterId: number;
  submitterNickname: string;
  submitterAvatarUrl?: string;
  metadata?: string; // 提交元数据(JSON对象)
  reviewerId?: number;
  reviewerNickname?: string;
  reviewComment?: string; // 打回意见
  createdAt: string;
  reviewedAt?: string;
}

// ==================== DTO（请求参数）====================

export interface ProjectListDTO {
  keyword?: string;
  projectType?: string;
  pageNum?: number;
  pageSize?: number;
  sortByTime?: "CREATE" | "UPDATE";
  orderDir?: "DESC" | "ASC";
}

export interface ProjectCreateDTO {
  title: string;
  alias: string;
  typeId: string;
  metadata: string;
  description: string;
  coverFileId: string;
}

export interface ProjectUpdateDTO {
  title: string;
  alias: string;
  metadata: string;
  description: string;
  coverFileId?: string;
}

export interface ProjectItemCreateDTO {
  title: string;
  taskTemplateId: number;
}

export interface TaskSubmitDTO {
  metadata?: string; // 提交元数据(JSON对象)
}

export interface TaskRejectDTO {
  reviewComment: string; // 打回意见
}

// ==================== 通用分页 ====================

export interface PageResult<T> {
  list: T[];
  total: number;
  pageNum: number;
  pageSize: number;
  hasNext: boolean;
}

export interface ApiResult<T> {
  code: number;
  msg?: string;
  data?: T;
}

// ==================== MetaSchema 字段定义 ====================

export type MetaFieldType = "text" | "file" | "number" | "textarea" | "select";

export interface MetaFieldSchema {
  name: string;
  fieldType: MetaFieldType;
  required: boolean;
  options?: string[]; // select 类型使用
}
