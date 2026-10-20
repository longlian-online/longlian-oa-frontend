// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import WorkflowInstance from "./index";
import { createQueryClient } from "@/lib/queryClient";
import { $tip } from "@/components/tip";
import { notificationService } from "@/services/notification";
import { clearSession, saveSession } from "@/lib/session";
import type { ItemTaskInstanceVO, ItemTaskNodeVO } from "@/types/workflowInstance";

const api = vi.hoisted(() => ({
  getItemTaskFlow: vi.fn(),
  getItemTaskInstances: vi.fn(),
  getTaskInstanceDetail: vi.fn(),
  getTaskSubmissionVersions: vi.fn(),
  ownerCancelTask: vi.fn(),
  ownerRejectTask: vi.fn(),
  abandonTask: vi.fn(),
  claimTask: vi.fn(),
  rejectTask: vi.fn(),
  resetTask: vi.fn(),
  submitTask: vi.fn(),
}));
vi.mock("@/api/workflowInstance", () => api);
vi.mock("@/components/tip", () => ({ $tip: vi.fn() }));
vi.mock("@/hooks/useConfirm", () => ({ useConfirm: () => vi.fn(async () => true) }));
vi.mock("./scrollTaskDetailIntoView", () => ({ scrollTaskDetailIntoView: vi.fn() }));
vi.mock("./TaskFlowViewer", () => ({
  default: ({
    nodes,
    onSelectNode,
  }: {
    nodes: ItemTaskNodeVO[];
    onSelectNode: (id: string) => void;
  }) => (
    <div>
      {nodes.map((node) => (
        <button key={node.id} onClick={() => onSelectNode(node.id)}>
          选择{node.id}
        </button>
      ))}
    </div>
  ),
}));

let root: Root | undefined;
let container: HTMLDivElement | undefined;
let client: QueryClient;
let tasks: ItemTaskInstanceVO[];

function task(overrides: Partial<ItemTaskInstanceVO> = {}): ItemTaskInstanceVO {
  return {
    id: "target",
    name: "翻译",
    revision: "9007199254740993",
    sort: 1,
    parallelSort: 1,
    status: "CLAIMED",
    assigneeId: "member",
    assigneeNickname: "小明",
    createdAt: "",
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  saveSession({ token: "token", userId: "creator", defaultOrgId: "11" });
  client = createQueryClient();
  tasks = [task()];
  api.getItemTaskFlow.mockImplementation(async () => ({
    itemTitle: "第一话",
    name: "流程",
    nodes: tasks.map((entry) => ({
      id: entry.id,
      baseTaskId: "base",
      name: entry.name,
      submitFields: [],
      sort: entry.sort,
      parallelSort: entry.parallelSort,
      taskInstanceId: entry.id,
      taskStatus: entry.status,
    })),
  }));
  api.getItemTaskInstances.mockImplementation(async () => tasks.map((entry) => ({ ...entry })));
  api.getTaskInstanceDetail.mockImplementation(async (id: string) => {
    const entry = tasks.find((candidate) => candidate.id === id)!;
    return {
      task: { id, name: entry.name, stage: entry.sort, status: entry.status },
      submission: { state: "not_submitted", fields: [] },
    };
  });
  api.getTaskSubmissionVersions.mockResolvedValue([]);
  api.ownerCancelTask.mockResolvedValue(undefined);
  api.ownerRejectTask.mockResolvedValue(undefined);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  root = undefined;
  client.clear();
  clearSession();
  vi.unstubAllGlobals();
});

async function render(itemId = "item", isProjectCreator = true): Promise<void> {
  await act(async () =>
    root?.render(
      <QueryClientProvider client={client}>
        <WorkflowInstance itemId={itemId} isProjectCreator={isProjectCreator} />
      </QueryClientProvider>,
    ),
  );
}

async function mount(isProjectCreator = true): Promise<void> {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await render("item", isProjectCreator);
  await vi.waitFor(async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(findButton("选择target")).toBeDefined();
  });
  await act(async () => findButton("选择target")?.click());
}

function findButton(text: string): HTMLButtonElement | undefined {
  return [...document.querySelectorAll("button")].find((entry) => entry.textContent === text);
}

async function fillReason(value: string): Promise<void> {
  const textarea = document.querySelector("textarea");
  if (!textarea) throw new Error("Missing reason");
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(
      textarea,
      value,
    );
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

test("owner cancellation refreshes task actions, while parallel completion and a blocked later assignee remain visible", async () => {
  tasks.push(
    task({ id: "parallel", status: "COMPLETED", parallelSort: 2 }),
    task({ id: "later", sort: 3, assigneeId: "creator" }),
  );
  api.ownerCancelTask.mockImplementation(async () => {
    tasks = tasks.map((entry) =>
      entry.id === "target"
        ? { ...entry, status: "PENDING", assigneeId: undefined, revision: "9007199254740994" }
        : entry,
    );
  });
  await mount();
  expect(findButton("提交")).toBeUndefined();
  await act(async () => findButton("取消接取")?.click());
  expect(document.body.textContent).toContain("小明");
  await fillReason("  协调重新分配  ");
  await act(async () => findButton("确认取消接取")?.click());
  await vi.waitFor(() => expect(findButton("接取")).toBeDefined());
  expect(api.ownerCancelTask).toHaveBeenCalledWith("target", {
    expectedRevision: "9007199254740993",
    reason: "协调重新分配",
  });
  expect(document.querySelector("textarea")).toBeNull();
  await act(async () => findButton("选择parallel")?.click());
  expect(document.body.textContent).toContain("已完成");
  expect(findButton("负责人打回")).toBeDefined();
  await act(async () => findButton("选择later")?.click());
  expect(findButton("提交")).toBeUndefined();
  expect(findButton("放弃")).toBeDefined();
  expect(document.body.textContent).toContain("等待前置阶段完成");
});

test("owner rejection failure retains reason and target; retry succeeds without calling legacy reject", async () => {
  tasks = [task({ status: "COMPLETED" })];
  api.ownerRejectTask
    .mockRejectedValueOnce(new Error("任务已变更"))
    .mockResolvedValueOnce(undefined);
  await mount();
  await act(async () => findButton("负责人打回")?.click());
  await fillReason(" 请补全缺失页面 ");
  await act(async () => findButton("确认负责人打回")?.click());
  expect(document.querySelector("[role='alert']")?.textContent).toContain("原因已保留");
  expect(document.querySelector("textarea")?.value).toBe(" 请补全缺失页面 ");
  await act(async () => findButton("确认负责人打回")?.click());
  expect(api.ownerRejectTask).toHaveBeenCalledTimes(2);
  expect(api.ownerRejectTask).toHaveBeenLastCalledWith("target", {
    expectedRevision: "9007199254740993",
    reason: "请补全缺失页面",
  });
  expect(api.rejectTask).not.toHaveBeenCalled();
  expect(document.querySelector("textarea")).toBeNull();
});

test("stale open dialog cannot act on an ABA replacement, even with the same status and assignee", async () => {
  await mount();
  await act(async () => findButton("取消接取")?.click());
  await fillReason("取消原因");
  tasks = [task({ revision: "9007199254740995" })];
  await act(async () => {
    await client.invalidateQueries();
  });
  await vi.waitFor(async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(api.getItemTaskInstances.mock.calls.length).toBeGreaterThan(1);
  });
  await act(async () => findButton("确认取消接取")?.click());
  expect(api.ownerCancelTask).not.toHaveBeenCalled();
  expect(document.querySelector("textarea")?.value).toBe("取消原因");
  expect(document.querySelector("[role='alert']")).not.toBeNull();
});

test("noncreator member or administrator gets no owner action and cannot submit somebody else's task", async () => {
  await mount(false);
  expect(findButton("取消接取")).toBeUndefined();
  expect(findButton("负责人打回")).toBeUndefined();
  expect(findButton("提交")).toBeUndefined();
  expect(findButton("放弃")).toBeUndefined();
});

test("any later completion hides owner action even when an earlier next stage is merely claimed", async () => {
  tasks.push(task({ id: "next", sort: 2 }), task({ id: "far", sort: 9, status: "COMPLETED" }));
  await mount();
  expect(findButton("取消接取")).toBeUndefined();
});

test("missing server revision cannot expose a command", async () => {
  tasks = [task({ revision: undefined as unknown as string })];
  await mount();
  expect(findButton("取消接取")).toBeUndefined();
});

test("legacy next-stage reject remains separate for a noncreator", async () => {
  tasks = [task({ status: "COMPLETED" }), task({ id: "next", sort: 3, assigneeId: "creator" })];
  await mount(false);
  expect(findButton("负责人打回")).toBeUndefined();
  expect(findButton("打回")).toBeDefined();
  await act(async () => findButton("打回")?.click());
  await fillReason("  旧路径意见  ");
  await act(async () => {
    const submit = [...document.querySelectorAll("[role='dialog'] button")].find(
      (entry) => entry.textContent === "打回",
    );
    if (!(submit instanceof HTMLButtonElement))
      throw new Error("Missing legacy reject confirmation");
    submit.click();
  });
  expect(api.rejectTask).toHaveBeenCalledWith("target", { reviewComment: "旧路径意见" });
  expect(api.ownerRejectTask).not.toHaveBeenCalled();
});

test("a later claimed task stays assigned but cannot submit while its predecessor is unfinished", async () => {
  tasks = [task({ status: "PENDING" }), task({ id: "next", sort: 3, assigneeId: "creator" })];
  await mount();
  await act(async () => findButton("选择next")?.click());
  expect(findButton("提交")).toBeUndefined();
  expect(document.body.textContent).toContain("等待前置阶段完成");
  expect(findButton("放弃")).toBeDefined();
});

test.each(["success", "failure"] as const)(
  "an old item's deferred %s cannot close or notify over a new dialog after switching away and back",
  async (outcome) => {
    let resolve!: () => void;
    let reject!: (error: Error) => void;
    const pending = new Promise<void>((done, fail) => {
      resolve = done;
      reject = fail;
    });
    api.ownerCancelTask.mockReturnValueOnce(pending).mockResolvedValueOnce(undefined);
    const notify = vi.spyOn(notificationService, "notify");
    await mount();
    await act(async () => findButton("取消接取")?.click());
    await fillReason("旧项目操作");
    await act(async () => findButton("确认取消接取")?.click());
    expect(api.ownerCancelTask).toHaveBeenCalledTimes(1);
    await render("another-item");
    await render("item");
    expect(document.querySelector("textarea")).toBeNull();
    await vi.waitFor(() => expect(findButton("选择target")).toBeDefined());
    await act(async () => findButton("选择target")?.click());
    await act(async () => findButton("取消接取")?.click());
    await fillReason("新项目原因");
    await act(async () => {
      if (outcome === "success") resolve();
      else reject(new Error("旧项目请求失败"));
    });
    expect(document.querySelector("textarea")?.value).toBe("新项目原因");
    expect($tip).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
    await act(async () => findButton("确认取消接取")?.click());
    expect(api.ownerCancelTask).toHaveBeenCalledTimes(2);
    expect(document.querySelector("textarea")).toBeNull();
    notify.mockRestore();
  },
);

test("revoked creator capability prevents confirmation without losing the reason", async () => {
  await mount();
  await act(async () => findButton("取消接取")?.click());
  await fillReason("保留说明");
  await render("item", false);
  await act(async () => findButton("确认取消接取")?.click());
  expect(api.ownerCancelTask).not.toHaveBeenCalled();
  expect(document.querySelector("textarea")?.value).toBe("保留说明");
  expect(document.querySelector("[role='alert']")).not.toBeNull();
});
