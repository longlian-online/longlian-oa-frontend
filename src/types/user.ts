export interface UserInfoVO {
  id: string;
  username: string;
  email: string;
  nickname: string;
  avatarUrl?: string;
  defaultOrgId?: string;
  roles?: string[];
}

export interface UpdateMyInfoDTO {
  nickname: string;
  avatarFileId?: string;
}
