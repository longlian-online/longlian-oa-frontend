import {
  clearAdminSession,
  clearSession,
  getAdminToken,
  getCurrentOrgId,
  getRefreshToken,
  getToken,
  rotatedFrom,
  saveRotatedCredentials,
} from "@/lib/session";
import { AUTH_EXPIRED_MESSAGE, AuthExpiredError, redirectExpiredSession } from "@/lib/authError";
import { getRequestContext } from "@/api/requestContext";
import { ApiError, GatewayError, NetworkError } from "@/api/apiError";
import { GATEWAY_ERROR_MESSAGE, NETWORK_ERROR_MESSAGE } from "@/services/notification";

import type { ApiResult } from "@/types/planning";

export { ApiError, GatewayError };

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const REFRESH_LEAD_SECONDS = 5 * 60;

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
    false,
  );
}

export async function orgAdminRequest<T>(url: string, options?: RequestInit): Promise<T> {
  return requestWithBase("", url, options);
}

export async function commonRequest<T>(url: string, options?: RequestInit): Promise<T> {
  return requestWithBase("/common", url, options);
}

type RefreshOutcome = "ok" | "dead" | "unavailable";

let refreshInFlight: Promise<RefreshOutcome> | null = null;

function accessExpiresWithin(token: string, seconds: number): boolean {
  const payload = token.split(".")[1];
  if (!payload) return false;
  try {
    const padded = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(
      atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), "=")),
    ) as {
      exp?: unknown;
    };
    return typeof json.exp === "number" && json.exp * 1000 - Date.now() <= seconds * 1000;
  } catch {
    return false;
  }
}

function refreshAccess(): Promise<RefreshOutcome> {
  refreshInFlight ??= runRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function runRefresh(): Promise<RefreshOutcome> {
  const refreshToken = getRefreshToken();
  const accessBefore = getToken();
  if (!refreshToken || !accessBefore) return "dead";
  try {
    const refreshed = await requestWithBase<{ token: string; refreshToken: string }>(
      "/app",
      "/session/refresh",
      { method: "POST", body: JSON.stringify({ refreshToken }) },
      null,
      () => undefined,
      false,
      getToken,
      "/login",
      false,
      true,
    );
    if (getRefreshToken() !== refreshToken || getToken() !== accessBefore) return "dead";
    saveRotatedCredentials(refreshed.token, refreshed.refreshToken);
    return "ok";
  } catch (error) {
    if (error instanceof NetworkError || error instanceof GatewayError) {
      error.silence();
      return "unavailable";
    }
    if (error instanceof ApiError) error.silence();
    return "dead";
  }
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
  allowRefresh = true,
  useOverride = false,
): Promise<T> {
  const context = getRequestContext();
  const notify = !context?.managed;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };

  let authToken = useOverride
    ? (overrideToken ?? null)
    : context
      ? context.token
      : overrideToken === undefined
        ? getToken()
        : overrideToken;
  const canRefresh = allowRefresh && url !== "/session/refresh";
  if (
    canRefresh &&
    authToken &&
    getRefreshToken() &&
    accessExpiresWithin(authToken, REFRESH_LEAD_SECONDS)
  ) {
    const before = authToken;
    const outcome = await refreshAccess();
    const current = getToken();
    if (outcome === "ok" && current && (before === rotatedFrom() || current === before)) {
      authToken = current;
    } else if (
      outcome === "dead" &&
      getCurrentToken() === before &&
      (!context?.isCurrent || context.isCurrent())
    ) {
      onUnauthorized();
      redirectExpiredSession(loginPath);
      throw new AuthExpiredError();
    }
  }
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const orgId = includeOrgContext ? (context ? context.orgId : getCurrentOrgId()) : null;
  if (orgId) {
    headers["X-Org-Id"] = orgId;
  } else {
    delete headers["X-Org-Id"];
  }

  let response: Response;
  try {
    response = await fetch(buildApiUrl(`${basePath}${url}`), {
      ...options,
      signal: context?.signal ?? options?.signal,
      headers,
    });
  } catch (cause) {
    if (cause instanceof Error && cause.name === "AbortError") throw cause;
    throw new NetworkError(NETWORK_ERROR_MESSAGE, notify);
  }

  async function recoverUnauthorized(message: string): Promise<T> {
    if (!authToken) {
      throw new ApiError(
        message === AUTH_EXPIRED_MESSAGE ? `登录失败：${message}` : message,
        notify,
      );
    }
    const stillCurrent = !context?.isCurrent || context.isCurrent();
    const current = getCurrentToken();
    if (authToken === rotatedFrom() && current && current !== authToken && stillCurrent) {
      return requestWithBase(
        basePath,
        url,
        options,
        current,
        onUnauthorized,
        includeOrgContext,
        getCurrentToken,
        loginPath,
        false,
        true,
      );
    }
    // Responses belong to the session that issued the request. Ignore older sessions.
    if (!stillCurrent || current !== authToken) throw new AuthExpiredError();
    if (!canRefresh || !getRefreshToken()) {
      onUnauthorized();
      redirectExpiredSession(loginPath);
      throw new AuthExpiredError();
    }
    const outcome = await refreshAccess();
    const refreshedToken = getToken();
    if (outcome === "ok" && refreshedToken) {
      return requestWithBase(
        basePath,
        url,
        options,
        refreshedToken,
        onUnauthorized,
        includeOrgContext,
        getCurrentToken,
        loginPath,
        false,
        true,
      );
    }
    if (outcome === "unavailable") throw new NetworkError(NETWORK_ERROR_MESSAGE, notify);
    if (getCurrentToken() === authToken) {
      onUnauthorized();
      redirectExpiredSession(loginPath);
    }
    throw new AuthExpiredError();
  }

  if (!response.ok) {
    const retryAfter = response.headers.get("Retry-After");
    const retryAfterMs = retryAfter
      ? /^\d+$/.test(retryAfter)
        ? Number(retryAfter) * 1000
        : Math.max(0, Date.parse(retryAfter) - Date.now())
      : undefined;
    throw new GatewayError(response.status, notify, retryAfterMs);
  }

  const responseText = await response.text();
  if (!responseText) {
    return undefined as T;
  }

  let result: ApiResult<T> | T;
  try {
    result = parseApiResponse<T>(responseText);
  } catch {
    throw new ApiError(GATEWAY_ERROR_MESSAGE, notify);
  }

  if (isApiResult(result)) {
    if (result.code === 1) {
      return recoverUnauthorized(result.msg || "登录已过期，请重新登录");
    }

    if (result.code !== 0) {
      throw new ApiError(result.msg || `API error: ${result.code}`, notify);
    }

    return result.data as T;
  }

  return result;
}

function isApiResult<T>(result: ApiResult<T> | T): result is ApiResult<T> {
  return typeof result === "object" && result !== null && "code" in result;
}
