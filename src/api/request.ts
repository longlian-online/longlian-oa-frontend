import {
  clearAdminSession,
  clearSession,
  getAdminToken,
  getCurrentOrgId,
  getToken,
} from "@/lib/session";
import { AUTH_EXPIRED_MESSAGE, AuthExpiredError, redirectExpiredSession } from "@/lib/authError";
import type { ApiResult } from "@/types/planning";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const API_CODE_SUCCESS = 0;
const API_CODE_UNAUTHORIZED = 1;

export interface RequestOptions extends RequestInit {
  auth?: SessionScope;
  redirectOnUnauthorized?: boolean;
}

function parseApiResponse<T>(responseText: string): ApiResult<T> | T {
  // Snowflake IDs exceed JavaScript's safe integer range. Preserve matching ID fields
  // as strings before JSON.parse converts and rounds their trailing digits.
  const safeResponseText = responseText.replace(
    /("(?:id|[A-Za-z][A-Za-z0-9]*Id)"\s*:\s*)(-?\d{16,})(?=\s*[,}])/g,
    '$1"$2"',
  );

  return JSON.parse(safeResponseText) as ApiResult<T> | T;
}

export function buildApiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

export async function request<T>(url: string, options?: RequestOptions): Promise<T> {
  return requestWithBase("/app", url, options);
}

export async function adminRequest<T>(url: string, options?: RequestInit): Promise<T> {
  return requestWithBase(
    "",
    url,
    options,
    getAdminToken(),
    clearAdminSession,
    false,
    getAdminToken,
    "/admin/login",
  );
}

export async function orgAdminRequest<T>(url: string, options?: RequestOptions): Promise<T> {
  return requestWithBase("", url, options);
}

export async function commonRequest<T>(url: string, options?: RequestOptions): Promise<T> {
  return requestWithBase("/common", url, options);
}

async function requestWithBase<T>(
  basePath: string,
  url: string,
  options?: RequestInit,
  overrideToken?: string | null,
  onUnauthorized: () => void = clearSession,
  includeOrgContext = true,
  getCurrentToken: () => string | null = getToken,
  loginPath = "/login",
): Promise<T> {
  const { auth = "user", redirectOnUnauthorized = true, ...init } = options ?? {};
  const isAdminScope = auth === "admin";
  const token = isAdminScope ? getAdminToken() : getToken();
  const currentOrgId = getCurrentOrgId();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };

  if (auth !== "none" && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (auth === "user" && currentOrgId) {
    headers["X-Org-Id"] = currentOrgId;
  }

  const response = await fetch(buildApiUrl(`${basePath}${url}`), {
    ...options,
    headers,
  });

  function handleUnauthorized(message: string): never {
    if (!authToken) {
      throw new Error(message === AUTH_EXPIRED_MESSAGE ? `登录失败：${message}` : message);
    }
    // Responses belong to the session that issued the request. Ignore older sessions.
    if (getCurrentToken() === authToken) {
      onUnauthorized();
      redirectExpiredSession(loginPath);
    }
    throw new AuthExpiredError();
  }

  if (response.status === 401) {
    handleUnauthorized("登录失败，请检查登录信息后重试");
  }

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const responseText = await response.text();
  const result = responseText ? parseApiResponse<T>(responseText) : undefined;

  if (isApiResult(result)) {
    if (result.code === API_CODE_UNAUTHORIZED) {
      handleUnauthorized(result.msg || "登录已过期，请重新登录");
    }

    if (result.code !== API_CODE_SUCCESS) {
      throw new Error(result.msg || `API error: ${result.code}`);
    }

    return result.data as T;
  }

  if (!response.ok) {
    throw new ApiError(`API error: ${response.status}`, response.status);
  }

  return result as T;
}

function isApiResult<T>(result: unknown): result is ApiResult<T> {
  return typeof result === "object" && result !== null && "code" in result;
}
