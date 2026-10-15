import { WifiOff } from "lucide-react";
import { isRouteErrorResponse, useRouteError } from "react-router";

import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";

import type { ReactElement } from "react";

export default function RouteErrorBoundary(): ReactElement {
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;

  return (
    <EmptyState
      className="min-h-64"
      icon={<WifiOff className="h-5 w-5 text-muted-foreground" />}
      title={notFound ? "页面不存在" : "页面加载失败"}
      description={
        notFound ? "请检查访问地址是否正确。" : "网络异常或资源加载失败，请检查网络后重新加载。"
      }
      action={
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          重新加载
        </Button>
      }
    />
  );
}
