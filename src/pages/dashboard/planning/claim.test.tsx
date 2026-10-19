// @vitest-environment happy-dom
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { act, type ComponentProps, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi, type Mock } from "vite-plus/test";

import { ConfirmDialogProvider } from "@/components/ConfirmDialog";
import WorkflowInstance from "@/components/WorkflowInstance";
import TaskNodeCard from "@/components/WorkflowInstance/TaskNodeCard";
import { createQueryClient } from "@/lib/queryClient";
import { scopedKey } from "@/lib/queryKeys";
import { clearSession, saveCurrentOrganization, saveSession } from "@/lib/session";
import { itemFlowQuery, itemInstancesQuery, plazaListQuery } from "@/queries/planning";
import TaskPlaza from "@/pages/dashboard/planning/shortage";

import type TaskFlowViewer from "@/components/WorkflowInstance/TaskFlowViewer";
import type { PageResult } from "@/types/planning";
import type { PlazaProjectGroup } from "@/types/plaza";
import type {
  ItemTaskFlowVO,
  ItemTaskInstanceVO,
  TaskInstanceDetailVO,
} from "@/types/workflowInstance";

const { tip, notify } = vi.hoisted(() => ({ tip: vi.fn(), notify: vi.fn() }));
vi.mock("@/components/tip", () => ({ $tip: tip }));
vi.mock("@/services/notification", () => ({
  notificationService: { notify },
  GATEWAY_ERROR_MESSAGE: "网关异常",
  NETWORK_ERROR_MESSAGE: "网络异常",
}));
// 只替换依赖画布测量的布局；卡片、详情、API、Mutation 和失效刷新均使用真实实现。
vi.mock("@/components/WorkflowInstance/TaskFlowViewer", () => ({
  default: (props: ComponentProps<typeof TaskFlowViewer>): ReactElement => (
    <div data-testid="workflow-cards">
      {props.nodes.map((node) => (
        <TaskNodeCard
          key={node.id}
          node={node}
          instance={props.instances.find((instance) => instance.id === node.taskInstanceId)}
          currentUserId={props.currentUserId}
          selected={props.selectedNodeId === node.id}
          onSelect={() => props.onSelectNode(node.id)}
          mutating={props.mutatingInstanceId === node.taskInstanceId}
          canSubmit={false}
          onClaim={props.onClaim}
          onSubmit={props.onSubmit}
        />
      ))}
    </div>
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
function ok(data: unknown): Response {
  return new Response(JSON.stringify({ code: 0, data }), {
    headers: { "Content-Type": "application/json" },
  });
}
function failure(): Response {
  return new Response(JSON.stringify({ code: 2, msg: "任务已被接取" }));
}

let root: Root;
let container: HTMLDivElement;
let client: QueryClient;
let claimResponse: Deferred<Response>;
let claimIds: string[];
let claimed: Set<string>;
let send: Mock<(input: string, init?: RequestInit) => Promise<Response>>;

function flow(): ItemTaskFlowVO {
  return {
    itemTitle: "测试项目",
    name: "接取测试工作流",
    nodes: ["11", "12"].map((id, index) => ({
      id: `node-${id}`,
      baseTaskId: `base-${id}`,
      name: index === 0 ? "翻译" : "校对",
      submitFields: [],
      sort: index + 1,
      parallelSort: 1,
      taskInstanceId: id,
      taskStatus: claimed.has(id) ? "CLAIMED" : "PENDING",
    })),
  };
}
function instances(): ItemTaskInstanceVO[] {
  return flow().nodes.map((node) => ({
    id: node.taskInstanceId!,
    name: node.name,
    status: claimed.has(node.taskInstanceId!) ? "CLAIMED" : "PENDING",
    sort: node.sort,
    parallelSort: node.parallelSort,
    assigneeId: claimed.has(node.taskInstanceId!) ? "1" : undefined,
    createdAt: "2026-10-19 10:00:00",
  }));
}
function plaza(): PageResult<PlazaProjectGroup> {
  return {
    list: [
      {
        projectId: "31",
        title: "测试企划",
        typeName: "漫画",
        coverUrl: null,
        pendingCount: 2 - claimed.size,
        itemCount: 1,
        tasks: instances()
          .filter((instance) => instance.status === "PENDING")
          .map((instance) => ({
            instanceId: instance.id,
            itemId: "21",
            itemTitle: "测试项目",
            nodeName: instance.name,
            isCurrentStage: instance.sort === 1,
            stageIndex: instance.sort,
            stageTotal: 2,
            parallelTotal: 1,
            filledSlots: 0,
            pendingSlots: 1,
            createdAt: instance.createdAt,
          })),
      },
    ],
    total: 1,
    pageNum: 1,
    pageSize: 8,
    hasNext: false,
  };
}
function seed(itemId = "21"): void {
  client.setQueryData(scopedKey(itemFlowQuery(itemId).key, "org"), flow());
  client.setQueryData(scopedKey(itemInstancesQuery(itemId).key, "org"), instances());
  client.setQueryData(scopedKey(plazaListQuery("ALL").key, "org"), plaza());
  client.setQueryData(scopedKey(["projectTypes"], "org"), []);
}

beforeEach((): void => {
  localStorage.clear();
  saveSession({ token: "claim-test-token", userId: "1", defaultOrgId: "41" });
  tip.mockClear();
  notify.mockClear();
  claimed = new Set();
  claimIds = [];
  claimResponse = deferred<Response>();
  client = createQueryClient();
  seed();
  send = vi.fn(async (input: string, init?: RequestInit): Promise<Response> => {
    const path = new URL(input, "http://localhost").pathname;
    const claim = path.match(/^\/app\/task\/instance\/(\d+)\/claim$/);
    if (claim && init?.method === "POST") {
      claimIds.push(claim[1]!);
      const response = await claimResponse.promise;
      const result = (await response.clone().json()) as { code: number };
      if (result.code === 0) claimed.add(claim[1]!);
      return response;
    }
    if (path === "/app/task/instance/plaza") return ok(plaza());
    if (/^\/app\/item\/\d+\/flow$/.test(path)) return ok(flow());
    if (/^\/app\/task\/instance\/item\/\d+$/.test(path)) return ok(instances());
    if (path === "/app/projects/types") return ok([]);
    const detail = path.match(/^\/app\/task\/instance\/(\d+)\/detail$/);
    if (detail) {
      const data: TaskInstanceDetailVO = {
        task: {
          id: detail[1]!,
          name: "翻译",
          stage: 1,
          status: claimed.has(detail[1]!) ? "CLAIMED" : "PENDING",
        },
        submission: { state: "not_submitted", fields: [] },
      };
      return ok(data);
    }
    if (/^\/app\/task\/instance\/\d+\/submissions$/.test(path)) return ok([]);
    throw new Error(`未预期的请求：${init?.method ?? "GET"} ${path}`);
  });
  vi.stubGlobal("fetch", send);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach((): void => {
  act(() => root.unmount());
  container.remove();
  client.clear();
  clearSession();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function render(element: ReactElement): void {
  act(() => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <ConfirmDialogProvider>{element}</ConfirmDialogProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  });
}
function button(label: string, index = 0): HTMLButtonElement {
  const matches = Array.from(container.querySelectorAll("button")).filter(
    (element) =>
      element.textContent?.trim() === label || element.getAttribute("aria-label") === label,
  );
  const found = matches[index];
  if (!found) throw new Error(`缺少按钮：${label} #${index}`);
  return found;
}
function click(target: HTMLButtonElement): void {
  target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}
async function finish(response: Response): Promise<void> {
  await act(async () => {
    claimResponse.resolve(response);
    await vi.waitFor(() => expect(client.isMutating()).toBe(0));
  });
}

const entries = ["大厅当前阶段", "大厅后续阶段", "流程卡片", "流程详情"] as const;
type Entry = (typeof entries)[number];
function open(entry: Entry): HTMLButtonElement {
  if (entry.startsWith("大厅")) {
    render(<TaskPlaza />);
    return button("接取", entry === "大厅后续阶段" ? 1 : 0);
  }
  render(<WorkflowInstance itemId="21" />);
  if (entry === "流程详情") {
    act(() => click(button("查看翻译任务详情")));
    return button("接取");
  }
  return button("接取任务");
}
function successMessage(entry: Entry): string {
  if (entry === "大厅当前阶段") return "接取成功，可在任务详情中提交";
  if (entry === "大厅后续阶段") return "接取成功，等待前置阶段完成后再提交";
  return "任务已接取";
}

for (const entry of entries) {
  describe(entry, () => {
    for (const autoJoinedProject of [true, false]) {
      test(`成功${autoJoinedProject ? "新增企划成员时追加提示" : "已加入时仅保留原文案"}`, async (): Promise<void> => {
        const target = open(entry);
        act(() => click(target));
        await vi.waitFor(() => expect(claimIds).toHaveLength(1));
        expect(tip).not.toHaveBeenCalled();
        await finish(ok({ autoJoinedProject }));
        const message = successMessage(entry) + (autoJoinedProject ? "，已自动加入该企划" : "");
        expect(tip).toHaveBeenCalledExactlyOnceWith(message, "success");
        expect(notify).not.toHaveBeenCalled();
        expect(claimIds).toEqual([entry === "大厅后续阶段" ? "12" : "11"]);
        expect(container.textContent).not.toContain("接取中...");
        expect(
          send.mock.calls.some(
            ([url, options]) =>
              String(url).endsWith(`/app/task/instance/${claimIds[0]}/claim`) &&
              (options as RequestInit).method === "POST" &&
              (options as RequestInit).headers &&
              ((options as RequestInit).headers as Record<string, string>)["X-Org-Id"] === "41",
          ),
        ).toBe(true);
      });
    }

    test("接取失败无成功或加入提示，并解除锁允许重试", async (): Promise<void> => {
      const target = open(entry);
      act(() => click(target));
      await vi.waitFor(() => expect(claimIds).toHaveLength(1));
      await finish(failure());
      expect(tip).not.toHaveBeenCalled();
      expect(notify).toHaveBeenCalledExactlyOnceWith({ type: "error", message: "任务已被接取" });
      claimResponse = deferred<Response>();
      act(() =>
        click(button(entry === "流程卡片" ? "接取任务" : "接取", entry === "大厅后续阶段" ? 1 : 0)),
      );
      await vi.waitFor(() => expect(claimIds).toHaveLength(2));
      await finish(ok({ autoJoinedProject: false }));
      expect(tip).toHaveBeenCalledExactlyOnceWith(successMessage(entry), "success");
    });

    test("同一事件周期重复接取只发送一次请求和一次成功提示", async (): Promise<void> => {
      const target = open(entry);
      act(() => {
        click(target);
        click(target);
      });
      await vi.waitFor(() => expect(claimIds).toHaveLength(1));
      await finish(ok({ autoJoinedProject: true }));
      expect(claimIds).toHaveLength(1);
      expect(tip).toHaveBeenCalledExactlyOnceWith(
        `${successMessage(entry)}，已自动加入该企划`,
        "success",
      );
    });

    test("等待接取时切换组织不显示旧会话的成功提示", async (): Promise<void> => {
      const target = open(entry);
      act(() => click(target));
      await vi.waitFor(() => expect(claimIds).toHaveLength(1));
      act(() => saveCurrentOrganization("42"));
      await finish(ok({ autoJoinedProject: true }));
      expect(tip).not.toHaveBeenCalled();
      expect(notify).not.toHaveBeenCalled();
    });

    test("离开入口后迟到成功不显示提示", async (): Promise<void> => {
      const target = open(entry);
      act(() => click(target));
      await vi.waitFor(() => expect(claimIds).toHaveLength(1));
      render(<div>已离开</div>);
      await finish(ok({ autoJoinedProject: true }));
      expect(tip).not.toHaveBeenCalled();
    });
  });
}

test("大厅允许不同任务并发接取且各自只反馈本次自动加入结果", async (): Promise<void> => {
  render(<TaskPlaza />);
  const first = button("接取", 0);
  const second = button("接取", 1);
  const firstResponse = claimResponse;
  act(() => click(first));
  await vi.waitFor(() => expect(claimIds).toEqual(["11"]));
  claimResponse = deferred<Response>();
  act(() => click(second));
  await vi.waitFor(() => expect(claimIds).toEqual(["11", "12"]));
  await act(async () => {
    firstResponse.resolve(ok({ autoJoinedProject: true }));
    claimResponse.resolve(ok({ autoJoinedProject: false }));
    await vi.waitFor(() => expect(client.isMutating()).toBe(0));
  });
  expect(tip).toHaveBeenCalledTimes(2);
  expect(tip).toHaveBeenCalledWith("接取成功，可在任务详情中提交，已自动加入该企划", "success");
  expect(tip).toHaveBeenCalledWith("接取成功，等待前置阶段完成后再提交", "success");
});

test("流程卡片与详情共用 action lock，交叉点击不会重复接取", async (): Promise<void> => {
  const detail = open("流程详情");
  const card = button("接取任务");
  act(() => {
    click(card);
    click(detail);
  });
  await vi.waitFor(() => expect(claimIds).toHaveLength(1));
  await finish(ok({ autoJoinedProject: true }));
  expect(claimIds).toEqual(["11"]);
  expect(tip).toHaveBeenCalledExactlyOnceWith("任务已接取，已自动加入该企划", "success");
});

test("切换项目后旧流程接取响应不误报成功", async (): Promise<void> => {
  const card = open("流程卡片");
  act(() => click(card));
  await vi.waitFor(() => expect(claimIds).toHaveLength(1));
  seed("22");
  render(<WorkflowInstance itemId="22" />);
  await finish(ok({ autoJoinedProject: true }));
  expect(tip).not.toHaveBeenCalled();
});
