import { orgAdminRequest } from "@/api/request";

export type OrganizationResourceStatus = "ENABLED" | "DISABLED";

export type OrgMemberRole = "ORG_ADMIN" | "ORG_USER";

export interface OrgMemberListDTO {
  pageNum: number;
  pageSize: number;
  keyword?: string;
}

export interface OrgMemberInfoVO {
  id: string;
  userId: string;
  nickname: string;
  username: string;
  avatarUrl?: string;
  joinedAt?: string;
  orgRole: OrgMemberRole;
  status: "ENABLED" | "DISABLED";
}

export interface OrgMemberListResult {
  list: OrgMemberInfoVO[];
  total: number;
}

export interface OrgMemberResetPasswordVO {
  password: string;
}

export async function getOrgMemberList(dto: OrgMemberListDTO): Promise<OrgMemberListResult> {
  return orgAdminRequest("/orgadmin/members", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export async function changeMemberRole(memberId: string, orgRole: OrgMemberRole): Promise<void> {
  return orgAdminRequest(`/orgadmin/members/${memberId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ orgRole }),
  });
}

export async function resetMemberPassword(memberId: string): Promise<OrgMemberResetPasswordVO> {
  return orgAdminRequest(`/orgadmin/members/${memberId}/password/reset`, {
    method: "POST",
  });
}

export async function changeProjectStatus(
  projectId: string,
  status: OrganizationResourceStatus,
): Promise<void> {
  return orgAdminRequest(`/orgadmin/projects/${projectId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function changeTaskTemplateStatus(
  templateId: string,
  status: OrganizationResourceStatus,
): Promise<void> {
  return orgAdminRequest(`/orgadmin/task/template/${templateId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
