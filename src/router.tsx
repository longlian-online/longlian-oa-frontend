import { createBrowserRouter, redirect, type RouteObject } from "react-router";
import routes from "~react-pages";

import App from "@/App";
import PageLoading from "@/components/PageLoading";
import RouteErrorBoundary from "@/components/RouteErrorBoundary";
import { getSessionSnapshot } from "@/lib/session";

import type { ComponentType } from "react";
import type { LoaderFunction } from "react-router";

const pages = import.meta.glob<{ default: ComponentType }>("/src/pages/**/*.tsx");
const loaders = import.meta.glob<{ loader: LoaderFunction }>("/src/routeLoaders/**/*.ts", {
  eager: true,
});

function createRoutes(fileRoutes: RouteObject[]): RouteObject[] {
  return fileRoutes.map((route): RouteObject => {
    const page = (route.handle as { page?: string } | undefined)?.page;
    const loadPage = page ? pages[page] : undefined;
    const loader = page
      ? loaders[page.replace("/pages/", "/routeLoaders/").replace(/\.tsx$/, ".ts")]?.loader
      : undefined;
    return {
      ...route,
      children: route.children ? createRoutes(route.children) : undefined,
      ErrorBoundary: RouteErrorBoundary,
      lazy: loadPage ? async () => ({ Component: (await loadPage()).default }) : undefined,
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

export const router = createBrowserRouter([
  {
    Component: App,
    ErrorBoundary: RouteErrorBoundary,
    HydrateFallback: () => <PageLoading message="页面加载中..." />,
    children: createRoutes(routes),
  },
]);
