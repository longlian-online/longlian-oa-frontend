export interface RequestContext {
  token: string | null;
  orgId: string | null;
  signal?: AbortSignal;
  managed: boolean;
  isCurrent?: () => boolean;
}

let activeContext: RequestContext | undefined;

/** API 函数必须同步启动 request；request 会在第一次 await 前复制上下文。 */
export function runWithRequestContext<T>(
  context: RequestContext,
  execute: () => Promise<T>,
): Promise<T> {
  const previous = activeContext;
  activeContext = context;
  try {
    return execute();
  } finally {
    activeContext = previous;
  }
}

export function getRequestContext(): RequestContext | undefined {
  return activeContext;
}
