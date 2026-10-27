// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import WorkflowInstance from "./index";
import { toDateTimeLocalValue } from "./proxySubmitTime";
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
  abandonTask: vi.fn(),
  claimTask: vi.fn(),
  assignTask: vi.fn(),
  proxySubmitTask: vi.fn(),
  rejectTask: vi.fn(),
  resetTask: vi.fn(),
  submitTask: vi.fn(),
}));
vi.mock("@/api/workflowInstance", () => api);
const members = vi.hoisted(() => ({ listMemberOptions: vi.fn() }));
vi.mock("@/api/member", () => members);
vi.mock("@/components/tip", () => ({ $tip: vi.fn() }));
vi.mock("@/hooks/useConfirm", () => ({ useConfirm: () => vi.fn(async () => true) }));
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
  api.abandonTask.mockResolvedValue(undefined);
  api.rejectTask.mockResolvedValue(undefined);
  members.listMemberOptions.mockResolvedValue([{ userId: "member", nickname: "小明" }]);
  api.proxySubmitTask.mockResolvedValue(undefined);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  root = undefined;
  client.clear();
  clearSession();
  vi.unstubAllGlobals();
});

async function render(
  itemId = "item",
  isProjectCreator = true,
  entry: { taskInstanceId?: string; projectId?: string } = {},
): Promise<void> {
  await act(async () =>
    root?.render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <WorkflowInstance itemId={itemId} isProjectCreator={isProjectCreator} {...entry} />
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  );
}

async function mount(isProjectCreator = true, projectId?: string): Promise<void> {
  await act(async () => root?.unmount());
  container?.remove();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await render("item", isProjectCreator, projectId ? { projectId } : {});
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
  api.abandonTask.mockImplementation(async () => {
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
  expect(document.querySelector("textarea")).toBeNull();
  await act(async () => findButton("确认取消接取")?.click());
  await vi.waitFor(() => expect(findButton("接取")).toBeDefined());
  expect(api.abandonTask).toHaveBeenCalledWith("target", {
    expectedRevision: "9007199254740993",
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

test("project creator assigns a pending task to an enabled member", async () => {
  tasks = [task({ status: "PENDING", assigneeId: undefined, assigneeNickname: undefined })];
  api.assignTask.mockImplementation(async () => {
    tasks = [
      task({
        status: "CLAIMED",
        assigneeId: "member",
        assigneeNickname: "小明",
        revision: "9007199254740994",
      }),
    ];
    return { autoJoinedProject: true };
  });
  await mount();
  expect(findButton("分配")).toBeDefined();
  await act(async () => findButton("分配")?.click());
  const member = await vi.waitFor(() => {
    const input = document.querySelector<HTMLInputElement>("#assign-member");
    expect(input).not.toBeNull();
    return input!;
  });
  member.focus();
  expect(document.querySelector("[role='listbox']")).toBeNull();
  await act(async () => document.querySelector<HTMLLabelElement>("#assign-member-label")?.click());
  expect(document.querySelector("[role='listbox']")).toBeNull();
  await act(async () => member.click());
  await vi.waitFor(() => expect(document.querySelector("[role='option']")).not.toBeNull());
  await act(async () => document.querySelector<HTMLElement>("[role='option']")?.click());
  await act(async () => findButton("确认分配")?.click());
  expect(api.assignTask).toHaveBeenCalledWith("target", {
    assigneeId: "member",
    expectedRevision: "9007199254740993",
  });
  await vi.waitFor(() => expect(findButton("分配")).toBeUndefined());
});

test("non creator cannot assign a pending task", async () => {
  tasks = [task({ status: "PENDING", assigneeId: undefined })];
  await mount(false);
  expect(findButton("分配")).toBeUndefined();
  expect(findButton("接取")).toBeDefined();
});

test("owner rejection failure retains reason and target; retry uses the shared reject endpoint", async () => {
  tasks = [task({ status: "COMPLETED" })];
  api.rejectTask.mockRejectedValueOnce(new Error("任务已变更")).mockResolvedValueOnce(undefined);
  await mount();
  await act(async () => findButton("负责人打回")?.click());
  await fillReason(" 请补全缺失页面 ");
  await act(async () => findButton("确认负责人打回")?.click());
  expect(document.querySelector("[role='alert']")?.textContent).toContain("原因已保留");
  expect(document.querySelector("textarea")?.value).toBe(" 请补全缺失页面 ");
  await act(async () => findButton("确认负责人打回")?.click());
  expect(api.rejectTask).toHaveBeenCalledTimes(2);
  expect(api.rejectTask).toHaveBeenLastCalledWith("target", {
    expectedRevision: "9007199254740993",
    reviewComment: "请补全缺失页面",
  });
  expect(document.querySelector("textarea")).toBeNull();
});

test("stale open dialog cannot act on an ABA replacement, even with the same status and assignee", async () => {
  await mount();
  await act(async () => findButton("取消接取")?.click());
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
  expect(api.abandonTask).not.toHaveBeenCalled();
  expect(findButton("确认取消接取")).toBeDefined();
  expect(document.querySelector("textarea")).toBeNull();
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

test("next-stage reject uses the shared endpoint with its captured revision for a noncreator", async () => {
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
  expect(api.rejectTask).toHaveBeenCalledWith("target", {
    expectedRevision: "9007199254740993",
    reviewComment: "旧路径意见",
  });
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
    api.abandonTask.mockReturnValueOnce(pending).mockResolvedValueOnce(undefined);
    const notify = vi.spyOn(notificationService, "notify");
    await mount();
    await act(async () => findButton("取消接取")?.click());
    await act(async () => findButton("确认取消接取")?.click());
    expect(api.abandonTask).toHaveBeenCalledTimes(1);
    await render("another-item");
    await render("item");
    expect(document.querySelector("textarea")).toBeNull();
    await vi.waitFor(() => expect(findButton("选择target")).toBeDefined());
    await act(async () => findButton("选择target")?.click());
    await act(async () => findButton("取消接取")?.click());
    await act(async () => {
      if (outcome === "success") resolve();
      else reject(new Error("旧项目请求失败"));
    });
    expect(findButton("确认取消接取")).toBeDefined();
    expect(document.querySelector("textarea")).toBeNull();
    expect($tip).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
    await act(async () => findButton("确认取消接取")?.click());
    expect(api.abandonTask).toHaveBeenCalledTimes(2);
    expect(document.querySelector("textarea")).toBeNull();
    notify.mockRestore();
  },
);

test("revoked creator capability prevents confirmation and keeps the dialog open", async () => {
  await mount();
  await act(async () => findButton("取消接取")?.click());
  await render("item", false);
  await act(async () => findButton("确认取消接取")?.click());
  expect(api.abandonTask).not.toHaveBeenCalled();
  expect(findButton("确认取消接取")).toBeDefined();
  expect(document.querySelector("textarea")).toBeNull();
  expect(document.querySelector("[role='alert']")).not.toBeNull();
});

test.each([true, false])(
  "self abandon without a reason is preserved (creator: %s)",
  async (creator) => {
    tasks = [task({ assigneeId: "creator" })];
    await mount(creator);
    await act(async () => findButton("放弃")?.click());
    expect(api.abandonTask).toHaveBeenCalledExactlyOnceWith("target", {
      expectedRevision: "9007199254740993",
    });
  },
);

test("any later completion also hides next-stage rejection, while a parallel completion does not", async () => {
  tasks = [
    task({ status: "COMPLETED" }),
    task({ id: "parallel", parallelSort: 2, status: "COMPLETED" }),
    task({ id: "next", sort: 3, assigneeId: "creator" }),
  ];
  await mount(false);
  expect(findButton("打回")).toBeDefined();
  tasks.push(task({ id: "farther", sort: 9, status: "COMPLETED" }));
  await act(async () => {
    await client.invalidateQueries();
  });
  await vi.waitFor(() => expect(findButton("打回")).toBeUndefined());
});

test("an open next-stage rejection cannot act on a refreshed revision and retains its comment", async () => {
  tasks = [task({ status: "COMPLETED" }), task({ id: "next", sort: 3, assigneeId: "creator" })];
  await mount(false);
  await act(async () => findButton("打回")?.click());
  await fillReason("保留旧版本意见");
  tasks = tasks.map((entry) =>
    entry.id === "target"
      ? { ...entry, revision: "9007199254740995", assigneeNickname: "刷新后的小明" }
      : entry,
  );
  await act(async () => {
    await client.invalidateQueries();
  });
  await vi.waitFor(() => expect(document.body.textContent).toContain("刷新后的小明"));
  await act(async () => {
    const submit = [...document.querySelectorAll("[role='dialog'] button")].find(
      (entry) => entry.textContent === "打回",
    );
    if (!(submit instanceof HTMLButtonElement)) throw new Error("Missing reject confirmation");
    submit.click();
  });
  expect(api.rejectTask).not.toHaveBeenCalled();
  expect(document.querySelector("textarea")?.value).toBe("保留旧版本意见");
});

async function mountEntry(taskInstanceId: string): Promise<void> {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await render("item", false, { taskInstanceId });
  await vi.waitFor(() => expect(document.querySelector("h2")).not.toBeNull());
}

test("entry only selects the exact parallel slot; submission requires a separate user action", async () => {
  tasks = [1, 2, 3].map((index) =>
    task({ id: `slot${index}`, parallelSort: index, assigneeId: "creator" }),
  );
  api.submitTask.mockImplementation(async (id: string) => {
    tasks = tasks.map((entry) => (entry.id === id ? { ...entry, status: "COMPLETED" } : entry));
  });
  await mountEntry("slot2");
  expect(document.querySelector("[role='dialog']")).toBeNull();
  expect(document.querySelector("h2")?.textContent).toBe("第一话 · 翻译 · 2/3");
  await act(async () => findButton("提交")?.click());
  expect(document.querySelector("[role='dialog']")?.textContent).toContain("第一话 · 翻译 · 2/3");
  const submit = [...document.querySelectorAll("[role='dialog'] button")].find(
    (button) => button.textContent === "提交",
  );
  await act(async () => (submit as HTMLButtonElement).click());
  await vi.waitFor(() => expect(document.querySelector("[role='dialog']")).toBeNull());
  expect(api.submitTask).toHaveBeenCalledExactlyOnceWith("slot2", { values: {} });
  expect(tasks.map((entry) => entry.status)).toEqual(["CLAIMED", "COMPLETED", "CLAIMED"]);
  expect(document.querySelector("h2")?.textContent).toBe("第一话 · 翻译 · 2/3");
});

test("manual selection stays in control after entry and query refresh cannot restore the entry slot", async () => {
  tasks = [
    task({ assigneeId: "creator" }),
    task({ id: "other", parallelSort: 2, assigneeId: "creator" }),
  ];
  await mountEntry("target");
  await act(async () => findButton("选择other")?.click());
  await act(async () => {
    await client.invalidateQueries();
  });
  expect(document.querySelector("[role='dialog']")).toBeNull();
  expect(document.querySelector("h2")?.textContent).toBe("第一话 · 翻译 · 2/2");
  expect(api.submitTask).not.toHaveBeenCalled();
});

test("locating a later task retains its normal stage-gated actions without extra progress UI", async () => {
  tasks = [task({ id: "blocker" }), task({ sort: 2, assigneeId: "creator" })];
  await mountEntry("target");
  expect(document.querySelector("h2")?.textContent).toBe("第一话 · 翻译（第 2 步）");
  expect(document.querySelector("[role='status']")).toBeNull();
  expect(findButton("提交")).toBeUndefined();
  expect(document.querySelector("[role='dialog']")).toBeNull();
  expect(findButton("放弃")).toBeDefined();
});

test.each(["CLAIMED", "COMPLETED"] as const)(
  "a %s entry cannot open a submission form for another assignee",
  async (status) => {
    tasks = [task({ status })];
    await mountEntry("target");
    expect(document.querySelector("h2")?.textContent).toBe("第一话 · 翻译");
    expect(document.querySelector("[role='dialog']")).toBeNull();
    expect(api.submitTask).not.toHaveBeenCalled();
  },
);

function isoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

async function visibleDay(
  date: Date,
  direction: "上个月" | "下个月" = "上个月",
): Promise<HTMLButtonElement> {
  const key = isoDay(date);
  const buttonFor = (): HTMLButtonElement | null => {
    const found = document.querySelector(`[data-day="${key}"]`)?.querySelector("button");
    return found instanceof HTMLButtonElement ? found : null;
  };
  const found = buttonFor();
  if (found) return found;
  const previous = [...document.querySelectorAll("button")].find((entry) =>
    entry.getAttribute("aria-label")?.includes(direction),
  );
  if (!previous) throw new Error(`缺少${direction}`);
  await act(async () => previous.click());
  const moved = buttonFor();
  if (!moved) throw new Error(`缺少日期 ${key}`);
  return moved;
}

async function chooseSubmitTime(): Promise<string> {
  const trigger = document.querySelector<HTMLButtonElement>("#proxy-submit-time");
  if (!trigger) throw new Error("缺少提交时间");
  await act(async () => trigger.click());
  const past = new Date();
  past.setDate(past.getDate() - 1);
  const day = await visibleDay(past);
  await act(async () => day.click());
  const column = (label: string, value: string): HTMLButtonElement => {
    const found = [
      ...(document.querySelector(`[aria-label="${label}"]`)?.querySelectorAll("button") ?? []),
    ].find((entry) => entry.textContent === value);
    if (!(found instanceof HTMLButtonElement)) throw new Error(`缺少${label} ${value}`);
    return found;
  };
  await act(async () => column("时", "03").click());
  await act(async () => column("分", "04").click());
  const confirm = [...document.querySelectorAll("button")].find(
    (entry) => entry.textContent?.trim() === "确定",
  );
  if (!(confirm instanceof HTMLButtonElement)) throw new Error("缺少确定");
  await act(async () => confirm.click());
  return `${isoDay(past)} 03:04:00`;
}

test("creator proxy-submits an unclaimed task under the selected member and time", async () => {
  tasks = [task({ status: "PENDING", assigneeId: undefined, assigneeNickname: undefined })];
  await mount();
  expect(findButton("接取")).toBeDefined();
  expect(findButton("代提交")).toBeDefined();
  const beforeOpen = toDateTimeLocalValue(new Date());
  await act(async () => findButton("代提交")?.click());
  const timeTrigger = await vi.waitFor(() => {
    const trigger = document.querySelector<HTMLButtonElement>("#proxy-submit-time");
    expect(trigger).not.toBeNull();
    return trigger!;
  });
  const shown = [beforeOpen, toDateTimeLocalValue(new Date())].map((value) =>
    value.replace("T", " "),
  );
  expect(shown.some((value) => timeTrigger.textContent?.includes(value))).toBe(true);
  const memberField = document.querySelector<HTMLInputElement>("#proxy-submit-member");
  if (!memberField) throw new Error("缺少组员");
  memberField.focus();
  expect(document.querySelector("[role='listbox']")).toBeNull();
  await act(async () =>
    document.querySelector<HTMLLabelElement>("#proxy-submit-member-label")?.click(),
  );
  expect(document.querySelector("[role='listbox']")).toBeNull();
  await act(async () => memberField.click());
  await vi.waitFor(() => expect(document.querySelector("[role='option']")).not.toBeNull());
  await act(async () => document.querySelector<HTMLElement>("[role='option']")?.click());
  const submittedAt = await chooseSubmitTime();
  await act(async () => findButton("确认代提交")?.click());
  await vi.waitFor(() =>
    expect(api.proxySubmitTask).toHaveBeenCalledWith("target", {
      assigneeId: "member",
      submittedAt,
      expectedRevision: "9007199254740993",
      values: {},
    }),
  );
});

test("typing filters the member dropdown without covering the field", async () => {
  members.listMemberOptions.mockResolvedValue([
    { userId: "member", nickname: "小明" },
    { userId: "other", nickname: "阿岚" },
    { userId: "third", nickname: "林夏" },
  ]);
  tasks = [task({ status: "PENDING", assigneeId: undefined })];
  await mount();
  await act(async () => findButton("代提交")?.click());
  const member = await vi.waitFor(() => {
    const input = document.querySelector<HTMLInputElement>("#proxy-submit-member");
    expect(input).not.toBeNull();
    return input!;
  });
  await act(async () => {
    member.focus();
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(member, "岚");
    member.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await vi.waitFor(() => {
    const labels = [...document.querySelectorAll("[role='option']")].map((option) =>
      option.textContent?.trim(),
    );
    expect(labels).toEqual(["阿岚"]);
  });
  const list = document.querySelector<HTMLElement>("#proxy-submit-member-list");
  expect(list?.parentElement).toBe(document.body);
  expect(list && getComputedStyle(list).position).toBe("fixed");
  const field = member.getBoundingClientRect();
  const popup = list?.getBoundingClientRect();
  expect(popup).toBeDefined();
  expect(popup!.top).toBeGreaterThanOrEqual(field.bottom);
});

test("non-creator cannot proxy-submit an unclaimed task", async () => {
  tasks = [task({ status: "PENDING", assigneeId: undefined })];
  await mount(false);
  expect(findButton("代提交")).toBeUndefined();
  expect(findButton("接取")).toBeDefined();
});

test("claimed task has no proxy submit entry", async () => {
  await mount();
  expect(findButton("代提交")).toBeUndefined();
  expect(findButton("取消接取")).toBeDefined();
});

test("later pending stage stays blocked until the previous stage is complete", async () => {
  tasks = [
    task({ id: "first", status: "PENDING", assigneeId: undefined, sort: 1 }),
    task({ id: "target", status: "PENDING", assigneeId: undefined, sort: 2 }),
  ];
  await mount();
  expect(findButton("代提交")).toBeUndefined();
  await act(async () => findButton("选择first")?.click());
  expect(findButton("代提交")).toBeDefined();
});

test("future proxy submit time stays disabled", async () => {
  tasks = [task({ status: "PENDING", assigneeId: undefined })];
  await mount();
  await act(async () => findButton("代提交")?.click());
  const time = await vi.waitFor(() => {
    const trigger = document.querySelector<HTMLButtonElement>("#proxy-submit-time");
    expect(trigger).not.toBeNull();
    return trigger!;
  });
  await act(async () => time.click());
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const future = await visibleDay(tomorrow, "下个月");
  expect(future.disabled).toBe(true);
  expect(findButton("确认代提交")?.disabled).toBe(true);
  expect(api.proxySubmitTask).not.toHaveBeenCalled();
});

function named(text: string): HTMLButtonElement | undefined {
  return [...document.querySelectorAll("button")].find(
    (entry) => entry.textContent?.trim() === text,
  );
}

test("已提交任务的项目详情只向负责人提供删除", async () => {
  tasks = [task({ status: "COMPLETED" })];
  await mount(true, "21");
  expect(named("删除项目")).toBeDefined();
  await render("item", false, { projectId: "21" });
  await vi.waitFor(() => expect(named("复制参与名单")).toBeDefined());
  expect(named("删除项目")).toBeUndefined();
});

test("没有已提交任务时负责人仍可看到删除项目", async () => {
  await mount(true, "21");
  expect(named("删除项目")).toBeDefined();
  expect(named("复制参与名单")).toBeDefined();
});
