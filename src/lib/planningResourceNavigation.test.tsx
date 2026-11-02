// @vitest-environment happy-dom
import { QueryClientProvider, focusManager } from "@tanstack/react-query";
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  createMemoryRouter,
  Outlet,
  RouterProvider,
  useParams,
  type RouteObject,
} from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import AppBreadcrumb from "@/components/layout/AppBreadcrumb";
import RouteErrorBoundary from "@/components/RouteErrorBoundary";
import TaskDetailPanel from "@/components/WorkflowInstance/TaskDetailPanel";
import { useApiQuery } from "@/hooks/queries/useApiQuery";
import { apiQueryOptions } from "@/lib/apiQuery";
import { queryClient } from "@/lib/queryClient";
import { scopedKey } from "@/lib/queryKeys";
import { clearSession, saveSession } from "@/lib/session";
import {
  itemFlowQuery,
  itemInstancesQuery,
  projectDetailQuery,
  projectItemsQuery,
  projectListQuery,
} from "@/queries/planning";
import { loader as projectListLoader } from "@/routeLoaders/dashboard/planning/index";
import { loader as projectLoader } from "@/routeLoaders/dashboard/planning/[projectId]/index";
import { loader as projectEditLoader } from "@/routeLoaders/dashboard/planning/[projectId]/edit";
import { loader as itemListLoader } from "@/routeLoaders/dashboard/planning/[projectId]/items/index";
import { loader as itemLoader } from "@/routeLoaders/dashboard/planning/[projectId]/items/[itemId]/index";
import { loader as workflowLoader } from "@/routeLoaders/dashboard/planning/[projectId]/items/[itemId]/workflow";
import {
  notificationService as actualNotifications,
  type Notification,
} from "@/services/notification";

const notificationService = { notify: vi.fn<(event: Notification) => void>() };

let root: Root;
let container: HTMLDivElement;
let router: ReturnType<typeof createMemoryRouter>;
let missingProject: boolean;
let missingItem: boolean;
let withTaskDetail: boolean;
let businessCode: number;
let workshopPending: Promise<null> | undefined;
const calls: string[] = [];

function Shell(): ReactElement {
  return (
    <>
      <AppBreadcrumb />
      <Outlet />
    </>
  );
}

function Project(): ReactElement {
  const { projectId } = useParams();
  const project = useApiQuery(projectDetailQuery(projectId));
  const items = useApiQuery(projectItemsQuery(projectId ?? ""));
  return (
    <>
      <h1>{project.data?.title}</h1>
      {items.data?.list.map((item) => (
        <p key={item.id}>{item.title}</p>
      ))}
    </>
  );
}

function Item(): ReactElement {
  const { itemId } = useParams();
  const flow = useApiQuery(itemFlowQuery(itemId ?? ""));
  useApiQuery(itemInstancesQuery(itemId ?? ""));
  return (
    <>
      <h1>{flow.data?.itemTitle}</h1>
      {withTaskDetail && (
        <TaskDetailPanel
          title="第一话 · 翻译"
          node={{
            id: "node",
            baseTaskId: "base",
            name: "翻译",
            submitFields: [],
            sort: 1,
            parallelSort: 1,
            taskStatus: "CLAIMED",
            taskInstanceId: "41",
          }}
        />
      )}
    </>
  );
}

function ProjectList(): ReactElement {
  const projects = useApiQuery(projectListQuery());
  return (
    <>
      <h1>企划列表</h1>
      {projects.data?.list.map((project) => (
        <p key={project.id}>{project.title}</p>
      ))}
    </>
  );
}

const routes: RouteObject[] = [
  {
    path: "/dashboard/workshop",
    loader: () => workshopPending ?? null,
    Component: () => <h1>工坊</h1>,
  },
  { path: "/dashboard/planning", loader: projectListLoader, Component: ProjectList },
  { path: "/dashboard/planning/:projectId", loader: projectLoader, Component: Project },
  { path: "/dashboard/planning/:projectId/edit", loader: projectEditLoader, Component: Project },
  { path: "/dashboard/planning/:projectId/items", loader: itemListLoader, Component: Project },
  { path: "/dashboard/planning/:projectId/items/:itemId", loader: itemLoader, Component: Item },
  {
    path: "/dashboard/planning/:projectId/items/:itemId/workflow",
    loader: workflowLoader,
    Component: Item,
  },
].map((route) => ({ ...route, ErrorBoundary: RouteErrorBoundary }));

beforeEach((): void => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.spyOn(console, "error").mockImplementation(() => {});
  notificationService.notify.mockClear();
  vi.spyOn(actualNotifications, "notify").mockImplementation(notificationService.notify);
  saveSession({ token: "token", userId: "1", defaultOrgId: "11" });
  queryClient.clear();
  focusManager.setFocused(true);
  missingProject = false;
  missingItem = false;
  withTaskDetail = false;
  businessCode = 0;
  workshopPending = undefined;
  calls.length = 0;
  vi.stubGlobal("fetch", async (input: string): Promise<Response> => {
    const path = new URL(input, "http://localhost").pathname;
    calls.push(path);
    if (path === "/app/projects/21") {
      return json({ id: "21", title: "春季企划" }, missingProject ? 6 : businessCode);
    }
    if (path === "/app/projects") {
      return json({
        list: missingProject ? [] : [{ id: "21", title: "春季企划" }],
        total: missingProject ? 0 : 1,
      });
    }
    if (path === "/app/projects/21/items") {
      return json(
        { list: missingItem ? [] : [{ id: "31", title: "第一话" }], total: missingItem ? 0 : 1 },
        missingProject ? 6 : businessCode,
      );
    }
    if (path === "/app/item/31/flow") {
      return json(
        { itemTitle: "第一话", nodes: [] },
        missingItem || missingProject ? 6 : businessCode,
      );
    }
    if (path === "/app/task/instance/item/31") {
      return json([], missingItem || missingProject ? 6 : businessCode);
    }
    if (path === "/app/task/instance/41/detail") {
      return json(
        {
          task: { id: "41", name: "翻译", stage: 1, status: "CLAIMED" },
          submission: { state: "not_submitted", fields: [] },
        },
        missingItem || missingProject ? 6 : 0,
      );
    }
    if (path === "/app/task/instance/41/submissions")
      return json([], missingItem || missingProject ? 6 : 0);
    if (path === "/app/projects/types" || path === "/app/task/base/options") return json([]);
    throw new Error(`未预期请求：${path}`);
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
  focusManager.setFocused(undefined);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function json(data: unknown, code = 0): Response {
  return new Response(JSON.stringify({ code, msg: code === 6 ? "项目不存在" : "无权操作", data }));
}

async function mount(path: string): Promise<void> {
  router = createMemoryRouter(
    [
      {
        Component: Shell,
        ErrorBoundary: RouteErrorBoundary,
        HydrateFallback: () => <p>加载中</p>,
        children: routes,
      },
    ],
    {
      initialEntries: [
        { pathname: path, state: { planningListReturnTo: "/dashboard/planning?page=3" } },
      ],
    },
  );
  await act(async () =>
    root.render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    ),
  );
}

async function waitAt(path: string): Promise<void> {
  await vi.waitFor(async () => {
    await act(async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 5));
    });
    expect(router.state.location.pathname + router.state.location.search).toBe(path);
    expect(router.state.navigation.state).toBe("idle");
  });
}

test.each([
  "/dashboard/planning/21",
  "/dashboard/planning/21/edit",
  "/dashboard/planning/21/items",
  "/dashboard/planning/21/items/31",
  "/dashboard/planning/21/items/31/workflow",
])("直达已删除企划的旧地址 %s 返回原企划列表，不弹原始错误", async (path): Promise<void> => {
  missingProject = true;
  await mount(path);
  await waitAt("/dashboard/planning?page=3");
  expect(router.state.historyAction).toBe("REPLACE");
  expect(container.querySelector("h1")?.textContent).toBe("企划列表");
  expect(notificationService.notify).not.toHaveBeenCalled();
});

test.each(["/dashboard/planning/21/items/31", "/dashboard/planning/21/items/31/workflow"])(
  "直达已删除项目的旧地址 %s 返回所属企划",
  async (path): Promise<void> => {
    missingItem = true;
    await mount(path);
    await waitAt("/dashboard/planning/21");
    expect(router.state.historyAction).toBe("REPLACE");
    expect(container.querySelector("h1")?.textContent).toBe("春季企划");
    expect(router.state.location.state).toEqual({
      planningListReturnTo: "/dashboard/planning?page=3",
    });
    expect(notificationService.notify).not.toHaveBeenCalled();
  },
);

test.each(["project", "item"])(
  "详情有旧缓存时，切回标签页发现 %s 已删除也退出旧详情",
  async (resource): Promise<void> => {
    await mount(
      resource === "project" ? "/dashboard/planning/21" : "/dashboard/planning/21/items/31",
    );
    await vi.waitFor(() =>
      expect(container.querySelector("h1")?.textContent).toBe(
        resource === "project" ? "春季企划" : "第一话",
      ),
    );
    await act(async () => {
      focusManager.setFocused(false);
      await queryClient.invalidateQueries({ refetchType: "none" });
      missingProject = resource === "project";
      missingItem = resource === "item";
      focusManager.setFocused(true);
    });
    await waitAt(resource === "project" ? "/dashboard/planning?page=3" : "/dashboard/planning/21");
    expect(notificationService.notify).not.toHaveBeenCalled();
  },
);

test("已展开任务详情和历史版本时，删除后的后台刷新也不叠加不存在提示", async (): Promise<void> => {
  withTaskDetail = true;
  await mount("/dashboard/planning/21/items/31");
  await vi.waitFor(() => expect(container.textContent).toContain("该任务还没有人提交"));
  await act(async () => {
    focusManager.setFocused(false);
    await queryClient.invalidateQueries({ refetchType: "none" });
    missingItem = true;
    focusManager.setFocused(true);
  });
  await waitAt("/dashboard/planning/21");
  expect(notificationService.notify).not.toHaveBeenCalled();
});

test("浏览器后退重新进入被其他标签页删除的项目时安全返回所属企划", async (): Promise<void> => {
  await mount("/dashboard/planning/21/items/31");
  await vi.waitFor(() => expect(container.querySelector("h1")?.textContent).toBe("第一话"));
  await act(async () => {
    await router.navigate("/dashboard/planning/21");
  });
  missingItem = true;
  await act(async () => {
    await router.navigate(-1);
  });
  await waitAt("/dashboard/planning/21");
  expect(notificationService.notify).not.toHaveBeenCalled();
});

test("返回仍在新鲜期的企划列表时重新获取，不再展示已删企划", async (): Promise<void> => {
  await queryClient.prefetchQuery(apiQueryOptions(projectListQuery()));
  missingProject = true;
  await mount("/dashboard/planning/21");
  await waitAt("/dashboard/planning?page=3");
  expect(container.textContent).not.toContain("春季企划");
  expect(calls.filter((path) => path === "/app/projects")).toHaveLength(2);
});

test("返回仍在新鲜期的所属企划时更新项目列表，不再展示已删项目", async (): Promise<void> => {
  await queryClient.prefetchQuery(apiQueryOptions(projectItemsQuery("21")));
  missingItem = true;
  await mount("/dashboard/planning/21/items/31");
  await waitAt("/dashboard/planning/21");
  expect(container.textContent).not.toContain("第一话");
  expect(calls.filter((path) => path === "/app/projects/21/items")).toHaveLength(2);
});

test("旧详情的迟到不存在响应不覆盖用户正在进行的其他页面导航", async (): Promise<void> => {
  await mount("/dashboard/planning/21/items/31");
  await vi.waitFor(() => expect(container.querySelector("h1")?.textContent).toBe("第一话"));
  const send = globalThis.fetch;
  let finishFlow!: (response: Response) => void;
  vi.stubGlobal("fetch", (input: string, init?: RequestInit): Promise<Response> => {
    if (new URL(input, "http://localhost").pathname === "/app/item/31/flow") {
      return new Promise<Response>((resolve) => {
        finishFlow = resolve;
      });
    }
    return send(input, init);
  });
  let refreshed!: Promise<void>;
  await act(async () => {
    refreshed = queryClient.refetchQueries({ queryKey: scopedKey(["flow", "31"], "org") });
  });
  let finishWorkshop!: (result: null) => void;
  workshopPending = new Promise<null>((resolve) => {
    finishWorkshop = resolve;
  });
  await act(async () => {
    void router.navigate("/dashboard/workshop");
  });
  expect(router.state.navigation.location?.pathname).toBe("/dashboard/workshop");
  await act(async () => {
    finishFlow(json(null, 6));
    await refreshed;
    await new Promise<void>((resolve) => setTimeout(resolve, 5));
  });
  expect(router.state.navigation.location?.pathname).toBe("/dashboard/workshop");
  await act(async () => {
    finishWorkshop(null);
  });
  await waitAt("/dashboard/workshop");
  expect(container.querySelector("h1")?.textContent).toBe("工坊");
  expect(notificationService.notify).not.toHaveBeenCalled();
});

test("权限错误不会误判为已删除或静默跳转", async (): Promise<void> => {
  businessCode = 3;
  await mount("/dashboard/planning/21/items/31");
  await vi.waitFor(() =>
    expect(container.querySelector("[role=alert]")?.textContent).toContain("页面暂时无法显示"),
  );
  expect(router.state.location.pathname).toBe("/dashboard/planning/21/items/31");
  expect(notificationService.notify).toHaveBeenCalledWith({ type: "error", message: "无权操作" });
});
