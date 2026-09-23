export interface UserInfoVO {
  id: string;
  username: string;
  email: string;
  nickname: string;
  avatarUrl?: string;
  defaultOrgId?: string;
  roles?: string[];
}

export interface OrganizationSimpleInfoVO {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface UpdateMyInfoDTO {
  nickname: string;
  avatarFileId?: string;
}

export interface ChangePasswordDTO {
  oldPassword: string;
  newPassword: string;
}
