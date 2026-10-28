import { redirect, type LoaderFunction, type RouteObject } from "react-router";

import RouteErrorBoundary, { RouteModuleFailure } from "@/components/RouteErrorBoundary";
import { getSessionSnapshot } from "@/lib/session";

import type { ComponentType } from "react";

type PageModules = Record<string, () => Promise<{ default: ComponentType }>>;
type LoaderModules = Record<string, { loader: LoaderFunction }>;

export function createRoutes(
  fileRoutes: RouteObject[],
  pages: PageModules,
  loaders: LoaderModules,
): RouteObject[] {
  return fileRoutes.map((route): RouteObject => {
    const page = (route.handle as { page?: string } | undefined)?.page;
    const loadPage = page ? pages[page] : undefined;
    const loader = page
      ? loaders[page.replace("/pages/", "/routeLoaders/").replace(/\.tsx$/, ".ts")]?.loader
      : undefined;
    return {
      ...route,
      children: route.children ? createRoutes(route.children, pages, loaders) : undefined,
      ErrorBoundary: RouteErrorBoundary,
      lazy: loadPage
        ? async () => {
            try {
              return { Component: (await loadPage()).default };
            } catch {
              // 必须让 lazy 正常完成：失败后残留的 route.lazy 会使 React Router
              // 在渲染错误边界前截断 matches，根 HydrateFallback 也无法展示错误。
              // 直接显示静态失败组件，不抛出新的渲染异常或触发错误上报。
              // 当前会话保留失败状态，不承诺同 URL 的动态 import 可以重试恢复。
              return { Component: RouteModuleFailure };
            }
          }
        : undefined,
      loader: page
        ? async (args) => {
            const session = getSessionSnapshot();
            if (page.startsWith("/src/pages/dashboard") && !session.token) throw redirect("/login");
            if (
              page.startsWith("/src/pages/admin/") &&
              !page.endsWith("/login.tsx") &&
              !session.adminToken
            )
              throw redirect("/admin/login");
            return loader ? await loader(args) : null;
          }
        : undefined,
    } as RouteObject;
  });
}
