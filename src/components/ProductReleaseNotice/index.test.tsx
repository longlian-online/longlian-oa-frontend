// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";

import { saveSession, clearSession } from "@/lib/session";

import ProductReleaseNotice from "./index";

const { getCurrentProductRelease, markProductReleaseSeen } = vi.hoisted(() => ({
  getCurrentProductRelease: vi.fn(),
  markProductReleaseSeen: vi.fn(),
}));

vi.mock("@/api/productRelease", () => ({
  getCurrentProductRelease,
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
  getCurrentProductRelease.mockReset();
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

async function renderNotice(): Promise<void> {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => {
    root?.render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <ProductReleaseNotice />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  });
}

describe("product release notice", () => {
  test("shows the product version without component versions", async () => {
    getCurrentProductRelease.mockResolvedValue({
      olderCount: 2,
      release: {
        id: "9",
        version: "1.3.0",
        title: "任务大厅",
        summary: "可以按当前阶段查看",
        publishedAt: "2026-03-21 18:40:00",
        content: "- 当前阶段只展示待接取任务",
      },
    });
    await renderNotice();
    await vi.waitFor(() => expect(document.body.textContent).toContain("v1.3.0"));
    expect(document.body.textContent).toContain("另有 2 条更早的更新");
    expect(document.body.textContent).not.toContain("0.0.18");
    expect(document.body.textContent).not.toContain("1.0.52");
    expect(document.body.textContent).not.toContain("前端版本");
  });

  test("marks the release seen when dismissed", async () => {
    getCurrentProductRelease.mockResolvedValue({
      olderCount: 0,
      release: {
        id: "9",
        version: "1.3.0",
        title: "任务大厅",
        summary: "可以按当前阶段查看",
        content: "",
      },
    });
    await renderNotice();
    await vi.waitFor(() => expect(document.body.textContent).toContain("知道了"));
    await act(async () => {
      [...document.body.querySelectorAll("button")]
        .find((button) => button.textContent === "知道了")
        ?.click();
    });
    await vi.waitFor(() => expect(markProductReleaseSeen).toHaveBeenCalledWith("9"));
  });

  test("renders nothing when there is no release", async () => {
    getCurrentProductRelease.mockResolvedValue({ release: null, olderCount: 0 });
    await renderNotice();
    await vi.waitFor(() => expect(getCurrentProductRelease).toHaveBeenCalled());
    expect(document.body.textContent).not.toContain("知道了");
  });

  test("renders nothing when the request fails", async () => {
    getCurrentProductRelease.mockRejectedValue(new Error("更新说明加载失败"));
    await renderNotice();
    await vi.waitFor(() => expect(getCurrentProductRelease).toHaveBeenCalled());
    expect(document.body.textContent).not.toContain("更新说明加载失败");
    expect(document.body.textContent).not.toContain("知道了");
  });
});
