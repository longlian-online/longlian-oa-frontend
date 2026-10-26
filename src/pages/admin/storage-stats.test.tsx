// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";

import { clearAdminSession, saveAdminSession } from "@/lib/session";

import StorageStatsPage from "./storage-stats";

import type { StorageCategoryStatsVO, StorageStatsVO } from "@/types/admin";

const { getStorageStats } = vi.hoisted(() => ({ getStorageStats: vi.fn() }));

vi.mock("@/api/admin", () => ({ getStorageStats }));

const emptyState = { count: 0, bytes: 0 };

function category(overrides: Partial<StorageCategoryStatsVO> = {}): StorageCategoryStatsVO {
  return {
    unbound: emptyState,
    active: emptyState,
    retention: emptyState,
    recycled: emptyState,
    ...overrides,
  };
}

const jia: StorageStatsVO = {
  id: "1",
  name: "甲组",
  status: "ENABLED",
  occupiedBytes: 195,
  reclaimedBytes: 7,
  cover: category({
    unbound: { count: 1, bytes: 5 },
    active: { count: 1, bytes: 100 },
    retention: { count: 1, bytes: 40 },
    recycled: { count: 1, bytes: 7 },
  }),
  thumbnail: category({ active: { count: 1, bytes: 20 } }),
  taskSubmit: category({ active: { count: 1, bytes: 30 } }),
};

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function cells(label: string): string[] {
  const match = [...(container?.querySelectorAll("tr") ?? [])].find(
    (item) => item.querySelector("th")?.textContent === label,
  );
  return [...(match?.querySelectorAll("th,td") ?? [])].map(
    (cell) => cell.textContent?.trim() ?? "",
  );
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  getStorageStats.mockReset();
  getStorageStats.mockResolvedValue({ list: [jia], total: 1 });
  saveAdminSession({ adminId: "1", username: "stats", role: "ADMIN", token: "admin-token" });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  clearAdminSession();
});

async function renderPage(): Promise<void> {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => {
    root?.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/admin/storage-stats"]}>
          <StorageStatsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  });
  await vi.waitFor(() => expect(container?.textContent).toContain("甲组"));
}

describe("storage stats panel", () => {
  test("shows occupied and reclaimed bytes without collapsing real files to zero", async () => {
    await renderPage();

    expect(container?.textContent).toContain("仍占用");
    expect(container?.textContent).toContain("195 B");
    expect(container?.textContent).toContain("已回收");
    expect(container?.textContent).toContain("7 B");
    expect(cells("封面")).toEqual(["封面", "1 · 5 B", "1 · 100 B", "1 · 40 B", "1 · 7 B"]);
    expect(cells("缩略图")).toEqual(["缩略图", "0", "1 · 20 B", "0", "0"]);
    expect(cells("任务附件")).toEqual(["任务附件", "0", "1 · 30 B", "0", "0"]);
    expect(getStorageStats).toHaveBeenCalledWith({
      orgName: "",
      pageNum: 1,
      pageSize: 10,
    });
  });

  test("searches by trimmed organization name from the first page", async () => {
    await renderPage();
    const input = container?.querySelector("input");
    expect(input).toBeTruthy();
    const value = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    await act(async () => {
      value?.set?.call(input, "  甲组  ");
      input?.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      [...(container?.querySelectorAll("button") ?? [])]
        .find((button) => button.textContent === "搜索")
        ?.click();
    });

    await vi.waitFor(() =>
      expect(getStorageStats).toHaveBeenLastCalledWith({
        orgName: "甲组",
        pageNum: 1,
        pageSize: 10,
      }),
    );
  });
});
