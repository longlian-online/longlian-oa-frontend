export type EmailCodeBusinessType = "LOGIN" | "REGISTER" | "FORGOT_PASSWORD";

export interface LoginByPwdDTO {
  username: string;
  password: string;
}

export interface LoginByCodeDTO {
  email: string;
  code: string;
}

export interface LoginVO {
  userId: string;
  currentOrgId: string;
  token: string;
  roles: string[];
}

export interface EmailCodeDTO {
  email: string;
  businessType: EmailCodeBusinessType;
}

export interface RegisterByInviteDTO {
  inviteCode: string;
  username: string;
  password: string;
  nickname: string;
  email: string;
  code: string;
  orgName?: string;
}

export interface InviteInfoVO {
  orgId: string;
  orgName: string;
}

export interface JoinByInviteCodeDTO {
  inviteCode: string;
}

export interface AdminLoginDTO {
  username: string;
  password: string;
}

export interface AdminLoginVO {
  adminId: string;
  username: string;
  role: string;
  token: string;
}
