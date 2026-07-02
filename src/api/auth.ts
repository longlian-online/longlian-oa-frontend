import {
  USE_MOCK,
  mockLoginByPassword,
  mockLoginByCode,
  mockSendVerificationCode,
  mockRegisterCreateOrganization,
  mockRegisterJoinOrganization,
  mockLogout,
} from "@/mock";
import { request } from "@/api/request";
import type {
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
  if (USE_MOCK) {
    return mockLoginByPassword(dto);
  }
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
  if (USE_MOCK) {
    return mockLoginByCode(dto);
  }
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
  if (USE_MOCK) {
    return mockSendVerificationCode(dto);
  }
  return request("/session/email/code", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export async function registerJoinOrganization(dto: RegisterByInviteDTO): Promise<void> {
  if (USE_MOCK) {
    return mockRegisterJoinOrganization(dto);
  }
  return request("/user/register/join-organization", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export async function registerCreateOrganization(dto: RegisterByInviteDTO): Promise<void> {
  if (USE_MOCK) {
    return mockRegisterCreateOrganization(dto);
  }
  return request("/user/register/create-organization", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export async function logout(): Promise<void> {
  if (USE_MOCK) {
    return mockLogout();
  }
  return request("/session/", {
    method: "DELETE",
  });
}
