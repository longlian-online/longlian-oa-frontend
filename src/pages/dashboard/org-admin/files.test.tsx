// @vitest-environment happy-dom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import OrganizationFilesPage from "./files";

const seen = vi.hoisted(() => ({ key: [] as unknown }));

vi.mock("@/components/OrganizationAdminGuard", () => ({
  default: ({ children }: { children: ReactNode }): ReactNode => children,
}));
vi.mock("@/hooks/useConfirm", () => ({
  useConfirm: () => () => Promise.resolve(false),
}));
vi.mock("@/hooks/queries/useApiQuery", () => ({
  useApiQuery: (options: { key: unknown }) => {
    seen.key = options.key;
    return {
      data: {
        entries: [{ id: "9", kind: "FOLDER", name: "漫画", subtitle: "阿企划" }],
        total: 120,
        typeName: "漫画",
        projectTitle: "阿企划",
        itemTitle: "第一话",
      },
      isLoading: false,
      isError: false,
    };
  },
  useApiMutation: () => ({ isPending: false }),
}));

let container: HTMLDivElement;
let root: Root;
let router = createMemoryRouter([
  { path: "/dashboard/org-admin/files", Component: OrganizationFilesPage },
]);

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

async function mount(search: string): Promise<void> {
  router.dispose();
  router = createMemoryRouter(
    [{ path: "/dashboard/org-admin/files", Component: OrganizationFilesPage }],
    { initialEntries: [`/dashboard/org-admin/files${search}`] },
  );
  await act(async () => {
    root.render(<RouterProvider router={router} />);
  });
}

function button(label: string): HTMLButtonElement {
  const found = [...container.querySelectorAll("button")].find(
    (item) => item.textContent === label,
  );
  if (!(found instanceof HTMLButtonElement)) throw new Error(`找不到${label}`);
  return found;
}

test("非法视图回退企划分层，切换视图时清掉页码", async (): Promise<void> => {
  await mount("?view=nope&itemId=10&page=3");
  expect(seen.key).toEqual(["orgFiles", "planning", "", "", "", 3]);
  await act(async () => {
    button("类型").click();
  });
  expect(router.state.location.search).toBe("?view=type");
  expect(seen.key).toEqual(["orgFiles", "type", "", "", "", 1]);
});

test("类型路径直达，打开文件夹时保留类型并回到第一页", async (): Promise<void> => {
  await mount("?view=type&typeId=4&page=2");
  expect(seen.key).toEqual(["orgFiles", "type", "4", "", "", 2]);
  expect(container.querySelector("nav")?.textContent).toContain("漫画");
  await act(async () => {
    container
      .querySelector('[role="option"]')
      ?.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
  });
  expect(router.state.location.search).toBe("?view=type&typeId=4&projectId=9");
  expect(seen.key).toEqual(["orgFiles", "type", "4", "9", "", 1]);
});

test("项目视图忽略企划层，切回企划时清掉项目", async (): Promise<void> => {
  await mount("?view=item&itemId=10&projectId=2&page=2");
  expect(seen.key).toEqual(["orgFiles", "item", "", "", "10", 2]);
  const nav = container.querySelector("nav")?.textContent ?? "";
  expect(nav).toContain("第一话");
  expect(nav).not.toContain("阿企划");
  await act(async () => {
    button("企划").click();
  });
  expect(router.state.location.search).toBe("");
  expect(seen.key).toEqual(["orgFiles", "planning", "", "", "", 1]);
});
