// @vitest-environment happy-dom
import { act, type ReactElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createMemoryRouter, RouterProvider, useLocation } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import DeletionRequests from "./deletion-requests";
import { getListReturnTo } from "@/lib/listReturnTo";

vi.mock("@/components/OrganizationAdminGuard", () => ({
  default: ({ children }: { children: ReactNode }): ReactNode => children,
}));
vi.mock("@/hooks/queries/useApiQuery", () => ({
  useApiQuery: () => ({
    data: {
      list: [
        {
          id: "1",
          projectId: "21",
          targetId: "31",
          targetType: "ITEM",
          title: "第一话",
          reason: "重复创建",
          requesterName: "成员",
          createdAt: "2026-11-04 12:00:00",
        },
      ],
      total: 25,
    },
    isLoading: false,
    isError: false,
  }),
  useApiMutation: () => ({ isPending: false }),
}));

let container: HTMLDivElement;
let root: Root;
let router: ReturnType<typeof createMemoryRouter>;
function Detail(): ReactElement {
  const location = useLocation();
  return <output>{getListReturnTo(location.state)}</output>;
}
beforeEach((): void => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async (): Promise<void> => {
  await act(async () => root.unmount());
  router.dispose();
  container.remove();
  vi.unstubAllGlobals();
});
test("删除申请查看详情保留来源列表分页", async (): Promise<void> => {
  router = createMemoryRouter(
    [
      { path: "/dashboard/org-admin/deletion-requests", Component: DeletionRequests },
      { path: "/dashboard/planning/:projectId/items/:itemId", Component: Detail },
    ],
    { initialEntries: ["/dashboard/org-admin/deletion-requests?page=3"] },
  );
  await act(async () => root.render(<RouterProvider router={router} />));
  await act(async () =>
    container
      .querySelector<HTMLAnchorElement>('a[href="/dashboard/planning/21/items/31"]')!
      .click(),
  );
  expect(container.querySelector("output")?.textContent).toBe(
    "/dashboard/org-admin/deletion-requests?page=3",
  );
});
