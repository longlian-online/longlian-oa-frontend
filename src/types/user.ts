export interface UserInfoVO {
  id: string;
  username: string;
  email: string;
  nickname: string;
  avatarUrl?: string;
  defaultOrgId?: string;
  roles?: string[];
}
