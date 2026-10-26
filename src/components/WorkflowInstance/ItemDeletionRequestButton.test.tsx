// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, useLocation } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import { ConfirmDialogProvider } from "@/components/ConfirmDialog";
import { clearSession, saveSession } from "@/lib/session";
import ItemDeletionRequestButton from "./ItemDeletionRequestButton";

let root: Root;
let container: HTMLDivElement;
let client: QueryClient;
const calls: { method: string; path: string; body: string }[] = [];
const getAnimations = Object.getOwnPropertyDescriptor(Element.prototype, "getAnimations");

beforeEach((): void => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  saveSession({ token: "test-token", userId: "1", defaultOrgId: "11" });
  calls.length = 0;
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
    return new Response(JSON.stringify({ code: 0, data: null }), {
      headers: { "Content-Type": "application/json" },
    });
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

async function mount(hasSubmittedTask: boolean): Promise<void> {
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <ConfirmDialogProvider>
          <MemoryRouter initialEntries={["/dashboard/planning/21/items/31"]}>
            <Address />
            <ItemDeletionRequestButton
              projectId="21"
              itemId="31"
              itemTitle="第一话"
              hasSubmittedTask={hasSubmittedTask}
            />
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

test("没有已提交任务时确认后直接删除并回到企划详情", async (): Promise<void> => {
  await mount(false);
  await act(async () => button("删除项目")?.click());
  expect(document.body.textContent).toContain("删除后「第一话」的流程与任务记录将不可恢复。");
  await act(async () => button("删除")?.click());
  await vi.waitFor(() => {
    expect(calls).toEqual([{ method: "DELETE", path: "/app/projects/21/items/31", body: "" }]);
    expect(document.querySelector("output")?.textContent).toBe("/dashboard/planning/21");
  });
});
