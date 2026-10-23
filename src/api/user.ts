import { request } from "@/api/request";

import type { JoinByInviteCodeDTO, InviteInfoVO } from "@/types/auth";
import type {
  BindEmailDTO,
  EmailNotificationsVO,
  ChangePasswordDTO,
  OrganizationSimpleInfoVO,
  OrgIdDTO,
  UpdateMyInfoDTO,
  UpdateEmailNotificationsDTO,
  UserInfoVO,
  UserOrgSwitchVO,
} from "@/types/user";

export async function getCurrentUser(): Promise<UserInfoVO> {
  return request("/user/");
}

export async function getEmailNotifications(): Promise<EmailNotificationsVO> {
  return request("/user/config/email-notifications");
}

export async function updateEmailNotifications(dto: UpdateEmailNotificationsDTO): Promise<void> {
  await request("/user/config/email-notifications", {
    method: "PUT",
    body: JSON.stringify(dto),
  });
}

export async function getUserOrganizations(): Promise<OrganizationSimpleInfoVO[]> {
  return request("/user/organizations");
}

export async function switchOrganization(dto: OrgIdDTO): Promise<UserOrgSwitchVO> {
  const organization = await request<UserOrgSwitchVO>("/user/switch", {
    method: "POST",
    body: JSON.stringify(dto),
  });
  return organization;
}

export async function updateMyInfo(dto: UpdateMyInfoDTO): Promise<void> {
  await request("/user/", {
    method: "PUT",
    body: JSON.stringify(dto),
  });
}

export async function changePassword(dto: ChangePasswordDTO): Promise<void> {
  await request("/user/password", {
    method: "PATCH",
    body: JSON.stringify(dto),
  });
}

export async function bindEmail(dto: BindEmailDTO): Promise<void> {
  await request("/user/email", {
    method: "PUT",
    body: JSON.stringify(dto),
  });
}

export async function getInviteInfo(inviteCode: string): Promise<InviteInfoVO> {
  return request(
    `/user/register/join-organization/invite-info?inviteCode=${encodeURIComponent(inviteCode)}`,
  );
}

export async function joinOrganizationByInvite(dto: JoinByInviteCodeDTO): Promise<void> {
  await request("/user/organizations/join-by-invite", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}
