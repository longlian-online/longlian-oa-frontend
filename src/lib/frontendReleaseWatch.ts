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
  window.location.reload();
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
