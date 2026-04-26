// 认证相关 API

import type { ApiResult, LoginVO } from "@/types/planning";

const API_BASE = "/app";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const result: ApiResult<T> = await response.json();

  if (result.code !== 2000) {
    throw new Error(result.msg || `API error: ${result.code}`);
  }

  return result.data as T;
}

export interface LoginByPwdDTO {
  username: string;
  password: string;
}

export interface LoginByCodeDTO {
  email: string;
  code: string;
}

/**
 * 密码登录
 * POST /app/user/login/pwd
 */
export async function loginByPassword(dto: LoginByPwdDTO): Promise<LoginVO> {
  return request("/user/login/pwd", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

/**
 * 验证码登录
 * POST /app/user/login/code
 */
export async function loginByCode(dto: LoginByCodeDTO): Promise<LoginVO> {
  return request("/user/login/code", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

/**
 * 发送邮箱验证码
 * GET /app/user/send-code?email=xxx
 */
export async function sendVerificationCode(email: string): Promise<void> {
  return request(`/user/send-code?email=${encodeURIComponent(email)}`, {
    method: "GET",
  });
}

export interface RegisterByInviteDTO {
  inviteToken: string;
  username: string;
  password: string;
  confirmPassword: string;
  nickname: string;
  email: string;
  code: string;
  orgName?: string;
}

/**
 * 通过邀请链接注册
 * POST /app/user/register/invite
 */
export async function registerByInvite(dto: RegisterByInviteDTO): Promise<void> {
  return request("/user/register/invite", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}
