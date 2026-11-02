// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import { getTaskInstanceDetail, getTaskSubmissionVersions } from "@/api/workflowInstance";
import { ConfirmDialogProvider } from "@/components/ConfirmDialog";
import { useApiQuery } from "@/hooks/queries/useApiQuery";
import { scopedKey } from "@/lib/queryKeys";
import { clearSession, saveSession } from "@/lib/session";
import { itemFlowQuery, itemInstancesQuery } from "@/queries/planning";
import ItemDeletionRequestButton from "./ItemDeletionRequestButton";

let root: Root;
let container: HTMLDivElement;
let client: QueryClient;
const calls: { method: string; path: string; body: string }[] = [];
const getAnimations = Object.getOwnPropertyDescriptor(Element.prototype, "getAnimations");
let deleted: boolean;
let deleteFailed: boolean;

beforeEach((): void => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  saveSession({ token: "test-token", userId: "1", defaultOrgId: "11" });
  calls.length = 0;
  deleted = false;
  deleteFailed = false;
  Object.defineProperty(Element.prototype, "getAnimations", {
    configurable: true,
    value: (): [] => [],
  });
  vi.stubGlobal("fetch", async (input: string, init?: RequestInit): Promise<Response> => {
    const url = new URL(input, "http://localhost");
    calls.push({
      method: init?.method ?? "GET",
      path: url.pathname,
      body: typeof init?.body === "string" ? init.body : "",
    });
    if (init?.method === "DELETE") {
      if (deleteFailed) return json(null, 3);
      deleted = true;
    }
    if (url.pathname === "/app/item/31/flow") {
      return json({ itemTitle: "第一话", nodes: [{ taskInstanceId: "41" }] }, deleted ? 6 : 0);
    }
    if (url.pathname === "/app/task/instance/item/31") {
      return json([{ id: "41" }], deleted ? 6 : 0);
    }
    return json(null);
  });
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach((): void => {
  act(() => root.unmount());
  container.remove();
  client.clear();
  clearSession();
  if (getAnimations) Object.defineProperty(Element.prototype, "getAnimations", getAnimations);
  else Reflect.deleteProperty(Element.prototype, "getAnimations");
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function button(name: string): HTMLButtonElement | undefined {
  return [...document.querySelectorAll("button")].find(
    (entry) => entry.textContent?.replace(/\s+/g, "") === name,
  );
}

function Address(): ReactElement {
  const location = useLocation();
  return <output aria-label="地址">{location.pathname}</output>;
}

function json(data: unknown, code = 0): Response {
  return new Response(JSON.stringify({ code, msg: code ? "项目不存在" : "成功", data }), {
    headers: { "Content-Type": "application/json" },
  });
}

function ItemQueries(): null {
  useApiQuery(itemFlowQuery("31"));
  useApiQuery(itemInstancesQuery("31"));
  useApiQuery({ key: ["taskDetail", "41"], queryFn: () => getTaskInstanceDetail("41") });
  useApiQuery({ key: ["taskVersions", "41"], queryFn: () => getTaskSubmissionVersions("41") });
  return null;
}

async function mount(hasSubmissionRecord: boolean, observeItem = false): Promise<void> {
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <ConfirmDialogProvider>
          <MemoryRouter initialEntries={["/dashboard/planning/21/items/31"]}>
            <Address />
            <Routes>
              <Route
                path="/dashboard/planning/21/items/31"
                element={
                  <>
                    {observeItem && <ItemQueries />}
                    <ItemDeletionRequestButton
                      projectId="21"
                      itemId="31"
                      itemTitle="第一话"
                      hasSubmissionRecord={hasSubmissionRecord}
                    />
                  </>
                }
              />
              <Route path="/dashboard/planning/21" element={<p>企划详情</p>} />
            </Routes>
          </MemoryRouter>
        </ConfirmDialogProvider>
      </QueryClientProvider>,
    );
  });
}

test("填写原因后提交项目删除申请，空白原因不能提交", async (): Promise<void> => {
  await mount(true);
  await act(async () => button("删除项目")?.click());
  const submit = button("提交申请");
  expect(submit?.disabled).toBe(true);
  const reason = document.querySelector("textarea");
  if (!reason) throw new Error("缺少删除原因");
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(
      reason,
      "  重复创建  ",
    );
    reason.dispatchEvent(new Event("input", { bubbles: true }));
  });
  expect(button("提交申请")?.disabled).toBe(false);
  await act(async () => button("提交申请")?.click());
  await vi.waitFor(() =>
    expect(calls).toEqual([
      {
        method: "POST",
        path: "/app/projects/21/items/31/deletion-requests",
        body: JSON.stringify({ reason: "重复创建" }),
      },
    ]),
  );
  expect(document.querySelector("output")?.textContent).toBe("/dashboard/planning/21/items/31");
});

test("没有提交记录时确认后直接删除并回到企划详情", async (): Promise<void> => {
  await mount(false);
  await act(async () => button("删除项目")?.click());
  expect(document.body.textContent).toContain("删除后「第一话」的流程与任务记录将不可恢复。");
  await act(async () => button("删除")?.click());
  await vi.waitFor(() => {
    expect(calls).toEqual([{ method: "DELETE", path: "/app/projects/21/items/31", body: "" }]);
    expect(document.querySelector("output")?.textContent).toBe("/dashboard/planning/21");
  });
});

test("详情仍挂载时删除只刷新列表，不重新请求已删除项目的流程、任务及版本", async (): Promise<void> => {
  await mount(false, true);
  await vi.waitFor(() => expect(calls.filter((call) => call.method === "GET")).toHaveLength(4));
  const before = calls.length;
  await act(async () => button("删除项目")?.click());
  await act(async () => button("删除")?.click());
  await vi.waitFor(() =>
    expect(document.querySelector("output")?.textContent).toBe("/dashboard/planning/21"),
  );
  expect(calls.slice(before)).toEqual([
    { method: "DELETE", path: "/app/projects/21/items/31", body: "" },
  ]);
});

test("删除失败保留详情数据和当前地址，不失效已有查询", async (): Promise<void> => {
  deleteFailed = true;
  await mount(false, true);
  await vi.waitFor(() =>
    expect(client.getQueryData(scopedKey(["instances", "31"], "org"))).toEqual([{ id: "41" }]),
  );
  const before = calls.length;
  await act(async () => button("删除项目")?.click());
  await act(async () => button("删除")?.click());
  await vi.waitFor(() => expect(button("删除项目")?.disabled).toBe(false));
  expect(document.querySelector("output")?.textContent).toBe("/dashboard/planning/21/items/31");
  expect(client.getQueryData(scopedKey(["instances", "31"], "org"))).toEqual([{ id: "41" }]);
  expect(calls.slice(before)).toEqual([
    { method: "DELETE", path: "/app/projects/21/items/31", body: "" },
  ]);
});
