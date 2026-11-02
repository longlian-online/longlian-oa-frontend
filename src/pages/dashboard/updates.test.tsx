// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";

import { clearSession, saveSession } from "@/lib/session";

import ProductReleaseHistoryPage from "./updates";

const { listProductReleases, markProductReleaseSeen } = vi.hoisted(() => ({
  listProductReleases: vi.fn(),
  markProductReleaseSeen: vi.fn(),
}));

vi.mock("@/api/productRelease", () => ({
  listProductReleases,
  markProductReleaseSeen,
}));

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function installStorage(): void {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => [...store.keys()][index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
  });
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  installStorage();
  listProductReleases.mockReset();
  markProductReleaseSeen.mockReset();
  markProductReleaseSeen.mockResolvedValue(undefined);
  saveSession({ userId: "7", token: "token", refreshToken: "refresh" });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  clearSession();
});

async function renderPage(): Promise<void> {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => {
    root?.render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <ProductReleaseHistoryPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  });
}

describe("product release history", () => {
  test("shows an empty history without component versions", async () => {
    listProductReleases.mockResolvedValue({ list: [], total: 0 });
    await renderPage();
    await vi.waitFor(() => expect(container?.textContent).toContain("还没有更新说明"));
    expect(container?.textContent).not.toContain("前端版本");
    expect(markProductReleaseSeen).not.toHaveBeenCalled();
  });

  test("marks the latest release seen", async () => {
    listProductReleases.mockResolvedValue({
      total: 1,
      list: [
        {
          id: "9",
          version: "1.3.0",
          title: "任务大厅",
          summary: "可以按当前阶段查看",
          publishedAt: "2026-03-21 18:40:00",
          content: "当前阶段",
        },
      ],
    });
    await renderPage();
    await vi.waitFor(() => expect(container?.textContent).toContain("v1.3.0"));
    expect(container?.textContent).not.toContain("0.0.18");
    await vi.waitFor(() => expect(markProductReleaseSeen).toHaveBeenCalledWith("9"));
  });
});
