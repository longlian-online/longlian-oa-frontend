// @vitest-environment happy-dom
import { QueryClientProvider } from "@tanstack/react-query";
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import AppBreadcrumb from "@/components/layout/AppBreadcrumb";
import Planning from "@/pages/dashboard/planning/index";
import { usePageQuery } from "@/hooks/usePageQuery";
import { queryClient } from "@/lib/queryClient";
import { clearSession, saveSession } from "@/lib/session";
import { loader } from "@/routeLoaders/dashboard/planning/index";

let root: Root;
let container: HTMLDivElement;
let router: ReturnType<typeof createMemoryRouter>;
const requests: URLSearchParams[] = [];
const listPath = "/dashboard/planning?page=3&keyword=百合&projectType=漫画&orderDir=ASC";

function Detail(): ReactElement {
  const [, setPage] = usePageQuery();
  return (
    <>
      <h1>企划详情</h1>
      <button onClick={() => setPage(2)}>项目第二页</button>
    </>
  );
}

function Shell(): ReactElement {
  return (
    <>
      <AppBreadcrumb />
      <Outlet />
    </>
  );
}

beforeEach((): void => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  saveSession({ token: "token", userId: "1", defaultOrgId: "11" });
  queryClient.clear();
  requests.length = 0;
  vi.stubGlobal("fetch", async (input: string): Promise<Response> => {
    const url = new URL(input, "http://localhost");
    let data: unknown;
    if (url.pathname === "/app/projects") {
      requests.push(url.searchParams);
      data = { list: [{ id: "21", title: "百合企划", projectType: "漫画" }], total: 40 };
    } else if (url.pathname === "/app/projects/types") {
      data = [{ id: "1", name: "漫画" }];
    } else if (url.pathname === "/app/projects/21") {
      data = { id: "21", title: "百合企划" };
    } else throw new Error(`未预期请求：${url.pathname}`);
    return new Response(JSON.stringify({ code: 0, msg: "", data }));
  });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async (): Promise<void> => {
  await act(async () => root.unmount());
  router?.dispose();
  container.remove();
  queryClient.clear();
  clearSession();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function mount(path: string): Promise<void> {
  router = createMemoryRouter(
    [
      {
        Component: Shell,
        HydrateFallback: () => <p>加载中</p>,
        children: [
          { path: "/dashboard/planning", loader, Component: Planning },
          { path: "/dashboard/planning/:projectId", Component: Detail },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  await act(async () =>
    root.render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    ),
  );
  await waitForList();
}

async function waitForList(): Promise<void> {
  await vi.waitFor(async () => {
    await act(async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 5));
    });
    expect(container.querySelector<HTMLInputElement>("input")?.value).toBe("百合");
    expect(container.textContent).toContain("最早创建");
    expect(container.textContent).toContain("漫画");
    expect(router.state.navigation.state).toBe("idle");
  });
}

function expectFilteredRequests(): void {
  expect(requests.length).toBeGreaterThan(0);
  for (const params of requests) {
    expect(Object.fromEntries(params)).toMatchObject({
      pageNum: "3",
      pageSize: "12",
      offset: "23",
      keyword: "百合",
      projectType: "漫画",
      sortByTime: "CREATE",
      orderDir: "ASC",
    });
  }
}

test.each(["后退", "企划面包屑", "详情翻页后企划面包屑"])(
  "%s 返回后保留筛选、页码及实际请求条件",
  async (method): Promise<void> => {
    await mount(listPath);
    expectFilteredRequests();
    const link = container.querySelector<HTMLAnchorElement>('a[aria-label="查看企划：百合企划"]')!;
    await act(async () => link.click());
    await vi.waitFor(() => expect(container.querySelector("h1")?.textContent).toBe("企划详情"));
    expect(router.state.location.state).toEqual({ planningListReturnTo: listPath });
    if (method === "详情翻页后企划面包屑") {
      await act(async () => container.querySelector<HTMLButtonElement>("button")!.click());
      expect(new URLSearchParams(router.state.location.search).get("page")).toBe("2");
      expect(router.state.location.state).toEqual({ planningListReturnTo: listPath });
    }
    await act(async () => {
      if (method === "后退") await router.navigate(-1);
      else container.querySelector<HTMLAnchorElement>('nav[aria-label="页面路径"] a')!.click();
    });
    await waitForList();
    expect(decodeURI(router.state.location.pathname + router.state.location.search)).toBe(listPath);
    expectFilteredRequests();
  },
);

test("URL 直达（刷新/重挂载）使用同一组筛选预取，不请求默认列表", async (): Promise<void> => {
  await mount(listPath);
  expectFilteredRequests();
  expect(requests).toHaveLength(1);
});

test("URL 历史切换同步搜索输入；提交搜索原子重置分页", async (): Promise<void> => {
  await mount(listPath);
  await act(async () => {
    await router.navigate("/dashboard/planning?page=4&keyword=旧词&orderDir=ASC");
  });
  const input = container.querySelector<HTMLInputElement>("input")!;
  expect(input.value).toBe("旧词");
  requests.length = 0;
  await act(async () => {
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  });
  await vi.waitFor(() => expect(router.state.navigation.state).toBe("idle"));
  expect(new URLSearchParams(router.state.location.search).has("page")).toBe(false);
  expect(requests.length).toBeGreaterThan(0);
  for (const params of requests) {
    expect(params.get("pageNum")).toBe("1");
    expect(params.get("keyword")).toBe("旧词");
    expect(params.get("orderDir")).toBe("ASC");
  }
});
