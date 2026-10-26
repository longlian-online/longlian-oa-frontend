import type { TaskFormField } from "./task";

export type OrganizationResourceStatus = "ENABLED" | "DISABLED";

export type OrganizationMemberRole = "ORG_OWNER" | "ORG_ADMIN" | "ORG_USER";

export interface OrganizationInfoVO {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  avatarFileId?: string;
}

export interface OrganizationUpdateDTO {
  avatarFileId: string;
  name: string;
  description: string;
}

export interface OrganizationMemberListDTO {
  pageNum?: number;
  pageSize?: number;
  keyword?: string;
  startJoinedTime?: string;
  endJoinedTime?: string;
  orderDir?: "DESC" | "ASC";
}

export interface OrganizationMemberVO {
  id: string;
  userId: string;
  username?: string;
  nickname?: string;
  avatarUrl?: string;
  orgRole?: OrganizationMemberRole;
  status: OrganizationResourceStatus;
  joinedAt?: string;
  lastSubmittedAt?: string;
  submitCount: number;
}

export interface MemberSubmitCountVO {
  baseTaskId: string;
  baseTaskName?: string;
  submitCount: number;
}

export interface MemberSubmitCountsVO {
  memberId: string;
  userId: string;
  totalSubmitCount: number;
  list: MemberSubmitCountVO[];
}

export interface JoinApplicationListDTO {
  pageNum?: number;
  pageSize?: number;
  keyword?: string;
  startApplyTime?: string;
  endApplyTime?: string;
  orderDir?: "DESC" | "ASC";
}

export interface JoinApplicationVO {
  id: string;
  userId: string;
  username?: string;
  nickname?: string;
  avatarUrl?: string;
  appliedAt?: string;
}

export type JoinApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface JoinApplicationReviewDTO {
  applicationStatus: JoinApplicationStatus;
  reviewRemark?: string;
}

export interface InviteCodeVO {
  inviteCode?: string;
  expireAt?: string;
}

export interface GenerateInviteCodeDTO {
  expiredAt: string;
}

export interface OrganizationPageResult<T> {
  list: T[];
  total: number;
}

export type DeletionTargetType = "PROJECT" | "ITEM";

export interface DeletionRequestVO {
  id: string;
  targetType: DeletionTargetType;
  targetId: string;
  projectId: string;
  title: string;
  reason: string;
  requesterName: string;
  createdAt?: string;
}

export interface DeletionRequestReviewDTO {
  status: "APPROVED" | "REJECTED";
}

export interface ProjectTypeListDTO {
  pageNum?: number;
  pageSize?: number;
  keyword?: string;
  orderDir?: "DESC" | "ASC";
}

export interface ProjectTypeCreateDTO {
  name: string;
  priority?: number;
}

export interface ProjectTypeUpdateDTO {
  name: string;
  priority?: number;
}

export interface ProjectTypeVO {
  id: string;
  name: string;
  priority: number;
  refCount: number;
  status: OrganizationResourceStatus;
  creatorId?: string;
  creatorNickname?: string;
  createdAt?: string;
}

export interface OrganizationPresetTagListDTO {
  pageNum?: number;
  pageSize?: number;
  keyword?: string;
  orderDir?: "DESC" | "ASC";
}

export interface OrganizationPresetTagWriteDTO {
  name: string;
  color?: string | null;
  priority?: number;
}

export interface OrganizationPresetTagVO {
  id: string;
  name: string;
  color?: string | null;
  priority: number;
}

export interface OrganizationProjectListDTO {
  pageNum?: number;
  pageSize?: number;
  keyword?: string;
  typeId?: string;
  startCreatedTime?: string;
  endCreatedTime?: string;
  orderDir?: "DESC" | "ASC";
}

export type OrganizationProjectStatus = "进行中" | "已完成" | "已归档";

export interface OrganizationProjectVO {
  id: string;
  title?: string;
  typeId?: string;
  typeName?: string;
  status?: OrganizationProjectStatus;
  resourceStatus?: OrganizationResourceStatus;
  creatorId?: string;
  creatorNickname?: string;
  createdAt?: string;
}

export interface OrganizationBaseTaskCreateDTO {
  name: string;
  description?: string;
  icon?: string;
  submitFields: TaskFormField[];
}

export interface OrganizationBaseTaskListDTO {
  pageNum?: number;
  pageSize?: number;
  keyword?: string;
  status?: OrganizationResourceStatus;
  startCreatedTime?: string;
  endCreatedTime?: string;
  sortBy?: "CREATED_AT" | "REF_COUNT";
  orderDir?: "DESC" | "ASC";
}

export interface OrganizationBaseTaskVO {
  id: string;
  name?: string;
  description?: string;
  icon?: string;
  submitFields: TaskFormField[];
  refCount: number;
  status: OrganizationResourceStatus;
  createdAt?: string;
}

export interface OrganizationTaskTemplateNodeDTO {
  baseTaskId: string;
  sort: number;
  parallelSort?: number;
}

export interface OrganizationTaskTemplateCreateDTO {
  name: string;
  description?: string;
  nodes: OrganizationTaskTemplateNodeDTO[];
}

export interface OrganizationTaskTemplateListDTO {
  pageNum?: number;
  pageSize?: number;
  keyword?: string;
  status?: OrganizationResourceStatus;
  startCreatedTime?: string;
  endCreatedTime?: string;
  sortBy?: "CREATED_AT" | "REF_COUNT";
  orderDir?: "DESC" | "ASC";
}

export interface OrganizationTaskTemplatePreviewNodeVO {
  baseTaskId?: string;
  baseTaskName?: string;
  baseTaskIcon?: string;
  sort?: number;
  parallelSort?: number;
}

export interface OrganizationTaskTemplateNodeVO extends OrganizationTaskTemplatePreviewNodeVO {
  id?: string;
  submitFields: TaskFormField[];
}

export interface OrganizationTaskTemplateVO {
  id: string;
  name?: string;
  description?: string;
  creatorId?: string;
  creatorNickname?: string;
  refCount: number;
  status: OrganizationResourceStatus;
  createdAt?: string;
  taskCount: number;
  nodes: OrganizationTaskTemplatePreviewNodeVO[];
}

export interface OrganizationTaskTemplateDetailVO extends Omit<
  OrganizationTaskTemplateVO,
  "nodes" | "taskCount"
> {
  nodes: OrganizationTaskTemplateNodeVO[];
}
