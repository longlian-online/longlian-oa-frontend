// @vitest-environment happy-dom
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import type TaskFlowViewer from "@/components/WorkflowInstance/TaskFlowViewer";
import { createQueryClient } from "@/lib/queryClient";
import { clearSession, saveSession } from "@/lib/session";
import ProjectItemTaskPage from "@/pages/dashboard/planning/[projectId]/items/[itemId]/index";
import type { MemberClaimedTaskItemVO, OrganizationMemberVO } from "@/types/organizationAdmin";
import type { ItemTaskInstanceVO } from "@/types/workflowInstance";

import OrganizationMembersPage from "./members";

const api = vi.hoisted(() => ({
  getOrganizationMembers: vi.fn(),
  getMemberClaimedTasks: vi.fn(),
  getProjectDetail: vi.fn(),
  getItemTaskFlow: vi.fn(),
  getItemTaskInstances: vi.fn(),
  getTaskInstanceDetail: vi.fn(),
  getTaskSubmissionVersions: vi.fn(),
}));
vi.mock("@/api/organizationAdmin", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/organizationAdmin")>()),
  getOrganizationMembers: api.getOrganizationMembers,
  getMemberClaimedTasks: api.getMemberClaimedTasks,
}));
vi.mock("@/api/planning", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/planning")>()),
  getProjectDetail: api.getProjectDetail,
}));
vi.mock("@/api/workflowInstance", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/workflowInstance")>()),
  getItemTaskFlow: api.getItemTaskFlow,
  getItemTaskInstances: api.getItemTaskInstances,
  getTaskInstanceDetail: api.getTaskInstanceDetail,
  getTaskSubmissionVersions: api.getTaskSubmissionVersions,
}));
vi.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({ role: "ORG_ADMIN", isLoading: false }),
}));
vi.mock("@/hooks/useConfirm", () => ({ useConfirm: () => vi.fn() }));
// 仅替换依赖画布尺寸的布局，成员页、链接、目标页面与任务详情使用真实实现。
vi.mock("@/components/WorkflowInstance/TaskFlowViewer", () => ({
  default: ({ selectedNodeId }: ComponentProps<typeof TaskFlowViewer>) => (
    <div data-testid="selected-task-node">{selectedNodeId}</div>
  ),
}));

const member: OrganizationMemberVO = {
  id: "7",
  userId: "member",
  nickname: "小明",
  orgRole: "ORG_USER",
  status: "ENABLED",
  submitCount: 10,
  claimedTaskCount: 2,
};
const claimedTasks: MemberClaimedTaskItemVO[] = [
  {
    instanceId: "2",
    itemId: "12",
    projectId: "8",
    projectName: "测试企划",
    itemTitle: "第一话",
    nodeName: "校对",
    claimedAt: "2026-10-01 10:00:00",
    bucket: "WAITING",
    waitingStageName: "翻译",
  },
  {
    instanceId: "4",
    itemId: "12",
    projectId: "8",
    projectName: "测试企划",
    itemTitle: "第一话",
    nodeName: "翻译",
    slotIndex: 2,
    slotTotal: 2,
    claimedAt: "2026-10-02 10:00:00",
    bucket: "SUBMITTABLE",
  },
];
const instances: ItemTaskInstanceVO[] = [
  { id: "1", name: "翻译", sort: 1, parallelSort: 1 },
  { id: "4", name: "翻译", sort: 1, parallelSort: 2 },
  { id: "2", name: "校对", sort: 2, parallelSort: 1 },
].map((task) => ({
  ...task,
  revision: "1",
  status: "CLAIMED",
  assigneeId: "member",
  createdAt: "2026-10-01 10:00:00",
}));

let root: Root;
let container: HTMLDivElement;
let client: QueryClient;

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  saveSession({ token: "test-token", userId: "admin", defaultOrgId: "11", role: "ORG_ADMIN" });
  client = createQueryClient();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  api.getOrganizationMembers.mockResolvedValue({ list: [member], total: 1 });
  api.getMemberClaimedTasks.mockResolvedValue({
    memberId: member.id,
    userId: member.userId,
    totalCount: 2,
    submittableCount: 1,
    waitingCount: 1,
    list: claimedTasks,
  });
  api.getProjectDetail.mockResolvedValue({ isCreator: false });
  api.getItemTaskFlow.mockResolvedValue({
    itemTitle: "第一话",
    name: "测试流程",
    nodes: instances.map((task) => ({
      id: `node-${task.id}`,
      baseTaskId: "base",
      name: task.name,
      submitFields: [],
      sort: task.sort,
      parallelSort: task.parallelSort,
      taskInstanceId: task.id,
      taskStatus: task.status,
    })),
  });
  api.getItemTaskInstances.mockResolvedValue(instances);
  api.getTaskInstanceDetail.mockImplementation(async (id: string) => ({
    task: { id, name: instances.find((task) => task.id === id)?.name, stage: 1, status: "CLAIMED" },
    submission: { state: "not_submitted", fields: [] },
  }));
  api.getTaskSubmissionVersions.mockResolvedValue([]);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  client.clear();
  clearSession();
  vi.unstubAllGlobals();
});

async function mountAndOpenTasks(count = 2): Promise<void> {
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/dashboard/org-admin/members"]}>
          <Routes>
            <Route path="/dashboard/org-admin/members" element={<OrganizationMembersPage />} />
            <Route
              path="/dashboard/planning/:projectId/items/:itemId"
              element={<ProjectItemTaskPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  );
  const trigger = await vi.waitFor(() => {
    const button = document.querySelector<HTMLButtonElement>(
      `button[aria-label="查看小明的 ${count} 项接取任务"]`,
    );
    expect(button).not.toBeNull();
    return button!;
  });
  expect(trigger.textContent).toContain(`${count} 项`);
  expect(trigger.textContent).toContain("查看");
  expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
  await act(async () => trigger.click());
  await vi.waitFor(() => expect(document.querySelector("[role='tablist']")).not.toBeNull());
}

test.each([
  ["全部", "2", "第一话 · 校对"],
  ["进行中", "4", "第一话 · 翻译 · 2/2"],
  ["等待中", "2", "第一话 · 校对"],
])("%s Tab 的任务链接跳转并选中精确任务", async (tabName, instanceId, title) => {
  await mountAndOpenTasks();
  const tab = [...document.querySelectorAll<HTMLButtonElement>("[role='tab']")].find((entry) =>
    entry.textContent?.startsWith(tabName),
  );
  expect(tab).toBeDefined();
  await act(async () => tab!.click());
  const link = document.querySelector<HTMLAnchorElement>(
    `a[href="/dashboard/planning/8/items/12?taskInstanceId=${instanceId}"]`,
  );
  expect(link).not.toBeNull();
  expect(link?.textContent).toContain("接取于");
  await act(async () => link!.click());
  await vi.waitFor(() => {
    expect(document.querySelector("[data-testid='selected-task-node']")?.textContent).toBe(
      `node-${instanceId}`,
    );
    expect(document.querySelector("h2")?.textContent).toBe(title);
  });
  expect(api.getItemTaskFlow).toHaveBeenCalledWith("12");
  expect(api.getTaskInstanceDetail).toHaveBeenCalledWith(instanceId);
  expect(document.querySelector("[role='dialog']")).toBeNull();
});

test.each([
  ["Ctrl 点击", "click", { ctrlKey: true }],
  ["Cmd 点击", "click", { metaKey: true }],
  ["中键点击", "auxclick", { button: 1 }],
] as const)("%s 保留浏览器原生链接行为，原页对话框保持打开", async (_label, eventType, options) => {
  await mountAndOpenTasks();
  const link = document.querySelector<HTMLAnchorElement>(
    'a[href="/dashboard/planning/8/items/12?taskInstanceId=4"]',
  );
  expect(link).not.toBeNull();
  const event = new MouseEvent(eventType, { bubbles: true, cancelable: true, ...options });
  await act(async () => {
    link!.dispatchEvent(event);
  });
  expect(event.defaultPrevented).toBe(false);
  expect(document.querySelector("[role='dialog']")).not.toBeNull();
  expect(document.querySelector("[data-testid='selected-task-node']")).toBeNull();
});

test("零任务仍显示可点击入口并打开空列表", async () => {
  api.getOrganizationMembers.mockResolvedValue({
    list: [{ ...member, claimedTaskCount: 0 }],
    total: 1,
  });
  api.getMemberClaimedTasks.mockResolvedValue({
    memberId: member.id,
    userId: member.userId,
    totalCount: 0,
    submittableCount: 0,
    waitingCount: 0,
    list: [],
  });
  await mountAndOpenTasks(0);
  expect(document.querySelector("[role='tabpanel']")?.textContent).toContain("暂无任务");
  expect(document.querySelectorAll("[role='tabpanel'] a")).toHaveLength(0);
});
