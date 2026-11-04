// @vitest-environment happy-dom
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, useLocation } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import { clearAdminSession, saveAdminSession } from "@/lib/session";
import ProductReleaseListPage from "./index";

const { listAdminProductReleases } = vi.hoisted(() => ({ listAdminProductReleases: vi.fn() }));
vi.mock("@/api/adminProductRelease", () => ({ listAdminProductReleases }));

let container: HTMLDivElement;
let root: Root;

function LocationProbe(): ReactElement {
  const location = useLocation();
  return <output>{location.pathname + location.search}</output>;
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  listAdminProductReleases.mockReset();
  listAdminProductReleases.mockResolvedValue({ list: [], total: 0 });
  saveAdminSession({ adminId: "1", username: "root", role: "ADMIN", token: "admin-token" });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  clearAdminSession();
});

async function renderPage(entry: string): Promise<void> {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[entry]}>
          <ProductReleaseListPage />
          <LocationProbe />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  });
}

test.each(["DRAFT", "PUBLISHED", "WITHDRAWN", "INVALID"])(
  "restores page and validates status %s",
  async (status) => {
    await renderPage(`/admin/product-releases?status=${status}&page=3`);
    await vi.waitFor(() =>
      expect(listAdminProductReleases).toHaveBeenCalledWith({
        pageNum: 3,
        pageSize: 10,
        status: status === "INVALID" ? undefined : status,
      }),
    );
  },
);

test("filter change resets page atomically and preserves unrelated search parameters", async () => {
  await renderPage("/admin/product-releases?status=DRAFT&page=3&extra=keep");
  const button = [...container.querySelectorAll("button")].find(
    (item) => item.textContent === "已发布",
  );
  await act(async () => button?.click());
  expect(container.querySelector("output")?.textContent).toBe(
    "/admin/product-releases?status=PUBLISHED&extra=keep",
  );
  await vi.waitFor(() =>
    expect(listAdminProductReleases).toHaveBeenLastCalledWith({
      pageNum: 1,
      pageSize: 10,
      status: "PUBLISHED",
    }),
  );
});
