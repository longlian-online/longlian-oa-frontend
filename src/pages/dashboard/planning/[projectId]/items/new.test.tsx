// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, type ComponentProps, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import { ConfirmDialogProvider } from "@/components/ConfirmDialog";
import CreateProjectItemPage from "@/pages/dashboard/planning/[projectId]/items/new";
import { clearSession, saveSession } from "@/lib/session";

import type WorkflowCanvas from "@/components/WorkflowEditor/WorkflowCanvas";

vi.mock("@/components/WorkflowEditor/WorkflowCanvas", () => ({
  default: (props: ComponentProps<typeof WorkflowCanvas>): ReactElement => (
    <ul aria-label="流程节点">
      {props.nodes.map((node) => (
        <li key={node.localId}>
          <button type="button" onClick={() => props.onSelectNode(node.localId)}>
            {node.customName}
          </button>
          <span>{props.assigneeNames?.[node.localId] || "待接取"}</span>
        </li>
      ))}
    </ul>
  ),
}));

let root: Root;
let container: HTMLDivElement;
const calls: { method: string; path: string; body: string }[] = [];

beforeEach((): void => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  saveSession({ token: "token", userId: "1", defaultOrgId: "11" });
  calls.length = 0;
  vi.stubGlobal("fetch", async (input: string, init?: RequestInit): Promise<Response> => {
    const path = new URL(input, "http://localhost").pathname;
    const body = typeof init?.body === "string" ? init.body : "";
    calls.push({ method: init?.method ?? "GET", path, body });
    if (path === "/app/projects/21") {
      return json({ id: "21", title: "示例企划", isCreator: true });
    }
    if (path === "/app/task-template/options") {
      return json([
        {
          id: "7",
          name: "漫画汉化",
          nodes: [
            {
              baseTaskId: "1",
              baseTaskName: "翻译",
              baseTaskStatus: "ENABLED",
              sort: 1,
              parallelSort: 1,
            },
            {
              baseTaskId: "2",
              baseTaskName: "校对",
              baseTaskStatus: "ENABLED",
              sort: 2,
              parallelSort: 1,
            },
          ],
        },
      ]);
    }
    if (path === "/app/task/base/options") {
      return json([
        { id: "1", name: "翻译", status: "ENABLED" },
        { id: "2", name: "校对", status: "ENABLED" },
      ]);
    }
    if (path === "/app/members") {
      return json([{ userId: "8", nickname: "林夏" }]);
    }
    if (path === "/app/projects/21/items" && init?.method === "POST") return json(null);
    return json(null);
  });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach((): void => {
  act(() => root.unmount());
  container.remove();
  clearSession();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function json(data: unknown): Response {
  return new Response(JSON.stringify({ code: 0, data }), {
    headers: { "Content-Type": "application/json" },
  });
}

async function waitFor(assertion: () => void): Promise<void> {
  await vi.waitFor(async (): Promise<void> => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    assertion();
  });
}

function button(name: string): HTMLButtonElement {
  const found = [...document.querySelectorAll("button")].find(
    (entry) => entry.textContent?.trim() === name,
  );
  if (!found) throw new Error(`缺少按钮：${name}`);
  return found;
}

async function mount(): Promise<void> {
  const router = createMemoryRouter(
    [
      { path: "/dashboard/planning/:projectId/items/new", element: <CreateProjectItemPage /> },
      { path: "/dashboard/planning/:projectId", element: <p>企划详情</p> },
    ],
    { initialEntries: ["/dashboard/planning/21/items/new"] },
  );
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <ConfirmDialogProvider>
          <RouterProvider router={router} />
        </ConfirmDialogProvider>
      </QueryClientProvider>,
    );
  });
  await waitFor(() => expect(button("创建").disabled).toBe(true));
}

test("选择模板后指定执行人并一次创建", async (): Promise<void> => {
  await mount();
  expect(container.textContent).toContain("先选择流程模板");
  await act(async () => document.querySelector<HTMLElement>('[role="combobox"]')?.click());
  await waitFor(() => expect(document.body.textContent).toContain("漫画汉化"));
  await act(async () => {
    [...document.querySelectorAll<HTMLElement>('[role="option"]')]
      .find((option) => option.textContent?.includes("漫画汉化"))
      ?.click();
  });
  await waitFor(() => expect(container.textContent).toContain("翻译"));
  const title = document.querySelector("input");
  if (!title) throw new Error("缺少项目名");
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
      title,
      "第一话",
    );
    title.dispatchEvent(new Event("input", { bubbles: true }));
    document.querySelector<HTMLButtonElement>('[aria-label="流程节点"] button')?.click();
  });
  await waitFor(() => expect(document.body.textContent).toContain("执行人"));
  const assignee = document.querySelector<HTMLInputElement>("#assignee-tpl-1-1-1-0");
  if (!assignee) throw new Error("缺少执行人");
  await act(async () => assignee.click());
  await waitFor(() => expect(document.body.textContent).toContain("林夏"));
  await act(async () => {
    [...document.querySelectorAll<HTMLElement>('[role="option"]')]
      .find((option) => option.textContent?.includes("林夏"))
      ?.click();
  });
  await waitFor(() => expect(container.textContent).toContain("林夏"));
  expect(button("创建").disabled).toBe(false);
  await act(async () => button("创建").click());
  await waitFor(() => expect(container.textContent).toContain("企划详情"));
  const created = calls.find((call) => call.method === "POST");
  expect(JSON.parse(created?.body ?? "{}")).toEqual({
    title: "第一话",
    taskTemplateId: "7",
    nodes: [
      { baseTaskId: "1", sort: 1, parallelSort: 1, name: "翻译", assigneeId: "8" },
      { baseTaskId: "2", sort: 2, parallelSort: 1, name: "校对" },
    ],
  });
});
