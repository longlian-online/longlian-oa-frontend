export type OrganizationResourceStatus = "ENABLED" | "DISABLED";

export type OrganizationMemberRole = "ORG_ADMIN" | "ORG_USER";

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

export interface OrganizationPageResult<T> {
  list: T[];
  total: number;
}

export interface ProjectTypeListDTO {
  pageNum?: number;
  pageSize?: number;
  keyword?: string;
  orderDir?: "DESC" | "ASC";
}

export interface ProjectTypeCreateDTO {
  name: string;
}

export interface ProjectTypeUpdateDTO {
  name: string;
}

export interface ProjectTypeVO {
  id: string;
  name: string;
  status: OrganizationResourceStatus;
  creatorId?: string;
  creatorNickname?: string;
  createdAt?: string;
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
  creatorId?: string;
  creatorNickname?: string;
  createdAt?: string;
}

export interface OrganizationBaseTaskCreateDTO {
  name: string;
  description?: string;
  iconFileId?: string;
  iconName?: string;
  metaSchema?: string;
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
  iconName?: string;
  iconUrl?: string;
  metaSchema?: string;
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

export interface OrganizationTaskTemplateNodeVO {
  id?: string;
  baseTaskId?: string;
  baseTaskName?: string;
  baseTaskIconName?: string;
  baseTaskIconUrl?: string;
  metaSchema?: string;
  sort?: number;
  parallelSort?: number;
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
}

export interface OrganizationTaskTemplateDetailVO extends OrganizationTaskTemplateVO {
  nodes: OrganizationTaskTemplateNodeVO[];
}
