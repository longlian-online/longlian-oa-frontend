import type { LoaderFunction } from "react-router";

// 启动时一次性载入全部 route loader。测试文件里的 vi.mock 在生产环境没有 Vitest
// mocker，会在 React 渲染前抛错并让整页白屏，所以必须排除。
export const routeLoaderModules = import.meta.glob<{ loader: LoaderFunction }>(
  ["/src/routeLoaders/**/*.ts", "!/src/routeLoaders/**/*.test.*"],
  { eager: true },
);
