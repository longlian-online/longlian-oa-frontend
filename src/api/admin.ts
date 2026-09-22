import { adminRequest } from "@/api/request";
import type {
  AdminCreateDTO,
  AdminInviteCodeVO,
  AdminListDTO,
  AdminOrganizationListDTO,
  AdminOrganizationVO,
  AdminPageResult,
  AdminVO,
  ScheduleTriggerDTO,
  ScheduledTaskVO,
} from "@/types/admin";
import type { OrganizationResourceStatus } from "@/types/organizationAdmin";

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

export async function getAdminList(dto: AdminListDTO): Promise<AdminPageResult<AdminVO>> {
  return adminRequest(
    withQuery("/admin/admins/", {
      pageNum: dto.pageNum,
      pageSize: dto.pageSize,
    }),
  );
}

export async function createAdmin(dto: AdminCreateDTO): Promise<string> {
  return adminRequest("/admin/admins/", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export async function deleteAdmin(adminId: string): Promise<void> {
  return adminRequest(`/admin/admins/${adminId}`, {
    method: "DELETE",
  });
}

export async function getAdminOrganizations(
  dto: AdminOrganizationListDTO,
): Promise<AdminPageResult<AdminOrganizationVO>> {
  return adminRequest(
    withQuery("/admin/organizations/", {
      orgName: dto.orgName,
      startCreateTime: dto.startCreateTime,
      endCreateTime: dto.endCreateTime,
      pageNum: dto.pageNum,
      pageSize: dto.pageSize,
      orderDir: dto.orderDir,
    }),
  );
}

export async function changeAdminOrganizationStatus(
  orgId: string,
  status: OrganizationResourceStatus,
): Promise<void> {
  return adminRequest(`/admin/organizations/${orgId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function createOrganizationInviteCode(): Promise<AdminInviteCodeVO> {
  return adminRequest("/admin/organizations/invite-codes/create-org", {
    method: "POST",
  });
}

export async function getScheduledTasks(): Promise<ScheduledTaskVO[]> {
  return adminRequest("/admin/scheduled-tasks/");
}

export async function triggerScheduledTask(
  taskName: string,
  dto: ScheduleTriggerDTO = {},
): Promise<void> {
  return adminRequest(`/admin/scheduled-tasks/${encodeURIComponent(taskName)}/trigger`, {
    method: "POST",
    body: JSON.stringify(dto),
  });
}
