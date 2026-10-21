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
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string): Promise<Response> => {
      const url = new URL(input, "http://localhost");
      requests.push(url);
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

function button(name: string): HTMLButtonElement {
  const element = Array.from(container.querySelectorAll("button")).find(
    (candidate): boolean =>
      (candidate.getAttribute("aria-label") ?? candidate.textContent) === name,
  );
  if (!element) throw new Error(`缺少按钮：${name}`);
  return element;
}

async function click(name: string): Promise<void> {
  await act(async () => button(name).click());
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

test("切换阶段仍回到第一页并收起分组，说明操作不重置列表", async (): Promise<void> => {
  groups = [
    {
      projectId: "21",
      title: "测试企划",
      typeName: "漫画",
      coverUrl: null,
      pendingCount: 7,
      itemCount: 1,
      tasks: Array.from({ length: 7 }, (_, index) => ({
        instanceId: String(index),
        itemId: "31",
        itemTitle: "第一话",
        nodeName: `任务${index}`,
        isCurrentStage: true,
        stageIndex: 1,
        stageTotal: 2,
        parallelTotal: 7,
        filledSlots: 0,
        pendingSlots: 7,
        createdAt: "2026-10-19 12:00:00",
      })),
    },
  ];
  await mount();
  await waitFor((): void => expect(container.textContent).toContain("展开全部 7 项"));
  await click("下一页");
  await waitFor((): void => {
    expect(requests.at(-1)?.searchParams.get("pageNum")).toBe("2");
    expect(container.querySelector("output")?.textContent).toBe("?keep=1&page=2");
    expect(container.textContent).toContain("展开全部 7 项");
  });
  await click("展开全部 7 项");
  expect(container.textContent).toContain("任务6");
  await click("当前阶段说明");
  await waitForDialog();
  expect(container.textContent).toContain("任务6");
  expect(requests.at(-1)?.searchParams.get("pageNum")).toBe("2");
  await click("当前阶段");
  await waitFor((): void => {
    expect(requests.at(-1)?.searchParams.get("pageNum")).toBe("1");
    expect(requests.at(-1)?.searchParams.get("stageScope")).toBe("CURRENT");
    expect(requests.at(-1)?.searchParams.get("sortBy")).toBe("WAIT");
    expect(container.querySelector("output")?.textContent).toBe("?keep=1&stageScope=CURRENT");
  });
  await waitFor((): void => expect(container.textContent).toContain("展开全部 7 项"));
  expect(container.textContent).not.toContain("任务6");
  await click("后退");
  await waitFor((): void => {
    expect(container.querySelector("output")?.textContent).toBe("?keep=1&page=2");
    expect(button("全部阶段").getAttribute("aria-pressed")).toBe("true");
    expect(button("当前阶段").getAttribute("aria-pressed")).toBe("false");
  });
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
