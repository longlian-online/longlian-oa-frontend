import { ApiError } from "@/lib/apiError";
import { handleUnauthorized } from "@/lib/authRedirect";
import { getAdminToken, getCurrentOrgId, getToken } from "@/lib/session";
import type { ApiResult, SessionScope } from "@/types/api";

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

export async function adminRequest<T>(url: string, options?: RequestOptions): Promise<T> {
  return requestWithBase("", url, { auth: "admin", ...options });
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
  options?: RequestOptions,
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

  const response = await fetch(buildApiUrl(`${basePath}${url}`), { ...init, headers });

  const responseText = await response.text();
  const result = responseText ? parseApiResponse<T>(responseText) : undefined;

  if (isApiResult(result)) {
    if (result.code === API_CODE_UNAUTHORIZED && auth !== "none" && redirectOnUnauthorized) {
      throw handleUnauthorized(isAdminScope ? "admin" : "user");
    }

    if (result.code !== API_CODE_SUCCESS) {
      throw new ApiError(result.msg || `API error: ${result.code}`, result.code);
    }

    return result.data as T;
  }

  if (response.status === 401 && auth !== "none" && redirectOnUnauthorized) {
    throw handleUnauthorized(isAdminScope ? "admin" : "user");
  }

  if (!response.ok) {
    throw new ApiError(`API error: ${response.status}`, response.status);
  }

  return result as T;
}

function isApiResult<T>(result: unknown): result is ApiResult<T> {
  return typeof result === "object" && result !== null && "code" in result;
}
