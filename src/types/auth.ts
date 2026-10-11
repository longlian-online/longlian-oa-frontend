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
  /** 已保存的默认组织。不参与鉴权，只作为客户端下次声明的组织。 */
  defaultOrgId?: string | null;
  token: string;
  /** 默认组织内的角色，仅供展示。默认组织不可用时为空。 */
  role?: string | null;
}

export interface EmailCodeDTO {
  email: string;
  businessType: EmailCodeBusinessType;
}

export interface ResetPasswordDTO {
  email: string;
  code: string;
  password: string;
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
