// @vitest-environment happy-dom
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import { retireDeletedItemQueries, retireDeletedProjectQueries } from "@/lib/planningDeletionCache";
import { scopedKey } from "@/lib/queryKeys";
import { clearSession, getSessionSnapshot, saveSession } from "@/lib/session";

let client: QueryClient;
const unsubscribes: (() => void)[] = [];

beforeEach((): void => {
  saveSession({ token: "token", userId: "1", defaultOrgId: "11" });
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

afterEach((): void => {
  for (const unsubscribe of unsubscribes.splice(0)) unsubscribe();
  client.clear();
  clearSession();
});

function cacheItem(itemId: string, instanceId: string): void {
  client.setQueryData(scopedKey(["flow", itemId], "org"), {
    nodes: [{ taskInstanceId: instanceId }],
  });
  client.setQueryData(scopedKey(["instances", itemId], "org"), [{ id: instanceId }]);
  client.setQueryData(scopedKey(["taskDetail", instanceId], "org"), { task: { id: instanceId } });
  client.setQueryData(scopedKey(["taskVersions", instanceId], "org"), []);
}

test("仅清理所属组织的被删项目及其任务缓存，不影响其他项目和组织", async (): Promise<void> => {
  const session = getSessionSnapshot();
  cacheItem("31", "41");
  cacheItem("32", "42");
  const otherOrgKey = scopedKey(["flow", "31"], "org", { ...session, orgId: "22" });
  client.setQueryData(otherOrgKey, "other-org");

  await retireDeletedItemQueries(client, "31", session);

  for (const key of [
    ["flow", "31"],
    ["instances", "31"],
    ["taskDetail", "41"],
    ["taskVersions", "41"],
  ]) {
    expect(client.getQueryState(scopedKey(key, "org", session))).toBeUndefined();
  }
  expect(client.getQueryData(scopedKey(["flow", "32"], "org"))).toBeDefined();
  expect(client.getQueryData(scopedKey(["taskDetail", "42"], "org"))).toBeDefined();
  expect(client.getQueryData(otherOrgKey)).toBe("other-org");
});

test("活动详情只标记过期，不 refetch 或移除后重建", async (): Promise<void> => {
  cacheItem("31", "41");
  const queryKey = scopedKey(["flow", "31"], "org");
  const load = vi.fn(async () => ({ nodes: [] }));
  const observer = new QueryObserver(client, { queryKey, queryFn: load, staleTime: Infinity });
  unsubscribes.push(observer.subscribe(() => {}));

  await retireDeletedItemQueries(client, "31", getSessionSnapshot());

  expect(load).not.toHaveBeenCalled();
  expect(client.getQueryState(queryKey)?.isInvalidated).toBe(true);
  expect(observer.getCurrentResult().data).toEqual({ nodes: [{ taskInstanceId: "41" }] });
});

test("取消正在进行的详情请求，迟到响应不能写回已删除对象", async (): Promise<void> => {
  cacheItem("31", "41");
  const queryKey = scopedKey(["flow", "31"], "org");
  let signal: AbortSignal | undefined;
  let resolve!: (value: { nodes: [] }) => void;
  const pending = client.fetchQuery({
    queryKey,
    queryFn: (context) => {
      signal = context.signal;
      return new Promise<{ nodes: [] }>((complete) => {
        resolve = complete;
      });
    },
  });
  const cancelled = expect(pending).resolves.toEqual({ nodes: [{ taskInstanceId: "41" }] });

  await retireDeletedItemQueries(client, "31", getSessionSnapshot());
  expect(signal?.aborted).toBe(true);
  resolve({ nodes: [] });
  await cancelled;
  expect(client.getQueryState(queryKey)).toBeUndefined();
});

test("删除企划清理项目列表、排序和已缓存子项目，保留其他企划", async (): Promise<void> => {
  const detail = scopedKey(["projects", "detail", "21"], "org");
  const list = scopedKey(["items", "list", "21", { pageNum: 2 }], "org");
  const order = scopedKey(["items", "order", "21"], "org");
  client.setQueryData(detail, { id: "21" });
  client.setQueryData(list, { list: [{ id: "31" }] });
  client.setQueryData(order, [{ id: "32" }]);
  client.setQueryData(scopedKey(["projects", "detail", "22"], "org"), { id: "22" });
  cacheItem("31", "41");
  cacheItem("32", "42");
  cacheItem("33", "43");

  await retireDeletedProjectQueries(client, "21", getSessionSnapshot());

  for (const queryKey of [
    detail,
    list,
    order,
    scopedKey(["flow", "31"], "org"),
    scopedKey(["taskVersions", "42"], "org"),
  ]) {
    expect(client.getQueryState(queryKey)).toBeUndefined();
  }
  expect(client.getQueryData(scopedKey(["projects", "detail", "22"], "org"))).toEqual({ id: "22" });
  expect(client.getQueryData(scopedKey(["flow", "33"], "org"))).toBeDefined();
});
