import { request } from "@/api/request";
import type { JoinByInviteCodeDTO, InviteInfoVO } from "@/types/auth";
import type { UserInfoVO } from "@/types/user";

let currentUserRequest: Promise<UserInfoVO> | null = null;

export async function getCurrentUser(): Promise<UserInfoVO> {
  currentUserRequest ??= request<UserInfoVO>("/user/").finally(() => {
    currentUserRequest = null;
  });
  return currentUserRequest;
}

export async function getInviteInfo(inviteCode: string): Promise<InviteInfoVO> {
  return request(
    `/user/register/join-organization/invite-info?inviteCode=${encodeURIComponent(inviteCode)}`,
  );
}

export async function joinOrganizationByInvite(dto: JoinByInviteCodeDTO): Promise<void> {
  return request("/user/organizations/join-by-invite", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}
