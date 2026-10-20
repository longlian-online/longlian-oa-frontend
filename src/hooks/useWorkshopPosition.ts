import { useLayoutEffect, useRef, type RefObject } from "react";
import { useLocation } from "react-router";

import { getCurrentOrgId, getUserId } from "@/lib/session";

interface WorkshopPosition {
  top: number;
  left: number;
}

export function useWorkshopPosition(): RefObject<HTMLDivElement | null> {
  const root = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const key = `workshop-position:${getUserId()}:${getCurrentOrgId()}:${location.pathname}${location.search}`;

  useLayoutEffect(() => {
    const element = root.current;
    const main = element?.closest("main");
    const types = element?.querySelector<HTMLDivElement>('[aria-label="企划类型筛选"]');
    if (!main || !element) return;
    let position: WorkshopPosition = { top: 0, left: 0 };
    try {
      const stored = sessionStorage.getItem(key);
      if (stored) position = JSON.parse(stored) as WorkshopPosition;
    } catch {
      // 浏览器禁用存储时不阻止正常浏览。
    }
    let latest = position;
    const remember = (): void => {
      if (element.isConnected) latest = { top: main.scrollTop, left: types?.scrollLeft ?? 0 };
    };
    const restore = (): void => {
      main.scrollTop = position.top;
      if (types) types.scrollLeft = position.left;
      remember();
    };
    restore();
    const frame = requestAnimationFrame(restore);
    const save = (): void => {
      try {
        sessionStorage.setItem(key, JSON.stringify(latest));
      } catch {
        // 存储不可用时仍允许离开页面。
      }
    };
    // 卸载时滚动容器可能已因内容移除而归零，保存离开前的读数，不再读取布局。
    main.addEventListener("scroll", remember, { passive: true });
    types?.addEventListener("scroll", remember, { passive: true });
    element.addEventListener("pointerdown", remember, true);
    element.addEventListener("keydown", remember, true);
    window.addEventListener("pagehide", save);
    return () => {
      cancelAnimationFrame(frame);
      save();
      window.removeEventListener("pagehide", save);
      main.removeEventListener("scroll", remember);
      types?.removeEventListener("scroll", remember);
      element.removeEventListener("pointerdown", remember, true);
      element.removeEventListener("keydown", remember, true);
    };
  }, [key]);

  return root;
}
