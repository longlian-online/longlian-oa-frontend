import type { LoaderFunction } from "react-router";

// 按路由按需载入对应 route loader，避免首屏一次性打入全站所有端（含管理端）的 loader 及依赖。
// 测试文件里的 vi.mock 在生产环境没有 Vitest mocker，必须排除。
export const routeLoaderModules = import.meta.glob<{ loader: LoaderFunction }>([
  "/src/routeLoaders/**/*.ts",
  "!/src/routeLoaders/**/*.test.*",
]);
