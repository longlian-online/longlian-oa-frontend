import Pages, { type ReactRoute } from "vite-plugin-pages";

// 仅生成文件路由元数据；页面模块由 Data Router 的 lazy 加载。
export function fileRoutes() {
  return Pages({
    dirs: "src/pages",
    extensions: ["tsx"],
    extendRoute(route: ReactRoute) {
      const { element, ...rest } = route;
      return { ...rest, element: undefined, handle: element ? { page: element } : undefined };
    },
  });
}
