import {
  redirect,
  type LoaderFunction,
  type RouteObject,
  type ShouldRevalidateFunctionArgs,
} from "react-router";

import RouteErrorBoundary, { RouteModuleFailure } from "@/components/RouteErrorBoundary";
import { getSessionSnapshot } from "@/lib/session";

import type { ComponentType } from "react";

type PageModules = Record<string, () => Promise<{ default: ComponentType }>>;
type LoaderEntry = { loader: LoaderFunction } | (() => Promise<{ loader: LoaderFunction }>);
type LoaderModules = Record<string, LoaderEntry>;

function resolveLoader(entry: LoaderEntry | undefined): (() => Promise<LoaderFunction>) | null {
  if (!entry) return null;
  if (typeof entry !== "function") {
    return () => Promise.resolve(entry.loader);
  }
  let cached: Promise<LoaderFunction> | null = null;
  return () => {
    cached ??= entry().then((module) => module.loader);
    return cached;
  };
}

function shouldRevalidateDashboard({
  currentUrl,
  nextUrl,
  formMethod,
}: ShouldRevalidateFunctionArgs): boolean {
  if (formMethod) return true;
  // 在 dashboard 内部切换子路由或筛选/分页参数时不重跑顶层用户与组织 loader，避免阻塞导航。
  return !(
    currentUrl.pathname.startsWith("/dashboard") && nextUrl.pathname.startsWith("/dashboard")
  );
}

export function createRoutes(
  fileRoutes: RouteObject[],
  pages: PageModules,
  loaders: LoaderModules,
): RouteObject[] {
  return fileRoutes.map((route): RouteObject => {
    const page = (route.handle as { page?: string } | undefined)?.page;
    const loadPage = page ? pages[page] : undefined;
    const loaderEntry = page
      ? loaders[page.replace("/pages/", "/routeLoaders/").replace(/\.tsx$/, ".ts")]
      : undefined;
    const getLoader = resolveLoader(loaderEntry);
    return {
      ...route,
      children: route.children ? createRoutes(route.children, pages, loaders) : undefined,
      ErrorBoundary: RouteErrorBoundary,
      shouldRevalidate:
        page === "/src/pages/dashboard.tsx" ? shouldRevalidateDashboard : route.shouldRevalidate,
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
            if (page === "/src/pages/login.tsx" && session.token)
              throw redirect("/dashboard/planning");
            if (page.startsWith("/src/pages/dashboard") && !session.token) throw redirect("/login");
            if (
              page.startsWith("/src/pages/admin/") &&
              !page.endsWith("/login.tsx") &&
              !session.adminToken
            )
              throw redirect("/admin/login");
            if (!getLoader) return null;
            const loader = await getLoader();
            return await loader(args);
          }
        : undefined,
    } as RouteObject;
  });
}
