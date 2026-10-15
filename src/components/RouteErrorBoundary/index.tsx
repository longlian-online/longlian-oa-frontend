import { Component, type ErrorInfo, type ReactNode } from "react";
import { WifiOff } from "lucide-react";

import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";

function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const text = `${error.name} ${error.message}`;
  return /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(
    text,
  );
}

interface RouteErrorBoundaryProps {
  children: ReactNode;
  /** 路由变化时清除错误态，避免卡在失败页 */
  resetKey?: string;
}

interface RouteErrorBoundaryState {
  error: Error | null;
}

/**
 * BrowserRouter + useRoutes 不会启用 react-router 的 errorElement ErrorBoundary，
 * 懒加载 chunk 失败会直接白屏。此处用同类兜底：提示网络问题 + 重新加载。
 */
export default class RouteErrorBoundary extends Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  state: RouteErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): RouteErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("RouteErrorBoundary", error, info.componentStack);
  }

  componentDidUpdate(prevProps: RouteErrorBoundaryProps): void {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }

    const chunkFailed = isChunkLoadError(error);

    return (
      <EmptyState
        className="min-h-64"
        icon={<WifiOff className="h-5 w-5 text-muted-foreground" />}
        title={chunkFailed ? "页面加载失败" : "页面出错了"}
        description={
          chunkFailed
            ? "网络异常或资源加载失败，请检查网络后重新加载。"
            : "页面渲染出错，请尝试重新加载。"
        }
        action={
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            重新加载
          </Button>
        }
      />
    );
  }
}
