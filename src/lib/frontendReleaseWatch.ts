import { APP_BUILD_TIME } from "@/release";
import {
  clearStaleAssetReload,
  dismissReleaseBuildTime,
  dismissedReleaseBuildTime,
  inspectRelease,
  markStaleAssetReload,
  type ReleaseStorage,
} from "@/lib/frontendRelease";

type ReleaseNoticeListener = (buildTime: string | null) => void;

const REFRESH_URL_KEY = "oa:release-refresh-url";

const listeners = new Set<ReleaseNoticeListener>();
let noticedBuildTime: string | null = null;
let started = false;
let checking = false;

export function subscribeReleaseNotice(listener: ReleaseNoticeListener): () => void {
  listeners.add(listener);
  listener(noticedBuildTime);
  return () => {
    listeners.delete(listener);
  };
}

export function dismissReleaseNotice(buildTime: string): void {
  const storage = releaseStorage();
  if (storage) dismissReleaseBuildTime(storage, buildTime);
  publishReleaseNotice(null);
}

export function refreshFrontend(): void {
  try {
    const currentUrl = window.location.href;
    const hashIndex = currentUrl.indexOf("#");
    const pageUrl = hashIndex < 0 ? currentUrl : currentUrl.slice(0, hashIndex);
    const hash = hashIndex < 0 ? "" : currentUrl.slice(hashIndex);
    const separator = pageUrl.includes("?") ? "&" : "?";
    const nonce = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    const refreshUrl = `${pageUrl}${separator}__oa_refresh=${nonce}${hash}`;
    window.sessionStorage.setItem(REFRESH_URL_KEY, JSON.stringify({ currentUrl, refreshUrl }));
    window.location.replace(refreshUrl);
  } catch {
    window.location.reload();
  }
}

export function restoreFrontendUrl(): void {
  try {
    const saved = window.sessionStorage.getItem(REFRESH_URL_KEY);
    if (saved === null) return;
    window.sessionStorage.removeItem(REFRESH_URL_KEY);
    const parsed: unknown = JSON.parse(saved);
    if (typeof parsed !== "object" || parsed === null) return;
    if (!("refreshUrl" in parsed) || !("currentUrl" in parsed)) return;
    if (parsed.refreshUrl !== window.location.href || typeof parsed.currentUrl !== "string") return;
    window.history.replaceState(window.history.state, "", parsed.currentUrl);
  } catch {
    // 无法恢复时保留当前地址，不影响页面启动。
  }
}

export function startFrontendReleaseWatch(): void {
  if (!import.meta.env.PROD || started || typeof window === "undefined") return;
  started = true;
  window.addEventListener("vite:preloadError", onPreloadError);
  document.addEventListener("visibilitychange", onVisibilityChange);
  void checkRelease();
}

function publishReleaseNotice(buildTime: string | null): void {
  noticedBuildTime = buildTime;
  listeners.forEach((listener) => listener(buildTime));
}

function releaseStorage(): ReleaseStorage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function onPreloadError(event: Event): void {
  const storage = releaseStorage();
  if (storage === null || !markStaleAssetReload(storage)) return;
  event.preventDefault();
  refreshFrontend();
}

function onVisibilityChange(): void {
  if (document.visibilityState !== "visible") return;
  void checkRelease();
}

function releaseManifestUrl(): string {
  const base = new URL(import.meta.env.BASE_URL, window.location.href);
  return new URL("version.json", base).href;
}

async function checkRelease(): Promise<void> {
  if (checking) return;
  checking = true;
  try {
    const response = await fetch(releaseManifestUrl(), { cache: "no-store" });
    if (!response.ok) return;
    const payload: unknown = await response.json();
    const storage = releaseStorage();
    const result = inspectRelease(
      APP_BUILD_TIME,
      payload,
      storage ? dismissedReleaseBuildTime(storage) : null,
    );
    if (result.clearReload && storage) clearStaleAssetReload(storage);
    if (result.noticeBuildTime !== null) publishReleaseNotice(result.noticeBuildTime);
    else if (result.clearReload) publishReleaseNotice(null);
  } catch {
    // 读不到版本文件时保持当前页面，不提示、不刷新。
  } finally {
    checking = false;
  }
}
