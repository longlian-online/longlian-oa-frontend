import {
  QueryClientProvider,
  type QueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import { ApiError, GatewayError, NetworkError } from "@/api/apiError";
import { request } from "@/api/request";
import { useApiMutation, useApiQuery } from "@/hooks/queries/useApiQuery";
import { AuthExpiredError } from "@/lib/authError";
import { createQueryClient, queryClient, shouldRetryQuery } from "@/lib/queryClient";
import { scopedKey, type ApiScope } from "@/lib/queryKeys";
import {
  clearAdminSession,
  clearSession,
  getSessionSnapshot,
  saveAdminSession,
  saveCurrentOrganization,
  saveSession,
} from "@/lib/session";

const { storage } = vi.hoisted(() => {
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string): string | null => storage.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      storage.set(key, value);
    },
    removeItem: (key: string): void => {
      storage.delete(key);
    },
  });
  return { storage };
});
const { notify } = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock("@/services/notification", () => ({
  notificationService: { notify },
  GATEWAY_ERROR_MESSAGE: "gateway",
  NETWORK_ERROR_MESSAGE: "network",
}));

const clients: QueryClient[] = [];
function makeClient(): QueryClient {
  const client = createQueryClient();
  clients.push(client);
  return client;
}
function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete): void => {
    resolve = complete;
  });
  return { promise, resolve };
}
function queryProbe(
  client: QueryClient,
  queryFn: () => Promise<string>,
  scope: ApiScope = "org",
): UseQueryResult<string, Error> {
  let result!: UseQueryResult<string, Error>;
  function Probe(): null {
    result = useApiQuery({ key: ["projects", "list"], queryFn, scope });
    return null;
  }
  renderToString(
    <QueryClientProvider client={client}>
      <Probe />
    </QueryClientProvider>,
  );
  return result;
}
function mutationProbe(
  client: QueryClient,
  mutationFn: (value: string) => Promise<string>,
  scope: ApiScope = "org",
): UseMutationResult<string, Error, string> {
  let result!: UseMutationResult<string, Error, string>;
  function Probe(): null {
    result = useApiMutation({ mutationFn, scope, invalidate: [["projects"]] });
    return null;
  }
  renderToString(
    <QueryClientProvider client={client}>
      <Probe />
    </QueryClientProvider>,
  );
  return result;
}
beforeEach((): void => {
  storage.clear();
  saveSession({ token: "app-token", userId: "1", defaultOrgId: "11" });
  saveAdminSession({ token: "admin-token", adminId: "9", username: "admin", role: "ADMIN" });
  queryClient.clear();
});
afterEach((): void => {
  for (const client of clients.splice(0)) client.clear();
  queryClient.clear();
  vi.unstubAllGlobals();
  // Keep the hoisted storage available for the session module's next test.
  vi.stubGlobal("localStorage", {
    getItem: (key: string): string | null => storage.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      storage.set(key, value);
    },
    removeItem: (key: string): void => {
      storage.delete(key);
    },
  });
});

test("同组织同 key 的两个真实 Hook refetch 复用请求并传入组织头和取消信号", async (): Promise<void> => {
  const client = makeClient();
  const response = deferred<Response>();
  const send = vi.fn((_url: string, _options?: RequestInit): Promise<Response> => response.promise);
  vi.stubGlobal("fetch", send);
  const first = queryProbe(client, () => request<string>("/projects"));
  const second = queryProbe(client, () => request<string>("/projects"));
  const pending = Promise.all([first.refetch(), second.refetch()]);
  expect(send).toHaveBeenCalledTimes(1);
  expect(send.mock.calls[0]?.[1]).toMatchObject({
    headers: { Authorization: "Bearer app-token", "X-Org-Id": "11" },
    signal: expect.any(AbortSignal),
  });
  response.resolve(new Response('{"code":0,"data":"org-11"}'));
  expect((await pending).map((result): string | undefined => result.data)).toEqual([
    "org-11",
    "org-11",
  ]);
});

test("组织切换和同 token 重新登录分别创建独立缓存身份", async (): Promise<void> => {
  const client = makeClient();
  const load = vi.fn(async (): Promise<string> => getSessionSnapshot().orgId!);
  const firstSession = getSessionSnapshot();
  await queryProbe(client, load).refetch();
  saveCurrentOrganization("22");
  await queryProbe(client, load).refetch();
  expect(client.getQueryData(scopedKey(["projects", "list"], "org", firstSession))).toBe("11");
  expect(client.getQueryData(scopedKey(["projects", "list"], "org"))).toBe("22");
  const beforeRelogin = getSessionSnapshot();
  saveSession({ token: "app-token", userId: "1", defaultOrgId: "22" });
  expect(getSessionSnapshot().appScope).not.toBe(beforeRelogin.appScope);
  await queryProbe(client, load).refetch();
  expect(load).toHaveBeenCalledTimes(3);
});

test("account 查询保留组织头，旧 Hook 在组织切换后拒绝发出新请求", async (): Promise<void> => {
  const send = vi.fn(
    async (_url: string, _options?: RequestInit): Promise<Response> =>
      new Response('{"code":0,"data":"profile"}'),
  );
  vi.stubGlobal("fetch", send);
  const probe = queryProbe(makeClient(), () => request<string>("/profile"), "account");
  await probe.refetch();
  expect(send.mock.calls[0]?.[1]).toMatchObject({ headers: { "X-Org-Id": "11" } });
  saveCurrentOrganization("22");
  await expect(probe.refetch({ throwOnError: true })).rejects.toMatchObject({ name: "AbortError" });
  expect(send).toHaveBeenCalledTimes(1);
});

test("真实 mutation 捕获请求身份并仅失效所属组织的资源", async (): Promise<void> => {
  const client = makeClient();
  const session = getSessionSnapshot();
  const ownKey = scopedKey(["projects", "list"], "org", session);
  const otherOrgKey = scopedKey(["projects", "list"], "org", { ...session, orgId: "22" });
  const adminKey = scopedKey(["projects", "list"], "admin", session);
  const accountKey = scopedKey(["projects", "list"], "account", session);
  for (const key of [ownKey, otherOrgKey, adminKey, accountKey]) client.setQueryData(key, "cached");
  const send = vi.fn(
    async (_url: string, _options?: RequestInit): Promise<Response> =>
      new Response('{"code":0,"data":"saved"}'),
  );
  vi.stubGlobal("fetch", send);
  await expect(
    mutationProbe(client, (value) =>
      request<string>("/projects", { method: "POST", body: value }),
    ).mutateAsync("payload"),
  ).resolves.toBe("saved");
  expect(send.mock.calls[0]?.[1]).toMatchObject({
    headers: { Authorization: "Bearer app-token", "X-Org-Id": "11" },
    body: "payload",
  });
  expect(client.getQueryState(ownKey)?.isInvalidated).toBe(true);
  for (const key of [otherOrgKey, adminKey, accountKey])
    expect(client.getQueryState(key)?.isInvalidated).toBe(false);
});

test("身份在 mutation 等待期间改变时拒绝迟到成功并不失效新缓存", async (): Promise<void> => {
  const client = makeClient();
  const pending = deferred<string>();
  const started = deferred<boolean>();
  const mutation = mutationProbe(client, (): Promise<string> => {
    started.resolve(true);
    return pending.promise;
  });
  const result = mutation.mutateAsync("payload");
  const rejected = expect(result).rejects.toMatchObject({ name: "AbortError" });
  await started.promise;
  saveSession({ token: "other-token", userId: "2", defaultOrgId: "22" });
  const nextKey = scopedKey(["projects", "list"], "org");
  client.setQueryData(nextKey, "new-user");
  pending.resolve("saved");
  await rejected;
  expect(client.getQueryState(nextKey)?.isInvalidated).toBe(false);
});

test("singleton 在普通端退出时清理对应缓存并保护管理端，管理端退出再清理管理缓存", (): void => {
  const app = scopedKey(["projects"], "org");
  const account = scopedKey(["currentUser"], "account");
  const admin = scopedKey(["organizations"], "admin");
  const publicKey = scopedKey(["invite"], "public");
  for (const key of [app, account, admin, publicKey]) queryClient.setQueryData(key, "secret");
  clearSession();
  for (const key of [app, account, publicKey])
    expect(queryClient.getQueryData(key)).toBeUndefined();
  expect(queryClient.getQueryData(admin)).toBe("secret");
  clearAdminSession();
  expect(queryClient.getQueryData(admin)).toBeUndefined();
});

test("singleton 组织切换清理旧组织和 account 缓存但保留管理端缓存", (): void => {
  const org = scopedKey(["projects"], "org");
  const account = scopedKey(["currentUser"], "account");
  const admin = scopedKey(["organizations"], "admin");
  for (const key of [org, account, admin]) queryClient.setQueryData(key, "cached");
  saveCurrentOrganization("22");
  expect(queryClient.getQueryData(org)).toBeUndefined();
  expect(queryClient.getQueryData(account)).toBeUndefined();
  expect(queryClient.getQueryData(admin)).toBe("cached");
});

test("重试只允许网络和临时 HTTP 错误一次，取消、业务和认证错误不重试", (): void => {
  for (const error of [
    new NetworkError("offline", false),
    new GatewayError(408, false),
    new GatewayError(429, false),
    new GatewayError(503, false),
  ]) {
    expect(shouldRetryQuery(0, error)).toBe(true);
    expect(shouldRetryQuery(1, error)).toBe(false);
  }
  for (const error of [
    new ApiError("business", false),
    new GatewayError(403, false),
    new AuthExpiredError(),
    new DOMException("cancelled", "AbortError"),
  ])
    expect(shouldRetryQuery(0, error)).toBe(false);
});

test("QueryClient 取消真实 Hook 请求时 AbortSignal 传至 fetch 且不显示错误通知", async (): Promise<void> => {
  const client = makeClient();
  let signal: AbortSignal | undefined;
  vi.stubGlobal(
    "fetch",
    vi.fn((_url: string, options?: RequestInit): Promise<Response> => {
      signal = options?.signal ?? undefined;
      return new Promise<Response>((_resolve, reject): void => {
        signal?.addEventListener(
          "abort",
          (): void => reject(new DOMException("cancelled", "AbortError")),
          { once: true },
        );
      });
    }),
  );
  const pending = queryProbe(client, () => request<string>("/projects")).refetch();
  expect(signal?.aborted).toBe(false);
  await client.cancelQueries({ queryKey: scopedKey(["projects"], "org") });
  await pending;
  expect(signal?.aborted).toBe(true);
  expect(client.getQueryState(scopedKey(["projects", "list"], "org"))?.error).toBeNull();
});

test("singleton 同 token 重新登录也清除旧会话缓存；管理端退出保留普通端缓存", (): void => {
  const previousKey = scopedKey(["projects"], "org");
  queryClient.setQueryData(previousKey, "old-session");
  saveSession({ token: "app-token", userId: "1", defaultOrgId: "11" });
  expect(queryClient.getQueryData(previousKey)).toBeUndefined();
  const app = scopedKey(["projects"], "org");
  const admin = scopedKey(["organizations"], "admin");
  const publicKey = scopedKey(["invite"], "public");
  for (const key of [app, admin, publicKey]) queryClient.setQueryData(key, "cached");
  clearAdminSession();
  expect(queryClient.getQueryData(app)).toBe("cached");
  expect(queryClient.getQueryData(admin)).toBeUndefined();
  expect(queryClient.getQueryData(publicKey)).toBeUndefined();
});

test("写操作在首次点击的同一帧阻止重复请求", async (): Promise<void> => {
  const pending = deferred<string>();
  const started = deferred<boolean>();
  const save = vi.fn((): Promise<string> => {
    started.resolve(true);
    return pending.promise;
  });
  const mutation = mutationProbe(makeClient(), save);
  const first = mutation.mutateAsync("one");
  await expect(mutation.mutateAsync("two")).rejects.toMatchObject({ name: "AbortError" });
  await started.promise;
  expect(save).toHaveBeenCalledTimes(1);
  pending.resolve("saved");
  await expect(first).resolves.toBe("saved");
});

test("后台刷新失败保留已有数据，只在最后一次重试失败时通知", async (): Promise<void> => {
  notify.mockClear();
  const client = makeClient();
  client.setDefaultOptions({ queries: { ...client.getDefaultOptions().queries, retryDelay: 0 } });
  const key = scopedKey(["projects", "list"], "org");
  client.setQueryData(key, "existing");
  const send = vi.fn(async (): Promise<Response> => new Response("", { status: 503 }));
  vi.stubGlobal("fetch", send);
  const result = await queryProbe(client, () => request<string>("/projects")).refetch();
  expect(send).toHaveBeenCalledTimes(2);
  expect(result.data).toBe("existing");
  expect(result.isError).toBe(true);
  expect(notify).toHaveBeenCalledTimes(1);
});

test("写入成功后的关联读取失败不会把写操作报告为失败", async (): Promise<void> => {
  const client = makeClient();
  const key = scopedKey(["projects", "list"], "org");
  client.setQueryData(key, "cached");
  const { QueryObserver } = await import("@tanstack/react-query");
  const observer = new QueryObserver(client, {
    queryKey: key,
    queryFn: async (): Promise<string> => {
      throw new ApiError("refresh failed", false);
    },
    enabled: false,
  });
  const unsubscribe = observer.subscribe((): void => {});
  observer.setOptions({
    queryKey: key,
    queryFn: async (): Promise<string> => {
      throw new ApiError("refresh failed", false);
    },
    staleTime: Infinity,
  });
  await expect(
    mutationProbe(client, async (): Promise<string> => "saved").mutateAsync("input"),
  ).resolves.toBe("saved");
  expect(client.getQueryData(key)).toBe("cached");
  expect(client.getQueryState(key)?.status).toBe("error");
  unsubscribe();
});

test("旧请求的业务错误在切换组织后被取消且不提示给新组织", async (): Promise<void> => {
  notify.mockClear();
  const response = deferred<Response>();
  vi.stubGlobal(
    "fetch",
    vi.fn((): Promise<Response> => response.promise),
  );
  const client = makeClient();
  const pending = queryProbe(client, () => request<string>("/projects")).refetch({
    throwOnError: true,
  });
  const rejected = expect(pending).rejects.toMatchObject({ name: "AbortError" });
  saveCurrentOrganization("22");
  response.resolve(new Response('{"code":3,"msg":"old organization failure","data":null}'));
  await rejected;
  expect(notify).not.toHaveBeenCalled();
});

test("同 token 重新登录后旧请求的 code 1 不能清除新会话", async (): Promise<void> => {
  const response = deferred<Response>();
  vi.stubGlobal(
    "fetch",
    vi.fn((): Promise<Response> => response.promise),
  );
  const pending = queryProbe(makeClient(), () => request<string>("/projects")).refetch({
    throwOnError: true,
  });
  const rejected = expect(pending).rejects.toMatchObject({ name: "AbortError" });
  saveSession({ token: "app-token", userId: "1", defaultOrgId: "11" });
  const current = getSessionSnapshot();
  response.resolve(new Response('{"code":1,"msg":"expired","data":null}'));
  await rejected;
  expect(getSessionSnapshot().token).toBe("app-token");
  expect(getSessionSnapshot().appScope).toBe(current.appScope);
});

test("缺少组织时查询不显示正在加载，手动刷新也不会发送组织请求", async (): Promise<void> => {
  saveCurrentOrganization("", null);
  const load = vi.fn(async (): Promise<string> => "unexpected");
  const result = queryProbe(makeClient(), load);
  expect(result.isPending).toBe(true);
  expect(result.isLoading).toBe(false);
  expect(result.isFetching).toBe(false);
  await expect(result.refetch({ throwOnError: true })).rejects.toMatchObject({
    name: "AbortError",
  });
  expect(load).not.toHaveBeenCalled();
});

test("显式并发模式允许不同变量的写操作同时执行", async (): Promise<void> => {
  const client = makeClient();
  const first = deferred<string>();
  const second = deferred<string>();
  const started = deferred<boolean>();
  let count = 0;
  let result!: UseMutationResult<string, Error, string>;
  function Probe(): null {
    result = useApiMutation({
      key: ["claimTask"],
      allowConcurrent: true,
      mutationFn: (id: string): Promise<string> => {
        if (++count === 2) started.resolve(true);
        return id === "first" ? first.promise : second.promise;
      },
    });
    return null;
  }
  renderToString(
    <QueryClientProvider client={client}>
      <Probe />
    </QueryClientProvider>,
  );
  const saves = Promise.all([result.mutateAsync("first"), result.mutateAsync("second")]);
  await started.promise;
  expect(
    client
      .getMutationCache()
      .findAll({ mutationKey: scopedKey(["claimTask"], "org"), status: "pending" }),
  ).toHaveLength(2);
  first.resolve("one");
  second.resolve("two");
  await expect(saves).resolves.toEqual(["one", "two"]);
});
