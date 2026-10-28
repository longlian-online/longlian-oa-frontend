// @vitest-environment happy-dom
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createMemoryRouter, Link, Outlet, RouterProvider, type RouteObject } from "react-router";
import { afterEach, expect, test, vi } from "vite-plus/test";

import RouteErrorBoundary from "@/components/RouteErrorBoundary";
import { createRoutes } from "@/lib/createRoutes";

const session = vi.hoisted(() => ({ token: "test-token", adminToken: "test-admin" }));
vi.mock("@/lib/session", () => ({ getSessionSnapshot: () => session }));

let root: Root | undefined;
let container: HTMLDivElement;
let router: ReturnType<typeof createMemoryRouter>;

function Shell(): ReactElement {
  return (
    <>
      <header>顶部导航</header>
      <aside>
        <Link to="/dashboard/working">可用页面</Link>
      </aside>
      <main>
        <Outlet />
      </main>
    </>
  );
}

function Working(): ReactElement {
  return <h2>正常内容</h2>;
}

const fileRoutes: RouteObject[] = [
  {
    path: "dashboard",
    handle: { page: "/src/pages/dashboard.tsx" },
    children: [
      {
        path: "org-admin",
        children: [
          { path: "members", handle: { page: "/src/pages/dashboard/org-admin/members.tsx" } },
        ],
      },
      { path: "working", handle: { page: "/src/pages/dashboard/working.tsx" } },
    ],
  },
];

async function mount(routes: RouteObject[], path: string): Promise<void> {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.spyOn(console, "error").mockImplementation(() => {});
  router = createMemoryRouter(
    [
      {
        Component: Outlet,
        ErrorBoundary: RouteErrorBoundary,
        HydrateFallback: () => <p>加载中</p>,
        children: routes,
      },
    ],
    { initialEntries: [path] },
  );
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(<RouterProvider router={router} />);
  });
}

function routesWithFailure(error: unknown): RouteObject[] {
  return createRoutes(
    fileRoutes,
    {
      "/src/pages/dashboard.tsx": async () => ({ default: Shell }),
      "/src/pages/dashboard/working.tsx": async () => ({ default: Working }),
      "/src/pages/dashboard/org-admin/members.tsx": async () => {
        throw error;
      },
    },
    {},
  );
}

afterEach(async (): Promise<void> => {
  await act(async () => root?.unmount());
  router?.dispose();
  container?.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  session.token = "test-token";
  session.adminToken = "test-admin";
});

test("复现原结构：lazy reject 后 matches 被根 HydrateFallback 截断，错误边界和布局均未显示", async (): Promise<void> => {
  await mount(
    [
      {
        path: "dashboard",
        Component: Shell,
        ErrorBoundary: RouteErrorBoundary,
        children: [
          {
            path: "broken",
            ErrorBoundary: RouteErrorBoundary,
            lazy: async () => {
              throw new TypeError("Failed to fetch dynamically imported module");
            },
          },
        ],
      },
    ],
    "/dashboard/broken",
  );
  expect(router.state.errors).not.toBeNull();
  expect(container.querySelector("[role=alert]")).toBeNull();
  expect(container.querySelector("header")).toBeNull();
});

test.each([
  new TypeError("Failed to fetch dynamically imported module: /assets/members-old.js"),
  new TypeError(
    "Expected a JavaScript module script but the server responded with a MIME type of text/html",
  ),
  new SyntaxError("Unexpected token '<'"),
])("模块加载失败仍显示主区域错误并保留客户端导航：%s", async (error): Promise<void> => {
  await mount(routesWithFailure(error), "/dashboard/working");
  const header = container.querySelector("header");
  await act(async () => {
    await router.navigate("/dashboard/org-admin/members");
  });
  expect(container.querySelector("header")).toBe(header);
  expect(container.querySelector("aside")).not.toBeNull();
  expect(container.querySelector("main [role=alert]")?.textContent).toContain("页面资源加载失败");
  expect(container.textContent).not.toMatch(/刷新|重新加载|版本更新/);
  expect(router.state.matches.at(-1)?.route.lazy).toBeUndefined();
  await act(async () => {
    container.querySelector<HTMLAnchorElement>("aside a")?.click();
  });
  expect(router.state.location.pathname).toBe("/dashboard/working");
  expect(container.querySelector("main")?.textContent).toContain("正常内容");
  expect(container.querySelector("[role=alert]")).toBeNull();
  expect(console.error).not.toHaveBeenCalled();
});

test("首次直达失败页也能显示布局和错误", async (): Promise<void> => {
  await mount(routesWithFailure(new Error("offline")), "/dashboard/org-admin/members");
  expect(container.querySelector("header")).not.toBeNull();
  expect(container.querySelector("main [role=alert]")).not.toBeNull();
});

test("父布局模块失败有独立静态兜底，首页链接仍可客户端导航", async (): Promise<void> => {
  const routes = createRoutes(
    fileRoutes,
    {
      "/src/pages/dashboard.tsx": async () => {
        throw new Error("layout chunk missing");
      },
      "/src/pages/dashboard/working.tsx": async () => ({ default: Working }),
    },
    {},
  );
  await mount([{ index: true, Component: Working }, ...routes], "/dashboard/working");
  expect(container.querySelector("[role=alert]")?.textContent).toContain("页面资源加载失败");
  await act(async () => {
    container.querySelector<HTMLAnchorElement>("a")?.click();
  });
  expect(router.state.location.pathname).toBe("/");
  expect(container.textContent).toContain("正常内容");
});

test.each([new Error("loader failed"), new Response(null, { status: 404 })])(
  "loader 错误保留布局且不误报资源或版本问题",
  async (error): Promise<void> => {
    const routes = createRoutes(
      fileRoutes,
      {
        "/src/pages/dashboard.tsx": async () => ({ default: Shell }),
        "/src/pages/dashboard/working.tsx": async () => ({ default: Working }),
      },
      {
        "/src/routeLoaders/dashboard/working.ts": {
          loader: () => {
            throw error;
          },
        },
      },
    );
    await mount(routes, "/dashboard/working");
    expect(container.querySelector("header")).not.toBeNull();
    expect(container.querySelector("main [role=alert]")?.textContent).toContain(
      error instanceof Response ? "页面不存在" : "页面暂时无法显示",
    );
  },
);

test.each([
  {
    path: "/dashboard/working",
    page: "/src/pages/dashboard/working.tsx",
    target: "/login",
    admin: false,
  },
  {
    path: "/admin/settings",
    page: "/src/pages/admin/settings.tsx",
    target: "/admin/login",
    admin: true,
  },
])("未登录时保持鉴权重定向：$path", async ({ path, page, target, admin }): Promise<void> => {
  if (admin) session.adminToken = "";
  else session.token = "";
  const loader = vi.fn(() => null);
  const routes = createRoutes(
    [{ path, handle: { page } }],
    {
      [page]: async () => {
        throw new TypeError("missing module");
      },
    },
    {
      [page.replace("/pages/", "/routeLoaders/").replace(/\.tsx$/, ".ts")]: { loader },
    },
  );
  await mount([...routes, { path: target, element: <h2>登录页面</h2> }], path);
  expect(router.state.location.pathname).toBe(target);
  expect(container.textContent).toContain("登录页面");
  expect(container.querySelector("[role=alert]")).toBeNull();
  expect(loader).not.toHaveBeenCalled();
});

test("普通页面渲染异常由静态边界捕获", async (): Promise<void> => {
  const routes = createRoutes(
    fileRoutes,
    {
      "/src/pages/dashboard.tsx": async () => ({ default: Shell }),
      "/src/pages/dashboard/working.tsx": async () => ({
        default: function Broken(): never {
          throw new Error("render");
        },
      }),
    },
    {},
  );
  await mount(routes, "/dashboard/working");
  expect(container.querySelector("main [role=alert]")?.textContent).toContain("页面暂时无法显示");
});
