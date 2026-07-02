import { clearSession, getCurrentOrgId, getToken } from "@/lib/session";
import type { ApiResult } from "@/types/planning";

const API_BASE = "/app";

export async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const currentOrgId = getCurrentOrgId();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (currentOrgId) {
    headers["X-Org-Id"] = currentOrgId;
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearSession();
    throw new Error("登录已过期，请重新登录");
  }

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const result: ApiResult<T> = await response.json();

  if (result.code !== 0 && result.code !== 2000) {
    throw new Error(result.msg || `API error: ${result.code}`);
  }

  return result.data as T;
}
