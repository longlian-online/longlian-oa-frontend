import { adminRequest, commonRequest } from "@/api/request";
import { ApiError } from "@/api/apiError";
import { loadCaptchaClient } from "@/lib/captchaClient";
import type { CaptchaAction, CaptchaConfigVO } from "@/types/captcha";

export const CAPTCHA_ERROR_MESSAGES = {
  required: "请完成人机验证",
  invalid: "人机验证未通过，请重试",
  unavailable: "人机验证暂时不可用，请稍后重试",
} as const;

export function captchaMessage(code: number): string | null {
  if (code === 9) return CAPTCHA_ERROR_MESSAGES.required;
  if (code === 10) return CAPTCHA_ERROR_MESSAGES.invalid;
  if (code === 11) return CAPTCHA_ERROR_MESSAGES.unavailable;
  return null;
}

function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

function requireConfig(config: CaptchaConfigVO | null): { serverUrl: string; siteKey: string } {
  if (config?.enabled && config.serverUrl && config.siteKey) {
    return { serverUrl: config.serverUrl, siteKey: config.siteKey };
  }
  throw new Error("人机验证配置不可用");
}

export async function readCommonCaptchaConfig(): Promise<CaptchaConfigVO> {
  return commonRequest<CaptchaConfigVO>("/captcha/config");
}

export async function readAdminCaptchaConfig(): Promise<CaptchaConfigVO> {
  return adminRequest<CaptchaConfigVO>("/captcha/config");
}

export const CAPTCHA_CONFIG_READERS = {
  common: readCommonCaptchaConfig,
  admin: readAdminCaptchaConfig,
} as const;

export function captchaConfigReader(action: CaptchaAction): () => Promise<CaptchaConfigVO> {
  return CAPTCHA_CONFIG_READERS[action === "admin_login" ? "admin" : "common"];
}

/** 每次受保护请求取新票据；异常只标记本次失败，不改变全局启停。 */
export async function obtainCaptchaToken(
  action: CaptchaAction,
  readConfig: () => Promise<CaptchaConfigVO> = captchaConfigReader(action),
  onError?: (error: unknown) => void,
): Promise<string> {
  let config: CaptchaConfigVO | null = null;
  try {
    config = await readConfig();
  } catch (error) {
    onError?.(error);
    throw error;
  }
  const { serverUrl, siteKey } = requireConfig(config);
  const client = await loadCaptchaClient(`${serverUrl.replace(/\/$/, "")}/fcaptcha.js`, onError);
  if (!client) throw new Error("人机验证配置不可用");
  // 脚本按同源路径请求 API；跨源部署时必须显式设置全局 serverUrl，否则相对路径会打到 SPA。
  if (client.serverUrl !== serverUrl.replace(/\/$/, "")) {
    client.configure({ serverUrl: serverUrl.replace(/\/$/, "") });
  }
  const result = await client.execute(siteKey, { action });
  const token = result.token;
  if (!result.success || !token) {
    const failure = new Error("人机验证未通过，请重试");
    onError?.(failure);
    throw failure;
  }
  return token;
}

export function isCaptchaFailure(error: unknown): boolean {
  return isApiError(error) && [9, 10, 11].includes(error.code ?? -1);
}
