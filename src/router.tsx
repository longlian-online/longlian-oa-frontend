import { createBrowserRouter } from "react-router";
import routes from "~react-pages";

import App from "@/App";
import PageLoading from "@/components/PageLoading";
import RouteErrorBoundary from "@/components/RouteErrorBoundary";
import { createRoutes } from "@/lib/createRoutes";
import { restoreFrontendUrl } from "@/lib/frontendReleaseWatch";
import { routeLoaderModules } from "@/lib/routeLoaderModules";

import type { ComponentType } from "react";

const pages = import.meta.glob<{ default: ComponentType }>([
  "/src/pages/**/*.tsx",
  "!/src/pages/**/*.test.*",
]);
const loaders = routeLoaderModules;

restoreFrontendUrl();

export const router = createBrowserRouter([
  {
    Component: App,
    ErrorBoundary: RouteErrorBoundary,
    HydrateFallback: () => <PageLoading message="页面加载中..." />,
    children: createRoutes(routes, pages, loaders),
  },
]);
