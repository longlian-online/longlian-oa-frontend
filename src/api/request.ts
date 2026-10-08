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

export async function request<T>(url: string, options?: RequestInit): Promise<T> {
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

export async function orgAdminRequest<T>(url: string, options?: RequestInit): Promise<T> {
  return requestWithBase("", url, options);
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
  getCurrentToken: () => string | null = getToken,
  loginPath = "/login",
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };

  const authToken = overrideToken === undefined ? token : overrideToken;
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const orgId = includeOrgContext ? getCurrentOrgId() : null;
  if (orgId) {
    headers["X-Org-Id"] = orgId;
  } else {
    delete headers["X-Org-Id"];
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
  if (!responseText) {
    return undefined as T;
  }

  const result = parseApiResponse<T>(responseText);

  if (isApiResult(result)) {
    if (result.code === 1) {
      handleUnauthorized(result.msg || "登录已过期，请重新登录");
    }

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
