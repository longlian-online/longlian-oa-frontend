// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import { ConfirmDialogProvider } from "@/components/ConfirmDialog";
import { clearSession, saveSession } from "@/lib/session";
import ProjectDetail from "@/pages/dashboard/planning/[projectId]";

let root: Root;
let container: HTMLDivElement;
let client: QueryClient;
let isCreator: boolean;
let hasItems: boolean;
const calls: { method: string; path: string; body: string }[] = [];
const getAnimations = Object.getOwnPropertyDescriptor(Element.prototype, "getAnimations");

function Address(): ReactElement {
  const location = useLocation();
  return <output aria-label="地址">{location.pathname}</output>;
}

beforeEach((): void => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  saveSession({ token: "test-token", userId: "1", defaultOrgId: "11" });
  isCreator = true;
  hasItems = false;
  calls.length = 0;
  Object.defineProperty(Element.prototype, "getAnimations", {
    configurable: true,
    value: (): [] => [],
  });
  vi.stubGlobal("fetch", async (input: string, init?: RequestInit): Promise<Response> => {
    const url = new URL(input, "http://localhost");
    const method = init?.method ?? "GET";
    calls.push({
      method,
      path: url.pathname,
      body: typeof init?.body === "string" ? init.body : "",
    });
    if (method === "GET" && url.pathname === "/app/projects/21") {
      return json({
        id: 21,
        title: "春季企划",
        typeName: "漫画",
        status: "进行中",
        progressPercent: 0,
        claimedTaskCount: 0,
        pendingTaskCount: 0,
        inWorkshop: true,
        isCreator,
        hasItems,
      });
    }
    if (method === "GET" && url.pathname === "/app/projects/21/items") {
      return json({ list: [], total: 0 });
    }
    if (method === "DELETE" && url.pathname === "/app/projects/21") return json(null);
    if (method === "POST" && url.pathname === "/app/projects/21/deletion-requests")
      return json(null);
    throw new Error(`未预期请求：${method} ${url.pathname}`);
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

function json(data: unknown): Response {
  return new Response(JSON.stringify({ code: 0, data }), {
    headers: { "Content-Type": "application/json" },
  });
}

async function mount(): Promise<void> {
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <ConfirmDialogProvider>
          <MemoryRouter initialEntries={["/dashboard/planning/21"]}>
            <Address />
            <Routes>
              <Route path="/dashboard/planning/:projectId" element={<ProjectDetail />} />
              <Route path="/dashboard/planning" element={<div>企划列表</div>} />
            </Routes>
          </MemoryRouter>
        </ConfirmDialogProvider>
      </QueryClientProvider>,
    );
  });
  await waitFor(() => expect(document.body.textContent).toContain("春季企划"));
}

function button(name: string): HTMLButtonElement | undefined {
  return [...document.querySelectorAll("button")].find(
    (entry) => entry.textContent?.replace(/\s+/g, "") === name,
  );
}

async function waitFor(assertion: () => void): Promise<void> {
  await vi.waitFor(async (): Promise<void> => {
    await act(async (): Promise<void> => {
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 20);
      });
    });
    assertion();
  });
}

test("负责人直接看到删除企划，确认后删除并回到列表", async (): Promise<void> => {
  await mount();
  const remove = button("删除企划");
  expect(remove).toBeDefined();
  await act(async () => remove?.click());
  await waitFor(() =>
    expect(document.body.textContent).toContain("删除后「春季企划」将不可恢复。"),
  );
  await act(async () => button("删除")?.click());
  await waitFor(() => {
    expect(calls.some((call) => call.method === "DELETE" && call.path === "/app/projects/21")).toBe(
      true,
    );
    expect(document.querySelector("output")?.textContent).toBe("/dashboard/planning");
  });
  expect(calls.some((call) => call.path.endsWith("/deletion-requests"))).toBe(false);
});

test("已有项目时改为提交删除申请", async (): Promise<void> => {
  hasItems = true;
  await mount();
  await act(async () => button("删除企划")?.click());
  await waitFor(() =>
    expect(document.body.textContent).toContain("由于企划中已存在项目，删除需要管理员审核"),
  );
  const reason = document.querySelector("textarea");
  if (!reason) throw new Error("缺少删除原因");
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(
      reason,
      "  不再继续  ",
    );
    reason.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => button("提交申请")?.click());
  await waitFor(() =>
    expect(
      calls.some(
        (call) =>
          call.method === "POST" &&
          call.path === "/app/projects/21/deletion-requests" &&
          call.body === JSON.stringify({ reason: "不再继续" }),
      ),
    ).toBe(true),
  );
  expect(calls.some((call) => call.method === "DELETE")).toBe(false);
  expect(document.querySelector("output")?.textContent).toBe("/dashboard/planning/21");
});

test("非负责人看不到删除企划", async (): Promise<void> => {
  isCreator = false;
  await mount();
  expect(button("删除企划")).toBeUndefined();
  expect(calls.some((call) => call.method !== "GET")).toBe(false);
});
