// @vitest-environment happy-dom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";

import { ConfirmDialogProvider } from "@/components/ConfirmDialog";
import { componentVersionFromBuild } from "@/lib/productRelease";
import { clearAdminSession, saveAdminSession } from "@/lib/session";
import { APP_VERSION } from "@/release";

import CreateProductReleasePage from "./create";
import EditProductReleasePage from "./[id]";

const { getProductReleaseBaseline, getAdminProductRelease, getSystemInfo } = vi.hoisted(() => ({
  getProductReleaseBaseline: vi.fn(),
  getAdminProductRelease: vi.fn(),
  getSystemInfo: vi.fn(),
}));

vi.mock("@/api/system", () => ({ getSystemInfo }));

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
  getSystemInfo.mockReset();
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

async function render(node: ReactNode, state?: unknown): Promise<void> {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => {
    root?.render(
      <QueryClientProvider client={client}>
        <ConfirmDialogProvider>
          <MemoryRouter initialEntries={[{ pathname: "/admin/product-releases/create", state }]}>
            {node}
          </MemoryRouter>
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
  test.each([
    ["/admin/product-releases?status=DRAFT&page=3", "/admin/product-releases?status=DRAFT&page=3"],
    ["https://evil.example", "/admin/product-releases"],
  ])("return link validates the saved list destination %s", async (listReturnTo, expected) => {
    getSystemInfo.mockResolvedValue({ version: "1.0.53" });
    getProductReleaseBaseline.mockResolvedValue(null);
    await render(<CreateProductReleasePage />, { listReturnTo });
    await vi.waitFor(() => expect(inputValue("后端版本")).toBe("1.0.53"));
    const link = [...(container?.querySelectorAll("a") ?? [])].find(
      (item) => item.textContent === "返回",
    );
    expect(link?.getAttribute("href")).toBe(expected);
  });

  test("prefills the two component versions from the current build and leaves the product version empty", async () => {
    getSystemInfo.mockResolvedValue({ displayName: "longlian-oa", version: "1.0.53-SNAPSHOT" });
    getProductReleaseBaseline.mockResolvedValue({
      version: "1.2.0",
      frontendVersion: "0.0.17",
      backendVersion: "1.0.52",
    });
    await render(<CreateProductReleasePage />);
    await vi.waitFor(() =>
      expect(inputValue("前端版本")).toBe(componentVersionFromBuild(APP_VERSION)),
    );
    expect(inputValue("后端版本")).toBe("1.0.53");
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
      content: "一条",
      status: "PUBLISHED",
    });
    await render(<EditProductReleasePage />);
    await vi.waitFor(() => expect(inputValue("产品版本")).toBe("1.3.0"));
    expect(inputDisabled("产品版本")).toBe(true);
    expect(inputDisabled("前端版本")).toBe(true);
    expect(inputDisabled("后端版本")).toBe(true);
    expect(inputDisabled("标题")).toBe(false);
  });
});
