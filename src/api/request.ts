import {
  clearAdminSession,
  clearSession,
  getAdminToken,
  getCurrentOrgId,
  getToken,
} from "@/lib/session";
import type { ApiResult } from "@/types/planning";

export async function request<T>(url: string, options?: RequestInit): Promise<T> {
  return requestWithBase("/app", url, options);
}

export async function adminRequest<T>(url: string, options?: RequestInit): Promise<T> {
  return requestWithBase("", url, options, getAdminToken(), clearAdminSession, false);
}

export async function commonRequest<T>(url: string, options?: RequestInit): Promise<T> {
  return requestWithBase("/common", url, options);
}

async function requestWithBase<T>(
  basePath: string,
  url: string,
  options?: RequestInit,
  overrideToken?: string | null,
  onUnauthorized: () => void = clearSession,
  includeOrgContext = true,
): Promise<T> {
  const token = getToken();
  const currentOrgId = getCurrentOrgId();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };

  const authToken = overrideToken === undefined ? token : overrideToken;
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  if (includeOrgContext && currentOrgId) {
    headers["X-Org-Id"] = currentOrgId;
  }

  const response = await fetch(`${basePath}${url}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    onUnauthorized();
    throw new Error("登录已过期，请重新登录");
  }

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const responseText = await response.text();
  if (!responseText) {
    return undefined as T;
  }

  const result = JSON.parse(responseText) as ApiResult<T> | T;

  if (isApiResult(result)) {
    if (result.code !== 0) {
      throw new Error(result.msg || `API error: ${result.code}`);
    }

    return result.data as T;
  }

  return result;
}

function isApiResult<T>(result: ApiResult<T> | T): result is ApiResult<T> {
  return typeof result === "object" && result !== null && "code" in result;
}
