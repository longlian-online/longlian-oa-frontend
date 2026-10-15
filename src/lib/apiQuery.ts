import { queryOptions, type QueryKey } from "@tanstack/react-query";

import { runWithRequestContext } from "@/api/requestContext";
import { isScopeCurrent, scopedKey, type ApiScope } from "@/lib/queryKeys";
import { getSessionSnapshot, type SessionSnapshot } from "@/lib/session";

export interface ApiQueryOptions<T> {
  key: QueryKey;
  queryFn: () => Promise<T>;
  scope?: ApiScope;
  enabled?: boolean;
  staleTime?: number;
  refetchOnMount?: boolean;
}

export function apiQueryOptions<T>(
  {
    key,
    queryFn,
    scope = "org",
    enabled = true,
    staleTime = 30_000,
    refetchOnMount,
  }: ApiQueryOptions<T>,
  session: SessionSnapshot = getSessionSnapshot(),
) {
  const authenticated =
    scope === "public" || Boolean(scope === "admin" ? session.adminToken : session.token);
  return queryOptions({
    queryKey: scopedKey(key, scope, session),
    enabled: enabled && authenticated && (scope !== "org" || Boolean(session.orgId)),
    staleTime,
    refetchOnMount,
    queryFn: ({ signal }): Promise<T> => executeScopedApi(scope, session, queryFn, signal),
  });
}

export async function executeScopedApi<T>(
  scope: ApiScope,
  session: SessionSnapshot,
  execute: () => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  if (
    !isScopeCurrent(scope, session) ||
    (scope !== "public" && !(scope === "admin" ? session.adminToken : session.token)) ||
    (scope === "org" && !session.orgId)
  )
    throw new DOMException("请求上下文不可用", "AbortError");
  try {
    const result = await runWithRequestContext(
      {
        token: scope === "public" ? null : scope === "admin" ? session.adminToken : session.token,
        orgId: scope === "org" || scope === "account" ? session.orgId : null,
        signal,
        managed: true,
        isCurrent: () => isScopeCurrent(scope, session),
      },
      execute,
    );
    if (!isScopeCurrent(scope, session)) throw new DOMException("会话已切换", "AbortError");
    return result;
  } catch (error) {
    if (!isScopeCurrent(scope, session)) throw new DOMException("会话已切换", "AbortError");
    throw error;
  }
}
