// @vitest-environment happy-dom
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import { createQueryClient } from "@/lib/queryClient";
import { scopedKey } from "@/lib/queryKeys";
import { clearSession, saveSession } from "@/lib/session";
import { memberClaimedTasksQuery, organizationMembersQuery } from "@/queries/organizationAdmin";

import OrganizationAdminProjectsPage from "./projects";

const api = vi.hoisted(() => ({
  getOrganizationProjects: vi.fn(),
  changeProjectStatus: vi.fn(),
}));
vi.mock("@/api/organizationAdmin", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/organizationAdmin")>()),
  ...api,
}));
vi.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({ role: "ORG_ADMIN", isLoading: false }),
}));
vi.mock("@/hooks/useConfirm", () => ({ useConfirm: () => async (): Promise<boolean> => true }));
vi.mock("@/components/tip", () => ({ $tip: vi.fn() }));

let client: QueryClient;
let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  saveSession({ token: "test-token", userId: "1", defaultOrgId: "11", role: "ORG_ADMIN" });
  client = createQueryClient();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  api.changeProjectStatus.mockResolvedValue(undefined);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  client.clear();
  clearSession();
  vi.unstubAllGlobals();
});

test.each([
  ["ENABLED", "DISABLED", "禁用企划"],
  ["DISABLED", "ENABLED", "启用企划"],
] as const)("企划从 %s 改为 %s 后失效成员数量和任务列表缓存", async (before, after, label) => {
  const memberListKey = scopedKey(organizationMembersQuery().key, "org");
  const claimedTasksKey = scopedKey(memberClaimedTasksQuery("7").key, "org");
  client.setQueryData(memberListKey, { list: [], total: 0 });
  client.setQueryData(claimedTasksKey, {
    memberId: "7",
    userId: "2",
    totalCount: 0,
    submittableCount: 0,
    waitingCount: 0,
    list: [],
  });
  api.getOrganizationProjects.mockResolvedValue({
    list: [{ id: "8", title: "测试企划", resourceStatus: before }],
    total: 1,
  });
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <OrganizationAdminProjectsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  );
  const button = await vi.waitFor(() => {
    const element = document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
    expect(element).not.toBeNull();
    return element!;
  });
  expect(client.getQueryState(memberListKey)?.isInvalidated).toBe(false);
  expect(client.getQueryState(claimedTasksKey)?.isInvalidated).toBe(false);
  await act(async () => button.click());
  await vi.waitFor(() => {
    expect(api.changeProjectStatus).toHaveBeenCalledExactlyOnceWith("8", after);
    expect(client.getQueryState(memberListKey)?.isInvalidated).toBe(true);
    expect(client.getQueryState(claimedTasksKey)?.isInvalidated).toBe(true);
  });
});
