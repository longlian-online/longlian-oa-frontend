// @vitest-environment happy-dom
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { act, type ComponentProps, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createMemoryRouter, RouterProvider, type RouterProviderProps } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";

import { ConfirmDialogProvider } from "@/components/ConfirmDialog";
import { CurrentUserProvider } from "@/hooks/useCurrentUser";
import { createQueryClient } from "@/lib/queryClient";
import { clearSession, saveSession } from "@/lib/session";
import CreateProject from "@/pages/dashboard/planning/create";
import CreateWorkflowPage from "@/pages/dashboard/workshop/create";
import OrganizationAdminCreateWorkflowPage from "@/pages/dashboard/org-admin/create";

import type FileUpload from "@/components/FileUpload";
import type WorkflowCanvas from "@/components/WorkflowEditor/WorkflowCanvas";

const { tip, notify } = vi.hoisted(() => ({ tip: vi.fn(), notify: vi.fn() }));
vi.mock("@/components/tip", () => ({ $tip: tip }));
vi.mock("@/services/notification", () => ({
  notificationService: { notify },
  GATEWAY_ERROR_MESSAGE: "网关异常",
  NETWORK_ERROR_MESSAGE: "网络异常",
}));
// 只替换画布布局，不创建节点，不代替真实编辑器的校验或序列化。
vi.mock("@/components/WorkflowEditor/WorkflowCanvas", () => ({
  default: (props: ComponentProps<typeof WorkflowCanvas>): ReactElement => (
    <ul aria-label="流程节点">
      {props.nodes.map((node) => (
        <li key={node.localId}>
          {node.customName ||
            props.baseTasks.find((task) => String(task.id) === node.baseTaskId)?.name}
        </li>
      ))}
    </ul>
  ),
}));
// 上传完成边界不提供 previewUrl，避免引入裁剪、缩略图和额外上传请求。
vi.mock("@/components/FileUpload", () => ({
  default: (props: ComponentProps<typeof FileUpload>): ReactElement => (
    <button
      type="button"
      onClick={() =>
        props.onChange({
          fileId: "91",
          fileName: "cover.png",
          fileSize: 1,
          fileMime: "image/png",
        })
      }
    >
      上传已完成
    </button>
  ),
}));

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete): void => {
    resolve = complete;
  });
  return { promise, resolve };
}
function ok(data: unknown = null): Response {
  return new Response(JSON.stringify({ code: 0, data }), {
    headers: { "Content-Type": "application/json" },
  });
}
function failure(): Response {
  return new Response(JSON.stringify({ code: 2, msg: "创建失败，请重试" }), {
    headers: { "Content-Type": "application/json" },
  });
}

interface Entry {
  name: string;
  createUrl: string;
  destination: string;
  createPath: string;
  titlePlaceholder: string;
  descriptionPlaceholder: string;
  saveLabel: string;
  element: ReactElement;
  organization?: boolean;
}
const entries: Entry[] = [
  {
    name: "企划",
    createUrl: "/dashboard/planning/create",
    destination: "/dashboard/planning",
    createPath: "/app/projects",
    titlePlaceholder: "企划名",
    descriptionPlaceholder: "介绍作品来源、当前进度、协作注意事项等",
    saveLabel: "创建企划",
    element: <CreateProject />,
  },
  {
    name: "工坊流程",
    createUrl: "/dashboard/workshop/create",
    destination: "/dashboard/workshop/workflows",
    createPath: "/app/workshop/task-template",
    titlePlaceholder: "请输入流程名",
    descriptionPlaceholder: "描述流程适用场景",
    saveLabel: "创建",
    element: <CreateWorkflowPage />,
  },
  {
    name: "组织流程",
    createUrl: "/dashboard/org-admin/create",
    destination: "/dashboard/org-admin/workflows",
    createPath: "/orgadmin/task/template",
    titlePlaceholder: "请输入流程名",
    descriptionPlaceholder: "描述流程适用场景",
    saveLabel: "创建",
    element: <OrganizationAdminCreateWorkflowPage />,
    organization: true,
  },
];

interface SaveRequest {
  method: string;
  path: string;
  body: unknown;
  response: Deferred<Response>;
}
let root: Root;
let container: HTMLDivElement;
let client: QueryClient;
let router: RouterProviderProps["router"] | undefined;
let requests: SaveRequest[];
let gates: Deferred<null>[];
let unexpectedRequests: string[];

beforeEach((): void => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  localStorage.clear();
  saveSession({
    token: "create-test-token",
    userId: "1",
    defaultOrgId: "41",
    role: "ORG_ADMIN",
  });
  tip.mockClear();
  notify.mockClear();
  router = undefined;
  requests = [];
  gates = [];
  unexpectedRequests = [];
  client = createQueryClient();
  const send = vi.fn(async (input: string, init?: RequestInit): Promise<Response> => {
    const method = init?.method ?? "GET";
    const path = new URL(input, "http://localhost").pathname;
    const isCreate = method === "POST" && entries.some((entry) => entry.createPath === path);
    const isEdit =
      method === "PUT" &&
      (path === "/orgadmin/task/template/A" || path === "/orgadmin/task/template/B");
    if (isCreate || isEdit) {
      const response = deferred<Response>();
      if (typeof init?.body !== "string") throw new Error("保存请求必须包含 JSON body");
      requests.push({ method, path, body: JSON.parse(init.body) as unknown, response });
      return response.promise;
    }
    if (method === "GET" && path === "/app/user/") {
      return ok({
        id: "1",
        username: "creator",
        nickname: "创建者",
        email: null,
        defaultOrgId: "41",
      });
    }
    if (method === "GET" && path === "/app/preset-tags") {
      return ok([]);
    }
    if (method === "GET" && path === "/app/projects/types") {
      return ok([{ id: "7", name: "漫画" }]);
    }
    if (method === "POST" && path === "/orgadmin/task/base/list") {
      return ok({
        list: [
          {
            id: "11",
            name: "翻译",
            submitFields: [],
            refCount: 0,
            status: "ENABLED",
            createdAt: "2026-10-21 10:00:00",
          },
        ],
        total: 1,
        pageNum: 1,
        pageSize: 100,
        hasNext: false,
      });
    }
    if (
      method === "GET" &&
      (path === "/orgadmin/task/template/A" || path === "/orgadmin/task/template/B")
    ) {
      const id = path.endsWith("/A") ? "A" : "B";
      return ok({
        id,
        name: `流程${id}`,
        refCount: 0,
        status: "ENABLED",
        nodes: [{ baseTaskId: "11", sort: 1, parallelSort: 1, submitFields: [] }],
      });
    }
    const unexpected = `${method} ${path}`;
    unexpectedRequests.push(unexpected);
    throw new Error(`未预期的请求：${unexpected}`);
  });
  vi.stubGlobal("fetch", send);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async (): Promise<void> => {
  try {
    await act(async (): Promise<void> => {
      root.unmount();
      router?.dispose();
      // 即使断言中途失败，也结束每个网络 deferred 和导航 loader。
      for (const request of requests) request.response.resolve(failure());
      for (const gate of gates) gate.resolve(null);
    });
    await waitFor(() => expect(client.isMutating()).toBe(0));
  } finally {
    container.remove();
    client.clear();
    clearSession();
    localStorage.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  }
  expect(unexpectedRequests).toEqual([]);
});

async function waitFor(assertion: () => void): Promise<void> {
  await vi.waitFor(async (): Promise<void> => {
    await act(async (): Promise<void> => {});
    assertion();
  });
}
function button(label: string): HTMLButtonElement {
  const found = Array.from(container.querySelectorAll("button")).find(
    (element) =>
      element.textContent?.trim() === label || element.getAttribute("aria-label") === label,
  );
  if (!found) throw new Error(`缺少按钮：${label}`);
  return found;
}
function field(placeholder: string): HTMLInputElement | HTMLTextAreaElement {
  const found = Array.from(container.querySelectorAll("input, textarea")).find(
    (element) =>
      element.getAttribute("placeholder") === placeholder ||
      element.getAttribute("aria-label") === placeholder,
  );
  if (!(found instanceof HTMLInputElement || found instanceof HTMLTextAreaElement)) {
    throw new Error(`缺少输入框：${placeholder}`);
  }
  return found;
}
function inputValue(placeholder: string, value: string): void {
  const target = field(placeholder);
  const prototype =
    target instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set?.bind(target);
  if (!setter) throw new Error("缺少原生 value setter");
  setter(value);
  target.dispatchEvent(new Event("input", { bubbles: true }));
}
function click(target: HTMLElement): void {
  target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}
function creations(entry: Entry): SaveRequest[] {
  return requests.filter(
    (request) => request.method === "POST" && request.path === entry.createPath,
  );
}
function edits(id: "A" | "B"): SaveRequest[] {
  return requests.filter(
    (request) => request.method === "PUT" && request.path === `/orgadmin/task/template/${id}`,
  );
}
function currentRouter(): RouterProviderProps["router"] {
  if (!router) throw new Error("路由尚未挂载");
  return router;
}
async function mount(entry: Entry, initialUrl = entry.createUrl): Promise<void> {
  router = createMemoryRouter(
    [
      { path: entry.createUrl, element: entry.element },
      {
        path: entry.destination,
        loader: (): Promise<null> => {
          const gate = deferred<null>();
          gates.push(gate);
          return gate.promise;
        },
        element: <h1>{entry.name}列表</h1>,
      },
      { path: "/test-exit", element: <h1>已离开表单</h1> },
    ],
    { initialEntries: [initialUrl] },
  );
  const content = (
    <ConfirmDialogProvider>
      <RouterProvider router={router} />
    </ConfirmDialogProvider>
  );
  await act(async (): Promise<void> => {
    root.render(
      <QueryClientProvider client={client}>
        {entry.organization ? <CurrentUserProvider>{content}</CurrentUserProvider> : content}
      </QueryClientProvider>,
    );
  });
  await waitFor(() => expect(field(entry.titlePlaceholder).isConnected).toBe(true));
}
async function fill(entry: Entry): Promise<void> {
  act(() => inputValue(entry.titlePlaceholder, `${entry.name}草稿`));
  act(() => inputValue(entry.descriptionPlaceholder, "保留这份简介"));
  if (entry.createPath === "/app/projects") {
    const title = field(entry.titlePlaceholder);
    expect(title.hasAttribute("placeholder")).toBe(false);
    expect(container.textContent).not.toContain("填写基础信息、封面、缩略图与标签");
    expect(container.textContent).not.toContain("更新基础信息、封面、缩略图与标签");
    expect(container.textContent).not.toContain("每项是名称和值");
    expect(container.textContent).not.toContain("值可留空作为纯标签");
    expect(container.textContent).not.toContain("自定义，不随封面更新");
    const trigger = container.querySelector<HTMLButtonElement>('[data-slot="select-trigger"]');
    if (!trigger) throw new Error("缺少企划类型选择器");
    await waitFor(() => expect(trigger.disabled).toBe(false));
    await act(async (): Promise<void> => click(trigger));
    await waitFor(() =>
      expect(
        Array.from(document.body.querySelectorAll('[role="option"]')).some(
          (option) => option.textContent?.trim() === "漫画",
        ),
      ).toBe(true),
    );
    const option = Array.from(document.body.querySelectorAll<HTMLElement>('[role="option"]')).find(
      (element) => element.textContent?.trim() === "漫画",
    );
    if (!option) throw new Error("缺少真实类型选项：漫画");
    await act(async (): Promise<void> => click(option));
    await waitFor(() => expect(trigger.textContent).toContain("漫画"));
    act(() => click(button("上传已完成")));
  } else {
    await waitFor(() => expect(button("添加翻译节点").disabled).toBe(false));
    act(() => click(button("添加翻译节点")));
    expect(container.querySelectorAll('[aria-label="流程节点"] li')).toHaveLength(1);
  }
  expect(field(entry.titlePlaceholder).value).toBe(`${entry.name}草稿`);
  expect(field(entry.descriptionPlaceholder).value).toBe("保留这份简介");
  expect(button(entry.saveLabel).disabled).toBe(false);
}
async function respond(request: SaveRequest, response: Response): Promise<void> {
  await act(async (): Promise<void> => request.response.resolve(response));
}
async function expectWaiting(
  entry: Entry,
  target: HTMLButtonElement,
  count: number,
): Promise<void> {
  await waitFor(() => {
    expect(currentRouter().state.navigation.state).toBe("loading");
    expect(currentRouter().state.navigation.location?.pathname).toBe(entry.destination);
    expect(currentRouter().state.location.pathname).toBe(entry.createUrl);
    expect(gates.length).toBeGreaterThan(0);
    expect(target.isConnected).toBe(true);
    expect(target.disabled).toBe(true);
  });
  // 独立事件周期，旧表单仍挂载；不能用页面卸载代替成功锁的验收。
  act(() => click(target));
  await act(async (): Promise<void> => {});
  expect(creations(entry)).toHaveLength(count);
  expect(target.disabled).toBe(true);
}
async function finishNavigation(entry: Entry): Promise<void> {
  await act(async (): Promise<void> => {
    for (const gate of gates) gate.resolve(null);
  });
  await waitFor(() => {
    expect(currentRouter().state.navigation.state).toBe("idle");
    expect(currentRouter().state.location.pathname).toBe(entry.destination);
    expect(container.querySelector("h1")?.textContent).toBe(`${entry.name}列表`);
  });
}

for (const entry of entries) {
  describe(entry.name, () => {
    test("同一周期及下一周期在途连点均只保存一次", async (): Promise<void> => {
      await mount(entry);
      await fill(entry);
      const target = button(entry.saveLabel);
      act(() => {
        click(target);
        click(target);
      });
      await waitFor(() => {
        expect(creations(entry)).toHaveLength(1);
        expect(target.disabled).toBe(true);
      });
      act(() => click(target));
      await act(async (): Promise<void> => {});
      expect(creations(entry)).toHaveLength(1);
      expect(tip).not.toHaveBeenCalled();
      await respond(creations(entry)[0]!, ok());
      await expectWaiting(entry, target, 1);
      await finishNavigation(entry);
      expect(creations(entry)).toHaveLength(1);
      expect(notify).not.toHaveBeenCalled();
    });

    test("成功后等待或取消导航仍锁存，离开重进后新表单可保存", async (): Promise<void> => {
      await mount(entry);
      await fill(entry);
      const target = button(entry.saveLabel);
      act(() => click(target));
      await waitFor(() => expect(creations(entry)).toHaveLength(1));
      await respond(creations(entry)[0]!, ok());
      await expectWaiting(entry, target, 1);
      expect(tip).toHaveBeenCalledTimes(1);

      await act(async (): Promise<void> => {
        await currentRouter().navigate(entry.createUrl);
      });
      await waitFor(() => {
        expect(currentRouter().state.navigation.state).toBe("idle");
        expect(currentRouter().state.location.pathname).toBe(entry.createUrl);
        expect(button(entry.saveLabel)).toBe(target);
        expect(target.disabled).toBe(true);
      });
      act(() => click(target));
      await act(async (): Promise<void> => {});
      expect(creations(entry)).toHaveLength(1);
      // 被取消的 loader 迟到完成也不能让已保存表单恢复资格。
      await act(async (): Promise<void> => {
        for (const gate of gates) gate.resolve(null);
      });
      expect(currentRouter().state.location.pathname).toBe(entry.createUrl);
      expect(target.isConnected).toBe(true);
      expect(target.disabled).toBe(true);

      await act(async (): Promise<void> => {
        await currentRouter().navigate("/test-exit");
      });
      expect(target.isConnected).toBe(false);
      expect(container.querySelector("h1")?.textContent).toBe("已离开表单");
      await act(async (): Promise<void> => {
        await currentRouter().navigate(entry.createUrl);
      });
      await fill(entry);
      const freshTarget = button(entry.saveLabel);
      expect(freshTarget).not.toBe(target);
      act(() => click(freshTarget));
      await waitFor(() => expect(creations(entry)).toHaveLength(2));
      await respond(creations(entry)[1]!, ok());
      await expectWaiting(entry, freshTarget, 2);
      await finishNavigation(entry);
      expect(creations(entry)).toHaveLength(2);
    });

    test("业务失败保留完整草稿，直接重试成功后不允许第三次保存", async (): Promise<void> => {
      await mount(entry);
      await fill(entry);
      const target = button(entry.saveLabel);
      act(() => click(target));
      await waitFor(() => expect(creations(entry)).toHaveLength(1));
      const first = creations(entry)[0]!;
      await respond(first, failure());
      await waitFor(() => {
        expect(client.isMutating()).toBe(0);
        expect(target.disabled).toBe(false);
      });
      expect(currentRouter().state.location.pathname).toBe(entry.createUrl);
      expect(currentRouter().state.navigation.state).toBe("idle");
      expect(field(entry.titlePlaceholder).value).toBe(`${entry.name}草稿`);
      expect(field(entry.descriptionPlaceholder).value).toBe("保留这份简介");
      expect(tip).not.toHaveBeenCalled();
      expect(notify).toHaveBeenCalledTimes(1);
      if (entry.createPath !== "/app/projects") {
        expect(container.querySelectorAll('[aria-label="流程节点"] li')).toHaveLength(1);
      }
      // 不重填输入、不重传封面、不重加节点，真实 handler 直接重试。
      act(() => click(target));
      await waitFor(() => expect(creations(entry)).toHaveLength(2));
      expect(creations(entry)[1]!.body).toEqual(first.body);
      await respond(creations(entry)[1]!, ok());
      await expectWaiting(entry, target, 2);
      await finishNavigation(entry);
      expect(creations(entry)).toHaveLength(2);
      expect(tip).toHaveBeenCalledTimes(1);
    });
  });
}

test("组织模板 A 保存后切换 B，A 的迟到成功不能污染 B 的在途保存", async (): Promise<void> => {
  const entry = entries[2]!;
  await mount(entry, `${entry.createUrl}?templateId=A`);
  await waitFor(() => {
    expect(field(entry.titlePlaceholder).value).toBe("流程A");
    expect(container.querySelectorAll('[aria-label="流程节点"] li')).toHaveLength(1);
    expect(container.querySelector('[aria-label="流程节点"]')?.textContent).toContain("翻译");
    expect(button("更新").disabled).toBe(false);
  });
  const targetA = button("更新");
  act(() => click(targetA));
  await waitFor(() => {
    expect(edits("A")).toHaveLength(1);
    expect(targetA.disabled).toBe(true);
  });

  await act(async (): Promise<void> => {
    await currentRouter().navigate(`${entry.createUrl}?templateId=B`);
  });
  await waitFor(() => {
    expect(field(entry.titlePlaceholder).value).toBe("流程B");
    expect(container.querySelectorAll('[aria-label="流程节点"] li')).toHaveLength(1);
    expect(container.querySelector('[aria-label="流程节点"]')?.textContent).toContain("翻译");
    expect(button("更新").disabled).toBe(false);
  });
  const targetB = button("更新");
  expect(targetB).not.toBe(targetA);
  expect(targetA.isConnected).toBe(false);
  act(() => click(targetB));
  await waitFor(() => {
    expect(edits("B")).toHaveLength(1);
    expect(targetB.disabled).toBe(true);
  });
  expect(edits("A")[0]!.body).toMatchObject({ name: "流程A" });
  expect(edits("B")[0]!.body).toMatchObject({ name: "流程B" });
  expect(targetB.disabled).toBe(true);

  await respond(edits("A")[0]!, ok());
  await waitFor(() => expect(client.isMutating()).toBe(1));
  expect(currentRouter().state.location.search).toBe("?templateId=B");
  expect(currentRouter().state.navigation.state).toBe("idle");
  expect(field(entry.titlePlaceholder).value).toBe("流程B");
  expect(tip).not.toHaveBeenCalled();
  expect(notify).not.toHaveBeenCalled();
  expect(targetB.isConnected).toBe(true);
  expect(targetB.disabled).toBe(true);
  act(() => click(targetB));
  await act(async (): Promise<void> => {});
  expect(edits("A")).toHaveLength(1);
  expect(edits("B")).toHaveLength(1);
  expect(creations(entry)).toHaveLength(0);

  await respond(edits("B")[0]!, ok());
  await expectWaiting(entry, targetB, 0);
  expect(currentRouter().state.location.search).toBe("?templateId=B");
  expect(edits("B")).toHaveLength(1);
  expect(tip).toHaveBeenCalledTimes(1);
  expect(notify).not.toHaveBeenCalled();
  await finishNavigation(entry);
  expect(edits("A")).toHaveLength(1);
  expect(edits("B")).toHaveLength(1);
  expect(creations(entry)).toHaveLength(0);
});
