import { adminRequest, request } from "@/api/request";
import type {
  AdminLoginDTO,
  AdminLoginVO,
  EmailCodeDTO,
  LoginByCodeDTO,
  LoginByPwdDTO,
  LoginVO,
  RegisterByInviteDTO,
} from "@/types/auth";

/**
 * 密码登录
 * POST /app/session/pwd
 */
export async function loginByPassword(dto: LoginByPwdDTO): Promise<LoginVO> {
  return request("/session/pwd", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

/**
 * 验证码登录
 * POST /app/session/email
 */
export async function loginByCode(dto: LoginByCodeDTO): Promise<LoginVO> {
  return request("/session/email", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

/**
 * 发送邮箱验证码
 * POST /app/session/email/code
 */
export async function sendVerificationCode(dto: EmailCodeDTO): Promise<void> {
  return request("/session/email/code", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export async function registerJoinOrganization(dto: RegisterByInviteDTO): Promise<void> {
  return request("/user/register/join-organization", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export async function registerCreateOrganization(dto: RegisterByInviteDTO): Promise<void> {
  return request("/user/register/create-organization", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export async function logout(): Promise<void> {
  return request("/session/", {
    method: "DELETE",
  });
}

export async function adminLogin(dto: AdminLoginDTO): Promise<AdminLoginVO> {
  return adminRequest("/admin/session", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export async function adminLogout(): Promise<void> {
  return adminRequest("/admin/session", {
    method: "DELETE",
  });
}
