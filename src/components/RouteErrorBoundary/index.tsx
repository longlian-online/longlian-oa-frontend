import { isRouteErrorResponse, Link, useRouteError } from "react-router";

import type { ReactElement } from "react";

// 静态导入且不依赖页面、布局、数据请求或 UI 组件的 chunk。
// 页面或父布局加载失败时，这里仍能独立显示和进行客户端导航。
function RouteFailure({
  notFound = false,
  moduleFailed = false,
}: {
  notFound?: boolean;
  moduleFailed?: boolean;
}): ReactElement {
  return (
    <section
      role="alert"
      className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 px-6 py-10 text-center"
    >
      <h1 className="text-base font-medium text-foreground">
        {notFound ? "页面不存在" : moduleFailed ? "页面资源加载失败" : "页面暂时无法显示"}
      </h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        {notFound ? "请检查访问地址是否正确。" : "可切换其他页面继续使用。"}
      </p>
      <Link
        to="/"
        className="rounded-md border px-3 py-2 text-sm text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        返回首页
      </Link>
    </section>
  );
}

export function RouteModuleFailure(): ReactElement {
  return <RouteFailure moduleFailed />;
}

export default function RouteErrorBoundary(): ReactElement {
  const error: unknown = useRouteError();
  return <RouteFailure notFound={isRouteErrorResponse(error) && error.status === 404} />;
}
