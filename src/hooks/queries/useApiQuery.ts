import { useEffect, useRef, useSyncExternalStore } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import { runWithRequestContext } from "@/api/requestContext";
import { isScopeCurrent, scopedKey, type ApiScope } from "@/lib/queryKeys";
import { getSessionSnapshot, subscribeSession, type SessionSnapshot } from "@/lib/session";

export function useSessionSnapshot(): SessionSnapshot {
  return useSyncExternalStore(subscribeSession, getSessionSnapshot, getSessionSnapshot);
}

interface ApiQueryOptions<T> {
  key: QueryKey;
  queryFn: () => Promise<T>;
  scope?: ApiScope;
  enabled?: boolean;
  staleTime?: number;
}

export function useApiQuery<T>({
  key,
  queryFn,
  scope = "org",
  enabled = true,
  staleTime,
}: ApiQueryOptions<T>): UseQueryResult<T, Error> {
  const session = useSessionSnapshot();
  const authenticated =
    scope === "public" ||
    (scope === "admin" ? Boolean(session.adminToken) : Boolean(session.token));
  return useQuery({
    queryKey: scopedKey(key, scope, session),
    enabled: enabled && authenticated && (scope !== "org" || Boolean(session.orgId)),
    staleTime: staleTime ?? 30_000,
    queryFn: ({ signal }): Promise<T> => executeScopedApi(scope, session, queryFn, signal),
  });
}

interface ApiMutationOptions<T, V> {
  key?: QueryKey;
  allowConcurrent?: boolean;
  mutationFn: (variables: V) => Promise<T>;
  invalidate?: readonly QueryKey[];
  scope?: ApiScope;
}

export function useApiMutation<T = void, V = void>({
  mutationFn,
  key = ["mutation"],
  allowConcurrent = false,
  invalidate = [],
  scope = "org",
}: ApiMutationOptions<T, V>): UseMutationResult<T, Error, V> {
  const session = useSessionSnapshot();
  const client = useQueryClient();
  const lock = useRef(false);
  const mounted = useRef(true);
  useEffect((): (() => void) => {
    mounted.current = true;
    return (): void => {
      mounted.current = false;
    };
  }, []);
  const mutation = useMutation<T, Error, V>({
    mutationKey: scopedKey(key, scope, session),
    mutationFn: async (variables: V): Promise<T> => {
      const started = session;
      if (!isScopeCurrent(scope, started)) throw new DOMException("会话已切换", "AbortError");
      if (scope !== "public" && !(scope === "admin" ? started.adminToken : started.token))
        throw new DOMException("未登录", "AbortError");
      if (scope === "org" && !started.orgId) throw new DOMException("尚未选择组织", "AbortError");
      const result = await executeScopedApi(scope, started, () => mutationFn(variables));
      // 失效只影响当前操作所属作用域，刷新失败不会改变已成功写入的结果。
      await Promise.all(
        invalidate.map(
          (key): Promise<void> =>
            client.invalidateQueries(
              {
                queryKey: scopedKey(
                  key,
                  scope === "org" && (key[0] === "organizations" || key[0] === "currentUser")
                    ? "account"
                    : scope,
                  started,
                ),
              },
              { throwOnError: false },
            ),
        ),
      );
      if (!isScopeCurrent(scope, started)) throw new DOMException("会话已切换", "AbortError");
      return result;
    },
  });
  const mutateAsync: UseMutationResult<T, Error, V>["mutateAsync"] = async (
    ...args: Parameters<UseMutationResult<T, Error, V>["mutateAsync"]>
  ): Promise<T> => {
    if (!allowConcurrent && lock.current) throw new DOMException("操作正在执行", "AbortError");
    if (!allowConcurrent) lock.current = true;
    try {
      const result = await mutation.mutateAsync(...args);
      if (!mounted.current) throw new DOMException("操作页面已关闭", "AbortError");
      return result;
    } finally {
      if (!allowConcurrent) lock.current = false;
    }
  };
  return {
    ...mutation,
    mutateAsync,
    mutate: (...args: Parameters<UseMutationResult<T, Error, V>["mutate"]>): void => {
      void mutateAsync(...args).catch(() => undefined);
    },
  };
}

async function executeScopedApi<T>(
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
