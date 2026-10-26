// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, useLocation, useNavigate } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import TaskPlaza from "@/pages/dashboard/task-plaza";
import { saveSession, clearSession } from "@/lib/session";
import type { PlazaProjectGroup } from "@/types/plaza";

let root: Root;
let container: HTMLDivElement;
let client: QueryClient;
const requests: URL[] = [];
let groups: PlazaProjectGroup[];
let taskTypesFail: boolean;

function LocationProbe(): ReactElement {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output aria-label="地址">{location.search}</output>
      <button onClick={() => navigate(-1)}>后退</button>
    </>
  );
}

beforeEach((): void => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  saveSession({ token: "test-token", userId: "1", defaultOrgId: "11" });
  requests.length = 0;
  groups = [];
  taskTypesFail = false;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string): Promise<Response> => {
      const url = new URL(input, "http://localhost");
      requests.push(url);
      if (url.pathname.endsWith("/plaza/task-types")) {
        return new Response(
          JSON.stringify(
            taskTypesFail
              ? { code: 100003, msg: "选项查询失败" }
              : {
                  code: 0,
                  data: [
                    { id: "101", name: "翻译" },
                    { id: "102", name: "校对" },
                  ],
                },
          ),
        );
      }
      if (url.pathname.endsWith("/projects/types")) {
        return new Response(JSON.stringify({ code: 0, data: [{ id: "1", name: "漫画" }] }));
      }
      const data = url.pathname.endsWith("/plaza")
        ? { list: groups, total: groups.length ? 9 : 0 }
        : [];
      return new Response(JSON.stringify({ code: 0, data }));
    }),
  );
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach((): void => {
  act(() => root.unmount());
  container.remove();
  client.clear();
  clearSession();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function mount(search = "?keep=1"): Promise<void> {
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[`/dashboard/task-plaza${search}`]}>
          <TaskPlaza />
          <LocationProbe />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  });
}

function button(name: string, within: ParentNode = container): HTMLButtonElement {
  const element = Array.from(within.querySelectorAll("button")).find(
    (candidate): boolean =>
      (candidate.getAttribute("aria-label") ?? candidate.textContent) === name,
  );
  if (!element) throw new Error(`缺少按钮：${name}`);
  return element;
}

async function click(name: string, within: ParentNode = container): Promise<void> {
  await act(async () => button(name, within).click());
}

async function waitFor(assertion: () => void): Promise<void> {
  await vi.waitFor(async (): Promise<void> => {
    await act(async (): Promise<void> => {
      await new Promise<void>((resolve) => setTimeout(resolve, 50));
    });
    assertion();
  });
}

async function waitForDialog(): Promise<HTMLElement> {
  let popup: HTMLElement | null = null;
  await waitFor((): void => {
    popup = document.querySelector<HTMLElement>("[role=dialog]");
    expect(popup).not.toBeNull();
  });
  return popup!;
}

async function waitForClosed(): Promise<void> {
  await waitFor((): void => expect(document.querySelector("[role=dialog]")).toBeNull());
}

function makeGroup(projectId: string, taskCount: number): PlazaProjectGroup {
  return {
    projectId,
    title: `企划${projectId}`,
    typeName: "漫画",
    coverUrl: null,
    pendingCount: taskCount,
    itemCount: 1,
    tasks: Array.from({ length: taskCount }, (_, index) => ({
      instanceId: `${projectId}-${index}`,
      itemId: "31",
      itemTitle: "第一话",
      nodeName: `${projectId}任务${index}`,
      isCurrentStage: true,
      stageIndex: 1,
      stageTotal: 2,
      parallelTotal: taskCount,
      filledSlots: 0,
      pendingSlots: taskCount,
      createdAt: "2026-10-19 12:00:00",
    })),
  };
}

function section(projectId: string): HTMLElement {
  const heading = Array.from(container.querySelectorAll("h2")).find(
    (element): boolean => element.textContent === `企划${projectId}`,
  );
  const element = heading?.closest("section");
  if (!element) throw new Error(`缺少企划：${projectId}`);
  return element;
}

function visibleTaskNames(projectId: string): string[] {
  return Array.from(
    section(projectId).querySelectorAll("span[title]"),
    (element): string => element.textContent ?? "",
  );
}

async function chooseTaskPage(projectId: string, page: number): Promise<void> {
  await click("选择任务页码", section(projectId));
  let option: HTMLElement | undefined;
  await waitFor((): void => {
    option = Array.from(document.body.querySelectorAll<HTMLElement>('[role="option"]')).find(
      (element): boolean => element.textContent?.trim() === `第 ${page} 页`,
    );
    expect(option).toBeDefined();
  });
  await act(async (): Promise<void> => option!.focus());
  await act(async (): Promise<void> => option!.click());
}

async function chooseFilter(label: string, name: string): Promise<void> {
  await click(label);
  let option: HTMLElement | undefined;
  await waitFor((): void => {
    option = Array.from(document.body.querySelectorAll<HTMLElement>('[role="option"]')).find(
      (element): boolean => element.textContent?.trim() === name,
    );
    expect(option).toBeDefined();
  });
  await act(async (): Promise<void> => option!.focus());
  await act(async (): Promise<void> => option!.click());
}

function lastPlazaRequest(): URL | undefined {
  return requests.filter((url): boolean => url.pathname.endsWith("/plaza")).at(-1);
}

test("任务类型按 ID 查询，切换重置两层页码，清除恢复全部", async (): Promise<void> => {
  groups = [makeGroup("21", 13)];
  await mount("?keep=1&page=2");
  await waitFor((): void => expect(button("任务类型").disabled).toBe(false));
  expect(lastPlazaRequest()?.searchParams.has("baseTaskId")).toBe(false);
  await chooseTaskPage("21", 2);
  expect(visibleTaskNames("21")[0]).toBe("21任务6");
  await chooseFilter("任务类型", "翻译");
  await waitFor((): void => {
    expect(lastPlazaRequest()?.searchParams.get("baseTaskId")).toBe("101");
    expect(lastPlazaRequest()?.searchParams.get("pageNum")).toBe("1");
    expect(container.querySelector("output")?.textContent).toBe("?keep=1");
    expect(visibleTaskNames("21")[0]).toBe("21任务0");
  });
  await click("下一页");
  await waitFor((): void => {
    expect(lastPlazaRequest()?.searchParams.get("pageNum")).toBe("2");
    expect(lastPlazaRequest()?.searchParams.get("baseTaskId")).toBe("101");
  });
  await chooseFilter("任务类型", "全部任务类型");
  await waitFor((): void => {
    expect(lastPlazaRequest()?.searchParams.has("baseTaskId")).toBe(false);
    expect(lastPlazaRequest()?.searchParams.get("pageNum")).toBe("1");
  });
});

test("任务类型与关键词、企划类型、排序和阶段组合并在接取刷新后保留", async (): Promise<void> => {
  groups = [makeGroup("21", 1)];
  await mount();
  await waitFor((): void => expect(button("任务类型").disabled).toBe(false));
  await chooseFilter("企划类型", "漫画");
  await chooseFilter("排序", "缺员最多");
  const input = container.querySelector<HTMLInputElement>(
    'input[placeholder="搜索任务或企划..."]',
  )!;
  await act(async (): Promise<void> => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "测试");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await act(async (): Promise<void> => {
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  });
  await chooseFilter("任务类型", "校对");
  await click("当前阶段");
  await waitFor((): void => {
    expect(lastPlazaRequest()?.searchParams.get("baseTaskId")).toBe("102");
    expect(lastPlazaRequest()?.searchParams.get("projectType")).toBe("漫画");
    expect(lastPlazaRequest()?.searchParams.get("keyword")).toBe("测试");
    expect(lastPlazaRequest()?.searchParams.get("sortBy")).toBe("MOST");
    expect(lastPlazaRequest()?.searchParams.get("stageScope")).toBe("CURRENT");
  });
  groups = [];
  await click("接取");
  await waitFor((): void => expect(container.textContent).toContain("当前没有待接取任务"));
  expect(lastPlazaRequest()?.searchParams.get("baseTaskId")).toBe("102");
  expect(button("任务类型").textContent).toContain("校对");
});

test("任务类型选项失败可重试，不影响大厅列表", async (): Promise<void> => {
  taskTypesFail = true;
  groups = [makeGroup("21", 1)];
  await mount();
  await waitFor((): void => expect(container.textContent).toContain("任务类型加载失败"));
  expect(button("任务类型").disabled).toBe(true);
  expect(visibleTaskNames("21")).toEqual(["21任务0"]);
  taskTypesFail = false;
  await click("重试任务类型");
  await waitFor((): void => expect(button("任务类型").disabled).toBe(false));
  await chooseFilter("任务类型", "翻译");
  await waitFor((): void => expect(lastPlazaRequest()?.searchParams.get("baseTaskId")).toBe("101"));
});

test("切换阶段重置企划和任务页码，说明操作保留任务页码", async (): Promise<void> => {
  groups = [makeGroup("21", 7)];
  await mount();
  await waitFor((): void =>
    expect(visibleTaskNames("21")).toEqual(
      groups[0]!.tasks.slice(0, 6).map((task): string => task.nodeName),
    ),
  );
  await click("下一页");
  await waitFor((): void => {
    expect(requests.at(-1)?.searchParams.get("pageNum")).toBe("2");
    expect(container.querySelector("output")?.textContent).toBe("?keep=1&page=2");
  });
  await click("下一页任务");
  expect(visibleTaskNames("21")).toEqual(["21任务6"]);
  await click("当前阶段说明");
  await waitForDialog();
  expect(visibleTaskNames("21")).toEqual(["21任务6"]);
  expect(requests.at(-1)?.searchParams.get("pageNum")).toBe("2");
  await click("当前阶段");
  await waitFor((): void => {
    expect(requests.at(-1)?.searchParams.get("pageNum")).toBe("1");
    expect(requests.at(-1)?.searchParams.get("stageScope")).toBe("CURRENT");
    expect(requests.at(-1)?.searchParams.get("sortBy")).toBe("WAIT");
    expect(container.querySelector("output")?.textContent).toBe("?keep=1&stageScope=CURRENT");
    expect(visibleTaskNames("21")).toEqual(
      groups[0]!.tasks.slice(0, 6).map((task): string => task.nodeName),
    );
  });
  await click("后退");
  await waitFor((): void => {
    expect(container.querySelector("output")?.textContent).toBe("?keep=1&page=2");
    expect(button("全部阶段").getAttribute("aria-pressed")).toBe("true");
    expect(button("当前阶段").getAttribute("aria-pressed")).toBe("false");
  });
});

test("企划独立翻页，末页只展示剩余任务，单页不显示分页", async (): Promise<void> => {
  groups = [makeGroup("21", 13), makeGroup("22", 7), makeGroup("23", 6)];
  await mount();
  await waitFor((): void =>
    expect(visibleTaskNames("21")).toEqual(
      groups[0]!.tasks.slice(0, 6).map((task): string => task.nodeName),
    ),
  );
  expect(button("上一页任务", section("21")).disabled).toBe(true);
  expect(section("23").querySelector("nav")).toBeNull();
  await click("下一页任务", section("21"));
  expect(visibleTaskNames("21")).toEqual(
    groups[0]!.tasks.slice(6, 12).map((task): string => task.nodeName),
  );
  await click("下一页任务", section("21"));
  expect(visibleTaskNames("21")).toEqual(["21任务12"]);
  expect(button("下一页任务", section("21")).disabled).toBe(true);
  expect(visibleTaskNames("22")).toEqual(
    groups[1]!.tasks.slice(0, 6).map((task): string => task.nodeName),
  );
  expect(container.querySelector("output")?.textContent).toBe("?keep=1");
  await click("上一页任务", section("21"));
  expect(visibleTaskNames("21")).toEqual(
    groups[0]!.tasks.slice(6, 12).map((task): string => task.nodeName),
  );
});

test("选择页码直接跳转，其他企划和企划列表页码保持不变", async (): Promise<void> => {
  groups = [makeGroup("21", 19), makeGroup("22", 7)];
  await mount("?keep=1&page=2");
  await waitFor((): void =>
    expect(visibleTaskNames("21")).toEqual(
      groups[0]!.tasks.slice(0, 6).map((task): string => task.nodeName),
    ),
  );
  await chooseTaskPage("21", 4);
  expect(visibleTaskNames("21")).toEqual(["21任务18"]);
  expect(button("下一页任务", section("21")).disabled).toBe(true);
  expect(visibleTaskNames("22")).toEqual(
    groups[1]!.tasks.slice(0, 6).map((task): string => task.nodeName),
  );
  expect(container.querySelector("output")?.textContent).toBe("?keep=1&page=2");
  await chooseTaskPage("21", 1);
  expect(visibleTaskNames("21")).toEqual(
    groups[0]!.tasks.slice(0, 6).map((task): string => task.nodeName),
  );
  expect(button("上一页任务", section("21")).disabled).toBe(true);
});

test("刷新后末页任务减少时回退到有效页，任务恢复后不跳回旧页", async (): Promise<void> => {
  groups = [makeGroup("21", 13)];
  await mount();
  await waitFor((): void =>
    expect(visibleTaskNames("21")).toEqual(
      groups[0]!.tasks.slice(0, 6).map((task): string => task.nodeName),
    ),
  );
  await click("下一页任务");
  await click("下一页任务");
  expect(visibleTaskNames("21")).toEqual(["21任务12"]);
  groups = [makeGroup("21", 12)];
  await act(async () => client.invalidateQueries());
  await waitFor((): void =>
    expect(visibleTaskNames("21")).toEqual(
      groups[0]!.tasks.slice(6, 12).map((task): string => task.nodeName),
    ),
  );
  expect(button("下一页任务").disabled).toBe(true);
  groups = [makeGroup("21", 13)];
  await act(async () => client.invalidateQueries());
  await waitFor((): void => {
    expect(button("下一页任务").disabled).toBe(false);
    expect(visibleTaskNames("21")).toEqual(
      groups[0]!.tasks.slice(6, 12).map((task): string => task.nodeName),
    );
  });
});

test("默认全部阶段，说明点击不改变筛选或 URL，切换与历史保持原值", async (): Promise<void> => {
  await mount();
  expect(button("全部阶段").getAttribute("aria-pressed")).toBe("true");
  await waitFor((): void => {
    expect(
      requests
        .filter((url): boolean => url.pathname.endsWith("/plaza"))
        .map((url): string | null => url.searchParams.get("stageScope")),
    ).toEqual(["ALL"]);
  });
  await click("当前阶段说明");
  const popup = await waitForDialog();
  expect(popup.textContent).toContain("仅展示当前阶段的待接取任务");
  expect(button("全部阶段").getAttribute("aria-pressed")).toBe("true");
  expect(container.querySelector("output")?.textContent).toBe("?keep=1");
  expect(button("当前阶段说明").closest("[aria-pressed]")).toBeNull();
  await click("当前阶段");
  expect(button("当前阶段").getAttribute("aria-pressed")).toBe("true");
  expect(container.querySelector("output")?.textContent).toBe("?keep=1&stageScope=CURRENT");
  await waitFor((): void => {
    expect(
      requests
        .filter((url): boolean => url.pathname.endsWith("/plaza"))
        .at(-1)
        ?.searchParams.get("stageScope"),
    ).toBe("CURRENT");
  });
  await click("后退");
  expect(button("全部阶段").getAttribute("aria-pressed")).toBe("true");
});

test("键盘聚焦显示说明，Escape 关闭且不抢走焦点，离焦关闭", async (): Promise<void> => {
  await mount("?stageScope=CURRENT");
  await act(async () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    button("全部阶段说明").focus();
  });
  const popup = await waitForDialog();
  expect(popup.textContent).toContain("后续阶段可提前接取");
  expect(document.activeElement).toBe(button("全部阶段说明"));
  await act(async () => {
    button("全部阶段说明").dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
  });
  await waitForClosed();
  expect(document.activeElement).toBe(button("全部阶段说明"));
  await act(async () => button("当前阶段说明").focus());
  await waitForDialog();
  await act(async () => button("当前阶段").focus());
  await waitForClosed();
  expect(button("当前阶段").getAttribute("aria-pressed")).toBe("true");
});

test("鼠标悬停显示说明并可移入阅读，移出后关闭", async (): Promise<void> => {
  await mount();
  await act(async () => {
    button("全部阶段说明").dispatchEvent(
      new MouseEvent("mouseenter", { bubbles: false, clientX: 10, clientY: 10 }),
    );
    button("全部阶段说明").dispatchEvent(
      new MouseEvent("mousemove", { bubbles: true, clientX: 10, clientY: 10 }),
    );
    await new Promise<void>((resolve) => setTimeout(resolve, 200));
  });
  const popup = await waitForDialog();
  const positioner = popup.parentElement!;
  expect(popup.textContent).toContain("需等前置阶段完成后才能提交成果");
  await act(async () => {
    positioner.dispatchEvent(new MouseEvent("mouseenter", { bubbles: false }));
  });
  expect(document.querySelector("[role=dialog]")).toBe(popup);
  await act(async () => {
    positioner.dispatchEvent(
      new MouseEvent("mouseleave", { bubbles: false, relatedTarget: document.body }),
    );
    await new Promise<void>((resolve) => setTimeout(resolve, 150));
  });
  await waitForClosed();
});

test("触屏点击说明可开关，外部点击可关闭，不误切筛选", async (): Promise<void> => {
  // happy-dom 没有指针/键盘输入模态；触屏聚焦不应匹配 :focus-visible。
  const matches = Reflect.get(Element.prototype, "matches") as Element["matches"];
  vi.spyOn(Element.prototype, "matches").mockImplementation(function (
    this: Element,
    selector: string,
  ): boolean {
    return selector === ":focus-visible" ? false : matches.call(this, selector);
  });
  await mount("?stageScope=CURRENT");
  async function tap(name: string): Promise<void> {
    await act(async () => {
      const target = button(name);
      target.dispatchEvent(
        new PointerEvent("pointerdown", { pointerType: "touch", bubbles: true }),
      );
      target.focus();
      target.dispatchEvent(new PointerEvent("pointerup", { pointerType: "touch", bubbles: true }));
      target.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    });
  }
  await tap("全部阶段说明");
  await waitForDialog();
  expect(button("当前阶段").getAttribute("aria-pressed")).toBe("true");
  await tap("全部阶段说明");
  await waitForClosed();
  await tap("当前阶段说明");
  await waitForDialog();
  await act(async () => {
    document.body.dispatchEvent(
      new PointerEvent("pointerdown", { pointerType: "touch", bubbles: true }),
    );
    document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    document.body.click();
  });
  await waitForClosed();
  expect(container.querySelector("output")?.textContent).toBe("?stageScope=CURRENT");
});
