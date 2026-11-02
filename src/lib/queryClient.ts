import { MutationCache, QueryCache, QueryClient, isCancelledError } from "@tanstack/react-query";

import { ApiError, GatewayError, NetworkError } from "@/api/apiError";
import { AuthExpiredError } from "@/lib/authError";
import { isPlanningResourceNotFound } from "@/lib/planningResourceError";
import { getSessionSnapshot, subscribeSession } from "@/lib/session";
import { notificationService } from "@/services/notification";

export function notifyQueryError(error: Error): void {
  if (
    isCancelledError(error) ||
    error.name === "AbortError" ||
    error instanceof AuthExpiredError ||
    isPlanningResourceNotFound(error) ||
    (error instanceof ApiError && error.silenced)
  )
    return;
  notificationService.notify({ type: "error", message: error.message });
}

export function shouldRetryQuery(failureCount: number, error: Error): boolean {
  if (failureCount >= 1) return false;
  return (
    error instanceof NetworkError ||
    (error instanceof GatewayError &&
      (error.status === 408 || error.status === 429 || error.status >= 500))
  );
}

export function createQueryClient(): QueryClient {
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query): void => {
        if (
          isPlanningResourceNotFound(error) &&
          query.queryKey[0] === "app" &&
          query.queryKey[2] === "org"
        ) {
          // 沿用失败查询的组织前缀；返回上级时不能再复用仍在新鲜期的旧列表。
          const scope = query.queryKey.slice(0, 4);
          const keys =
            error.resource === "project"
              ? [["projects", "list"]]
              : [
                  ["items", "list"],
                  ["projects", "detail"],
                ];
          for (const key of keys) {
            void client.invalidateQueries({ queryKey: [...scope, ...key], refetchType: "none" });
          }
        }
        notifyQueryError(error);
      },
    }),
    mutationCache: new MutationCache({ onError: notifyQueryError }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 60_000,
        retry: shouldRetryQuery,
        retryDelay: (_attempt, error): number =>
          error instanceof GatewayError && Number.isFinite(error.retryAfterMs)
            ? error.retryAfterMs!
            : 1_000,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  return client;
}

export const queryClient = createQueryClient();

let previous = getSessionSnapshot();
subscribeSession((): void => {
  const current = getSessionSnapshot();
  const old = previous;
  previous = current;
  const expiredApp = old.appScope !== current.appScope;
  const expiredAdmin = old.adminScope !== current.adminScope;
  const expiredOrg = old.orgId !== current.orgId;
  const isExpired = (key: readonly unknown[]): boolean =>
    ((key[0] === "app" || key[0] === "public") && key[1] === old.appScope && expiredApp) ||
    (((key[0] === "admin" && key[1] === old.adminScope) ||
      (key[0] === "public" && key[2] === old.adminScope)) &&
      expiredAdmin) ||
    (key[0] === "app" &&
      key[1] === old.appScope &&
      (key[2] === "org" || key[2] === "account") &&
      key[3] === old.orgId &&
      expiredOrg);
  void queryClient.cancelQueries({ predicate: (query): boolean => isExpired(query.queryKey) });
  queryClient.removeQueries({ predicate: (query): boolean => isExpired(query.queryKey) });
  for (const mutation of queryClient.getMutationCache().getAll()) {
    if (mutation.options.mutationKey && isExpired(mutation.options.mutationKey))
      queryClient.getMutationCache().remove(mutation);
  }
});
