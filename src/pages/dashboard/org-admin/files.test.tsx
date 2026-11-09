// @vitest-environment happy-dom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import OrganizationFilesPage from "./files";
import { resetDownloadSession } from "./downloadSession";

const seen = vi.hoisted(() => ({
  key: [] as unknown,
  entries: [{ id: "9", kind: "FOLDER", name: "漫画", subtitle: "阿企划" }] as Array<
    Record<string, unknown>
  >,
  records: [] as Array<{
    taskInstanceId: string;
    fieldKey: string;
    fileId: string;
    name: string;
  }>,
}));

vi.mock("@/components/OrganizationAdminGuard", () => ({
  default: ({ children }: { children: ReactNode }): ReactNode => children,
}));
vi.mock("@/hooks/useConfirm", () => ({
  useConfirm: () => () => Promise.resolve(false),
}));
vi.mock("./downloadDirectory", () => ({
  loadSavedDownloads: () =>
    Promise.resolve(
      seen.records.length === 0
        ? null
        : { handle: { name: "下载" }, name: "下载", records: seen.records },
    ),
  DirectoryAccessError: class DirectoryAccessError extends Error {},
}));
vi.mock("@/hooks/queries/useApiQuery", () => ({
  useApiQuery: (options: { key: unknown }) => {
    seen.key = options.key;
    return {
      data: {
        entries: seen.entries,
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
  seen.entries = [{ id: "9", kind: "FOLDER", name: "漫画", subtitle: "阿企划" }];
  seen.records = [];
  resetDownloadSession();
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
  await act(async () => {
    await Promise.resolve();
  });
}

async function chooseTree(label: string): Promise<void> {
  const trigger = container.querySelector<HTMLButtonElement>('button[aria-label="目录"]');
  if (!trigger) throw new Error("找不到目录");
  await act(async () => {
    trigger.click();
  });
  const option = [...document.querySelectorAll('[role="option"]')].find(
    (item) => item.textContent === label,
  );
  if (!(option instanceof HTMLElement)) throw new Error(`找不到${label}`);
  await act(async () => {
    option.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "touch" }));
    option.click();
  });
}

test("非法视图回退企划分层，切换视图时清掉页码", async (): Promise<void> => {
  await mount("?view=nope&itemId=10&page=3");
  expect(seen.key).toEqual(["orgFiles", "planning", "", "", "", 3]);
  await chooseTree("类型");
  expect(router.state.location.search).toBe("?view=type");
  expect(seen.key).toEqual(["orgFiles", "type", "", "", "", 1]);
});

test("打开类型后地址只有类型，不再进入项目", async (): Promise<void> => {
  await mount("?view=type&page=2");
  expect(seen.key).toEqual(["orgFiles", "type", "", "", "", 2]);
  await act(async () => {
    container
      .querySelector('[role="option"]')
      ?.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
  });
  expect(router.state.location.search).toBe("?view=type&typeId=9");
  expect(seen.key).toEqual(["orgFiles", "type", "9", "", "", 1]);
});

test("项目视图忽略企划层，切回企划时清掉项目", async (): Promise<void> => {
  await mount("?view=item&itemId=10&projectId=2&page=2");
  expect(seen.key).toEqual(["orgFiles", "item", "", "", "10", 2]);
  const nav = container.querySelector("nav")?.textContent ?? "";
  expect(nav).toContain("第一话");
  expect(nav).not.toContain("阿企划");
  await chooseTree("企划");
  expect(router.state.location.search).toBe("");
  expect(seen.key).toEqual(["orgFiles", "planning", "", "", "", 1]);
});

test("已下载标记跟着文件走，不跟着视图文件夹走", async (): Promise<void> => {
  seen.entries = [
    {
      id: "8:script",
      kind: "FILE",
      name: "成果.pdf",
      taskInstanceId: "8",
      fieldKey: "script",
      fileId: "101",
      availability: "available",
      taskName: "翻译",
    },
    {
      id: "8:extra",
      kind: "FILE",
      name: "对照.pdf",
      taskInstanceId: "8",
      fieldKey: "extra",
      fileId: "102",
      availability: "available",
      taskName: "翻译",
    },
  ];
  seen.records = [{ taskInstanceId: "8", fieldKey: "script", fileId: "101", name: "成果.pdf" }];
  await mount("");
  const marks = [...container.querySelectorAll("span")].filter(
    (node) => node.textContent === "已下载",
  );
  expect(marks).toHaveLength(1);
});

async function openMenu(index = 0): Promise<HTMLElement> {
  const option = container.querySelectorAll<HTMLElement>('[role="option"]')[index];
  if (!option) throw new Error("找不到条目");
  await act(async () => {
    option.dispatchEvent(
      new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        clientX: 32,
        clientY: 48,
      }),
    );
  });
  const menu = document.body.querySelector<HTMLElement>('[role="menu"]');
  if (!menu) throw new Error("找不到右键菜单");
  return menu;
}

function menuItem(menu: ParentNode, label: string): HTMLButtonElement {
  const item = [...menu.querySelectorAll("button")].find(
    (button) =>
      button.getAttribute("aria-label") !== "导出说明" && button.textContent?.includes(label),
  );
  if (!(item instanceof HTMLButtonElement)) throw new Error(`找不到${label}`);
  return item;
}

test("导出说明在导出项内部，只导出已下载的文件", async (): Promise<void> => {
  await mount("");
  const menu = await openMenu();
  const hint = menu.querySelector<HTMLButtonElement>('button[aria-label="导出说明"]');
  if (!hint) throw new Error("找不到导出说明");
  expect(menuItem(menu, "导出").parentElement?.contains(hint)).toBe(true);
  await act(async () => {
    hint.click();
  });
  expect(document.body.textContent).toContain("仅导出已下载的文件");
});

test("说明弹框写出使用限制，工具栏标明视图", async (): Promise<void> => {
  await mount("");
  expect(container.textContent).toContain("视图：");
  const labels = [...container.querySelectorAll("button")].map((button) =>
    button.textContent?.trim(),
  );
  expect(labels).not.toContain("下载");
  expect(labels).not.toContain("导出");
  expect(labels).not.toContain("预览");
  expect(labels).not.toContain("删除");
  const help = [...container.querySelectorAll("button")].find((button) =>
    button.textContent?.includes("说明"),
  );
  if (!help) throw new Error("找不到说明");
  await act(async () => {
    help.click();
  });
  const dialog = document.body.querySelector('[role="dialog"]');
  expect(dialog?.textContent).toContain("如果不知道如何使用，请不要使用该页面");
  expect(dialog?.textContent).toContain("按住 Shift/Ctrl/Command");
  expect(dialog?.textContent).toContain("删除本地文件");
  expect(dialog?.textContent).toContain("导出后的文件结构与当前选中视图保持一致");
  const menu = await openMenu();
  expect(menuItem(menu, "预览").disabled).toBe(true);
  expect(menuItem(menu, "下载").disabled).toBe(false);
  expect(menuItem(menu, "导出").disabled).toBe(true);
  expect(menuItem(menu, "删除远程文件").disabled).toBe(false);
  expect(menuItem(menu, "删除本地文件").disabled).toBe(true);
});

test("多选打开后单击可加选，右键操作仍然可用", async (): Promise<void> => {
  seen.entries = [
    {
      id: "8:script",
      kind: "FILE",
      name: "成果.pdf",
      taskInstanceId: "8",
      fieldKey: "script",
      fileId: "101",
      availability: "available",
      taskName: "翻译",
    },
    {
      id: "8:extra",
      kind: "FILE",
      name: "对照.pdf",
      taskInstanceId: "8",
      fieldKey: "extra",
      fileId: "102",
      availability: "available",
      taskName: "翻译",
    },
  ];
  seen.records = [{ taskInstanceId: "8", fieldKey: "script", fileId: "101", name: "成果.pdf" }];
  await mount("");
  const toggle = container.querySelector<HTMLButtonElement>('[role="switch"]');
  if (!toggle) throw new Error("找不到多选");
  await act(async () => {
    toggle.click();
  });
  const options = [...container.querySelectorAll<HTMLElement>('[role="option"]')];
  await act(async () => {
    options[0]?.click();
    options[1]?.click();
  });
  expect(options[0]?.getAttribute("aria-selected")).toBe("true");
  expect(options[1]?.getAttribute("aria-selected")).toBe("true");
  const menu = await openMenu(1);
  expect(menuItem(menu, "预览").disabled).toBe(false);
  expect(menuItem(menu, "下载").disabled).toBe(false);
  expect(menuItem(menu, "导出").disabled).toBe(false);
  expect(menuItem(menu, "删除远程文件").disabled).toBe(false);
  expect(menuItem(menu, "删除本地文件").disabled).toBe(false);
});
