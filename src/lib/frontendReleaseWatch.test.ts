import { afterEach, expect, test, vi } from "vite-plus/test";

import { refreshFrontend, restoreFrontendUrl } from "./frontendReleaseWatch";

afterEach(() => {
  vi.unstubAllGlobals();
});

test("刷新时绕过旧页面缓存，并在路由初始化前还原地址", () => {
  const originalUrl = "https://oa.example/dashboard/planning?search=a%20b&page=2#details";
  let currentUrl = originalUrl;
  const values = new Map<string, string>();
  const historyState = { key: "existing" };
  const reload = vi.fn();
  const replaceState = vi.fn((_state: unknown, _title: string, url: string) => {
    currentUrl = url;
  });
  vi.stubGlobal("window", {
    location: {
      get href() {
        return currentUrl;
      },
      replace: (url: string) => {
        currentUrl = url;
      },
      reload,
    },
    sessionStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
    history: { state: historyState, replaceState },
  });

  refreshFrontend();
  expect(currentUrl).toMatch(
    /^https:\/\/oa\.example\/dashboard\/planning\?search=a%20b&page=2&__oa_refresh=[\w-]+#details$/,
  );
  expect(reload).not.toHaveBeenCalled();
  restoreFrontendUrl();
  expect(currentUrl).toBe(originalUrl);
  expect(replaceState).toHaveBeenCalledWith(historyState, "", originalUrl);
  expect(values.size).toBe(0);
});

test("存储不可用时仍可普通刷新", () => {
  const reload = vi.fn();
  vi.stubGlobal("window", {
    location: { href: "https://oa.example/", reload },
    get sessionStorage(): never {
      throw new Error("storage unavailable");
    },
  });
  refreshFrontend();
  expect(reload).toHaveBeenCalledOnce();
});
