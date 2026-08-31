import { orgAdminRequest } from "@/api/request";

export type OrganizationResourceStatus = "ENABLED" | "DISABLED";

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
