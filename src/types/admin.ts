import type { OrganizationResourceStatus } from "@/types/organizationAdmin";

export interface AdminListDTO {
  pageNum?: number;
  pageSize?: number;
}

export interface AdminCreateDTO {
  username: string;
  password: string;
}

export interface AdminVO {
  id: string;
  username: string;
  role: string;
  createdAt?: string;
  lastLoginAt?: string;
}

export interface AdminOrganizationListDTO {
  orgName?: string;
  startCreateTime?: string;
  endCreateTime?: string;
  pageNum?: number;
  pageSize?: number;
  orderDir?: "DESC" | "ASC";
}

export interface AdminOrganizationVO {
  id: string;
  name: string;
  avatarUrl?: string;
  status: OrganizationResourceStatus;
  createdAt?: string;
}

export interface AdminPageResult<T> {
  list: T[];
  total: number;
}

export interface AdminInviteCodeVO {
  inviteCode?: string;
  expireAt?: string;
}

export interface ScheduledTaskVO {
  taskName: string;
  description?: string;
  cronExpression?: string;
  enabled: boolean;
}

export interface ScheduleTriggerDTO {
  executeTime?: string;
}
