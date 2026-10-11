import { orgAdminRequest } from "@/api/request";
import { invalidateUserOrganizationsCache } from "@/api/user";
import type {
  InviteCodeVO,
  JoinApplicationListDTO,
  JoinApplicationReviewDTO,
  JoinApplicationVO,
  MemberSubmitCountsVO,
  OrganizationBaseTaskCreateDTO,
  OrganizationBaseTaskListDTO,
  OrganizationBaseTaskVO,
  OrganizationInfoVO,
  OrganizationMemberListDTO,
  OrganizationMemberVO,
  OrganizationPageResult,
  OrganizationProjectListDTO,
  OrganizationProjectVO,
  OrganizationResourceStatus,
  OrganizationTaskTemplateCreateDTO,
  OrganizationTaskTemplateDetailVO,
  OrganizationTaskTemplateListDTO,
  OrganizationTaskTemplateVO,
  OrganizationUpdateDTO,
  ProjectTypeCreateDTO,
  ProjectTypeListDTO,
  ProjectTypeUpdateDTO,
  ProjectTypeVO,
} from "@/types/organizationAdmin";

export type { OrganizationResourceStatus } from "@/types/organizationAdmin";

function withQuery(path: string, params: Record<string, string | number | undefined>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  });
  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}

export async function getOrganizationInfo(): Promise<OrganizationInfoVO> {
  return orgAdminRequest("/orgadmin/organizations");
}

export async function updateOrganizationInfo(dto: OrganizationUpdateDTO): Promise<void> {
  await orgAdminRequest("/orgadmin/organizations", {
    method: "PUT",
    body: JSON.stringify(dto),
  });
  invalidateUserOrganizationsCache();
}

export async function getOrganizationMembers(
  dto: OrganizationMemberListDTO,
): Promise<OrganizationPageResult<OrganizationMemberVO>> {
  return orgAdminRequest("/orgadmin/members", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export async function changeMemberStatus(
  memberId: string,
  status: OrganizationResourceStatus,
): Promise<void> {
  return orgAdminRequest(`/orgadmin/members/${memberId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function getMemberSubmitCounts(memberId: string): Promise<MemberSubmitCountsVO> {
  return orgAdminRequest(`/orgadmin/members/${memberId}/base-tasks/submit-counts`);
}

export async function getJoinApplications(
  dto: JoinApplicationListDTO,
): Promise<OrganizationPageResult<JoinApplicationVO>> {
  return orgAdminRequest("/orgadmin/members/applications", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export async function reviewJoinApplication(
  applicationId: string,
  dto: JoinApplicationReviewDTO,
): Promise<void> {
  return orgAdminRequest(`/orgadmin/members/applications/${applicationId}/review`, {
    method: "PUT",
    body: JSON.stringify(dto),
  });
}

export async function createJoinInviteCode(): Promise<InviteCodeVO> {
  return orgAdminRequest("/orgadmin/members/invite-codes/join-org", {
    method: "POST",
  });
}

export async function getOrganizationProjectTypes(
  dto: ProjectTypeListDTO,
): Promise<OrganizationPageResult<ProjectTypeVO>> {
  return orgAdminRequest(
    withQuery("/orgadmin/project-types", {
      keyword: dto.keyword,
      pageNum: dto.pageNum,
      pageSize: dto.pageSize,
      orderDir: dto.orderDir,
    }),
  );
}

export async function createOrganizationProjectType(dto: ProjectTypeCreateDTO): Promise<void> {
  return orgAdminRequest("/orgadmin/project-types", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export async function updateOrganizationProjectType(
  typeId: string,
  dto: ProjectTypeUpdateDTO,
): Promise<void> {
  return orgAdminRequest(`/orgadmin/project-types/${typeId}`, {
    method: "PUT",
    body: JSON.stringify(dto),
  });
}

export async function deleteOrganizationProjectType(typeId: string): Promise<void> {
  return orgAdminRequest(`/orgadmin/project-types/${typeId}`, {
    method: "DELETE",
  });
}

export async function changeProjectTypeStatus(
  typeId: string,
  status: OrganizationResourceStatus,
): Promise<void> {
  return orgAdminRequest(`/orgadmin/project-types/${typeId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function getOrganizationProjects(
  dto: OrganizationProjectListDTO,
): Promise<OrganizationPageResult<OrganizationProjectVO>> {
  return orgAdminRequest("/orgadmin/projects", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export type OrgMemberRole = "ORG_ADMIN" | "ORG_USER";

export async function changeMemberRole(memberId: string, orgRole: OrgMemberRole): Promise<void> {
  return orgAdminRequest(`/orgadmin/members/${memberId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ orgRole }),
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

export async function createOrganizationBaseTask(
  dto: OrganizationBaseTaskCreateDTO,
): Promise<void> {
  return orgAdminRequest("/orgadmin/task/base", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export async function getOrganizationBaseTaskList(
  dto: OrganizationBaseTaskListDTO,
): Promise<OrganizationPageResult<OrganizationBaseTaskVO>> {
  return orgAdminRequest("/orgadmin/task/base/list", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export async function changeBaseTaskStatus(
  taskId: string,
  status: OrganizationResourceStatus,
): Promise<void> {
  return orgAdminRequest(`/orgadmin/task/base/${taskId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export const changeOrganizationBaseTaskStatus = changeBaseTaskStatus;

export async function createOrganizationTaskTemplate(
  dto: OrganizationTaskTemplateCreateDTO,
): Promise<void> {
  return orgAdminRequest("/orgadmin/task/template", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export async function getOrganizationTaskTemplateList(
  dto: OrganizationTaskTemplateListDTO,
): Promise<OrganizationPageResult<OrganizationTaskTemplateVO>> {
  return orgAdminRequest("/orgadmin/task/template/list", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export async function getOrganizationTaskTemplate(
  templateId: string,
): Promise<OrganizationTaskTemplateDetailVO> {
  return orgAdminRequest(`/orgadmin/task/template/${templateId}`);
}

export async function updateOrganizationTaskTemplate(
  templateId: string,
  dto: OrganizationTaskTemplateCreateDTO,
): Promise<void> {
  return orgAdminRequest(`/orgadmin/task/template/${templateId}`, {
    method: "PUT",
    body: JSON.stringify(dto),
  });
}
