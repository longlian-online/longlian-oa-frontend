// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import { ConfirmDialogProvider } from "@/components/ConfirmDialog";
import ProjectItemSection from "@/components/ProjectItem";
import { clearSession, saveSession } from "@/lib/session";

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

function deferred<T>(): Deferred<T> {
  // 项目的 ES2023 类型目标尚不提供 Promise.withResolvers。
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

interface ListedItem {
  id: string;
  title: string;
  hasSubmittedTask: boolean;
}

let root: Root;
let container: HTMLDivElement;
let client: QueryClient;
let response: Deferred<Response>;
let exitAnimation: Deferred<void>;
let creates: number;
let listed: ListedItem[];
const calls: { method: string; path: string; body: string }[] = [];
const getAnimations = Object.getOwnPropertyDescriptor(Element.prototype, "getAnimations");

beforeEach((): void => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  saveSession({ token: "test-token", userId: "1", defaultOrgId: "11" });
  response = deferred<Response>();
  exitAnimation = deferred<void>();
  creates = 0;
  listed = [];
  calls.length = 0;
  // happy-dom 不执行 CSS 动画；在浏览器动画边界保留真正的弹窗 DOM。
  Object.defineProperty(Element.prototype, "getAnimations", {
    configurable: true,
    value: function (this: Element): { finished: Promise<void> }[] {
      return this.matches('[role="dialog"][data-closed]')
        ? [{ finished: exitAnimation.promise }]
        : [];
    },
  });
  vi.stubGlobal("fetch", async (input: string, init?: RequestInit): Promise<Response> => {
    const path = new URL(input, "http://localhost").pathname;
    calls.push({
      method: init?.method ?? "GET",
      path,
      body: typeof init?.body === "string" ? init.body : "",
    });
    if (path === "/app/projects/21/items") {
      if (init?.method === "POST") {
        creates += 1;
        return response.promise;
      }
      return new Response(
        JSON.stringify({
          code: 0,
          data: {
            list: listed.map((item) => ({
              id: item.id,
              title: item.title,
              createdAt: "2026-10-01 00:00:00",
              updatedAt: "2026-10-01 00:00:00",
              progressPercent: 0,
              hasSubmittedTask: item.hasSubmittedTask,
              nodes: [],
            })),
            total: listed.length,
          },
        }),
      );
    }
    if (path === "/app/projects/21/items/31" && init?.method === "DELETE") {
      listed = listed.filter((item) => item.id !== "31");
      return new Response(JSON.stringify({ code: 0, data: null }));
    }
    if (path === "/app/projects/21/items/31/deletion-requests" && init?.method === "POST") {
      return new Response(JSON.stringify({ code: 0, data: null }));
    }
    if (path === "/app/task-template/options") {
      return new Response(JSON.stringify({ code: 0, data: [{ id: "31", name: "长工作流" }] }));
    }
    throw new Error(`未预期请求：${init?.method ?? "GET"} ${path}`);
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

async function waitFor(assertion: () => void): Promise<void> {
  await vi.waitFor(async (): Promise<void> => {
    await act(async () => {
      const tick = deferred<void>();
      setTimeout(tick.resolve, 20);
      await tick.promise;
    });
    assertion();
  });
}

function button(name: string, scope: ParentNode = document): HTMLButtonElement {
  const found = Array.from(scope.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === name,
  );
  if (!found) throw new Error(`缺少按钮：${name}`);
  return found;
}

function dialog(): HTMLElement {
  const found = document.querySelector<HTMLElement>('[role="dialog"]');
  if (!found) throw new Error("缺少创建弹窗");
  return found;
}

async function fillForm(): Promise<void> {
  await act(async () => button("创建项目").click());
  await waitFor(() =>
    expect(dialog().querySelector('[role="combobox"]')?.hasAttribute("disabled")).toBe(false),
  );
  const input = dialog().querySelector("input");
  if (!input) throw new Error("缺少项目名输入框");
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
      input,
      "第一话",
    );
    input.dispatchEvent(new Event("input", { bubbles: true }));
    const select = dialog().querySelector<HTMLElement>('[role="combobox"]');
    select?.click();
  });
  await waitFor(() => expect(document.querySelector('[role="option"]')).not.toBeNull());
  await act(async () => document.querySelector<HTMLElement>('[role="option"]')?.click());
  expect(button("创建", dialog()).disabled).toBe(false);
}

function labeled(name: string): HTMLButtonElement | undefined {
  return [...document.querySelectorAll("button")].find(
    (entry) => entry.getAttribute("aria-label") === name,
  );
}

async function mount(isCreator = true): Promise<void> {
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <ConfirmDialogProvider>
            <ProjectItemSection projectId="21" isCreator={isCreator} />
          </ConfirmDialogProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  });
  await waitFor(() => expect(container.textContent).toContain(listed[0]?.title ?? "暂无项目"));
}

test("成功关闭动画期间不能再次创建，重新打开后可创建新项目", async (): Promise<void> => {
  await mount();
  await fillForm();
  const popup = dialog();
  const submit = button("创建", popup);
  await act(async () => {
    submit.click();
    submit.click();
  });
  expect(creates).toBe(1);
  await waitFor(() => expect(submit.disabled).toBe(true));
  await act(async () => response.resolve(new Response('{"code":0}')));
  await waitFor(() => expect(popup.hasAttribute("data-closed")).toBe(true));
  expect(popup.isConnected).toBe(true);
  expect(submit.disabled).toBe(true);
  await act(async () => submit.click());
  expect(creates).toBe(1);

  await act(async () => exitAnimation.resolve());
  await waitFor(() => expect(popup.isConnected).toBe(false));
  await fillForm();
  await act(async () => button("创建", dialog()).click());
  await waitFor(() => expect(creates).toBe(2));
});

test("创建失败保留表单并允许直接重试", async (): Promise<void> => {
  await mount();
  await fillForm();
  const popup = dialog();
  const submit = button("创建", popup);
  await act(async () => submit.click());
  await waitFor(() => expect(submit.disabled).toBe(true));
  await act(async () => response.resolve(new Response('{"code":400,"msg":"创建失败"}')));
  await waitFor(() => expect(submit.disabled).toBe(false));
  expect(popup.hasAttribute("data-closed")).toBe(false);
  expect(popup.querySelector("input")?.value).toBe("第一话");
  expect(popup.querySelector('[role="combobox"]')?.textContent).toContain("长工作流");

  response = deferred<Response>();
  await act(async () => submit.click());
  expect(creates).toBe(2);
  await act(async () => response.resolve(new Response('{"code":0}')));
  await waitFor(() => expect(popup.hasAttribute("data-closed")).toBe(true));
  expect(submit.disabled).toBe(true);
});

test("没有已提交任务时负责人确认后直接删除", async (): Promise<void> => {
  listed = [{ id: "31", title: "第一话", hasSubmittedTask: false }];
  await mount();
  await act(async () => labeled("删除项目：第一话")?.click());
  expect(document.body.textContent).toContain("删除后「第一话」的流程与任务记录将不可恢复。");
  await act(async () => button("删除").click());
  await waitFor(() => {
    expect(calls).toContainEqual({ method: "DELETE", path: "/app/projects/21/items/31", body: "" });
    expect(container.textContent).toContain("暂无项目");
  });
});

test("已有已提交任务时填写原因后提交删除申请", async (): Promise<void> => {
  listed = [{ id: "31", title: "第一话", hasSubmittedTask: true }];
  await mount();
  await act(async () => labeled("删除项目：第一话")?.click());
  expect(document.body.textContent).toContain("由于项目存在已提交任务，删除需要管理员审核");
  expect(button("提交申请", dialog()).disabled).toBe(true);
  const reason = dialog().querySelector("textarea");
  if (!reason) throw new Error("缺少删除原因");
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(
      reason,
      "  重复创建  ",
    );
    reason.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => button("提交申请", dialog()).click());
  await waitFor(() =>
    expect(calls).toContainEqual({
      method: "POST",
      path: "/app/projects/21/items/31/deletion-requests",
      body: JSON.stringify({ reason: "重复创建" }),
    }),
  );
  expect(calls.some((call) => call.method === "DELETE")).toBe(false);
});

test("非负责人不显示项目删除", async (): Promise<void> => {
  listed = [
    { id: "31", title: "第一话", hasSubmittedTask: false },
    { id: "32", title: "第二话", hasSubmittedTask: true },
  ];
  await mount(false);
  expect(labeled("删除项目：第一话")).toBeUndefined();
  expect(labeled("删除项目：第二话")).toBeUndefined();
});
