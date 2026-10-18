import { useEffect, useState } from "react";
import { useLocation, useNavigation } from "react-router";

import { isPathnameNavigation, PAGE_LOADING_DELAY_MS, pendingPathname } from "@/lib/pageNavigation";

export function usePendingPathname(): string {
  const { pathname } = useLocation();
  const navigation = useNavigation();
  return pendingPathname(pathname, navigation);
}

export function usePageLoadingVisible(): boolean {
  const { pathname } = useLocation();
  const navigation = useNavigation();
  const pending = isPathnameNavigation(pathname, navigation);
  const [delayElapsed, setDelayElapsed] = useState(false);

  useEffect(() => {
    if (!pending) {
      setDelayElapsed(false);
      return;
    }
    // 焦点在本次渲染就切过去。加载态晚一拍，避免缓存命中时闪一下。
    const timeout = window.setTimeout(() => setDelayElapsed(true), PAGE_LOADING_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [pending]);

  return pending && delayElapsed;
}
