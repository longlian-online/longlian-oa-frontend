// @vitest-environment happy-dom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";

import { ConfirmDialogProvider } from "@/components/ConfirmDialog";
import { clearAdminSession, saveAdminSession } from "@/lib/session";

import CreateProductReleasePage from "./create";
import EditProductReleasePage from "./[id]";

const { getProductReleaseBaseline, getAdminProductRelease } = vi.hoisted(() => ({
  getProductReleaseBaseline: vi.fn(),
  getAdminProductRelease: vi.fn(),
}));

vi.mock("@/api/adminProductRelease", () => ({
  getProductReleaseBaseline,
  getAdminProductRelease,
  createProductRelease: vi.fn(),
  updateProductRelease: vi.fn(),
  publishProductRelease: vi.fn(),
  withdrawProductRelease: vi.fn(),
}));

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return { ...actual, useParams: () => ({ id: "9" }) };
});

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
  getProductReleaseBaseline.mockReset();
  getAdminProductRelease.mockReset();
  saveAdminSession({ adminId: "1", username: "root", role: "ADMIN", token: "admin-token" });
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

async function render(node: ReactNode): Promise<void> {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => {
    root?.render(
      <QueryClientProvider client={client}>
        <ConfirmDialogProvider>
          <MemoryRouter>{node}</MemoryRouter>
        </ConfirmDialogProvider>
      </QueryClientProvider>,
    );
  });
}

function inputValue(label: string): string {
  const field = [...(container?.querySelectorAll("label") ?? [])].find(
    (item) => item.textContent === label,
  );
  const input = field?.parentElement?.querySelector("input,textarea");
  return input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement
    ? input.value
    : "";
}

function inputDisabled(label: string): boolean {
  const field = [...(container?.querySelectorAll("label") ?? [])].find(
    (item) => item.textContent === label,
  );
  const input = field?.parentElement?.querySelector("input,textarea");
  return input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement
    ? input.disabled
    : false;
}

describe("product release editor", () => {
  test("prefills the two component versions and leaves the product version empty", async () => {
    getProductReleaseBaseline.mockResolvedValue({
      frontendVersion: "0.0.18",
      backendVersion: "1.0.52",
    });
    await render(<CreateProductReleasePage />);
    await vi.waitFor(() => expect(inputValue("前端版本")).toBe("0.0.18"));
    expect(inputValue("后端版本")).toBe("1.0.52");
    expect(inputValue("产品版本")).toBe("");
  });

  test("locks the version binding after publish", async () => {
    getAdminProductRelease.mockResolvedValue({
      id: "9",
      version: "1.3.0",
      frontendVersion: "0.0.18",
      backendVersion: "1.0.52",
      title: "任务大厅",
      summary: "摘要",
      status: "PUBLISHED",
      added: ["一条"],
      changed: [],
      fixed: [],
    });
    await render(<EditProductReleasePage />);
    await vi.waitFor(() => expect(inputValue("产品版本")).toBe("1.3.0"));
    expect(inputDisabled("产品版本")).toBe(true);
    expect(inputDisabled("前端版本")).toBe(true);
    expect(inputDisabled("后端版本")).toBe(true);
    expect(inputDisabled("标题")).toBe(false);
  });
});
