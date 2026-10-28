export const STALE_ASSET_RELOAD_KEY = "oa:release-reload";
export const DISMISSED_RELEASE_KEY = "oa:release-dismissed";

export interface ReleaseStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface ReleaseManifestAsset {
  type: "asset";
  fileName: "version.json";
  source: string;
}

export interface ReleaseCheck {
  noticeBuildTime: string | null;
  clearReload: boolean;
}

export function releaseManifestAsset(version: string, buildTime: string): ReleaseManifestAsset {
  return {
    type: "asset",
    fileName: "version.json",
    source: `${JSON.stringify({ version, buildTime })}\n`,
  };
}

export function releaseBuildTime(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null || !("buildTime" in payload)) return null;
  const buildTime = (payload as { buildTime: unknown }).buildTime;
  if (typeof buildTime !== "string" || buildTime.trim() === "") return null;
  return buildTime;
}

export function inspectRelease(
  localBuildTime: string,
  payload: unknown,
  dismissedBuildTime: string | null,
): ReleaseCheck {
  const buildTime = releaseBuildTime(payload);
  if (buildTime === null) return { noticeBuildTime: null, clearReload: false };
  if (buildTime === localBuildTime) return { noticeBuildTime: null, clearReload: true };
  if (dismissedBuildTime !== null && buildTime === dismissedBuildTime) {
    return { noticeBuildTime: null, clearReload: false };
  }
  return { noticeBuildTime: buildTime, clearReload: false };
}

export function markStaleAssetReload(storage: ReleaseStorage): boolean {
  if (storage.getItem(STALE_ASSET_RELOAD_KEY) !== null) return false;
  storage.setItem(STALE_ASSET_RELOAD_KEY, "1");
  return true;
}

export function clearStaleAssetReload(storage: ReleaseStorage): void {
  storage.removeItem(STALE_ASSET_RELOAD_KEY);
}

export function dismissedReleaseBuildTime(storage: ReleaseStorage): string | null {
  return storage.getItem(DISMISSED_RELEASE_KEY);
}

export function dismissReleaseBuildTime(storage: ReleaseStorage, buildTime: string): void {
  storage.setItem(DISMISSED_RELEASE_KEY, buildTime);
}
