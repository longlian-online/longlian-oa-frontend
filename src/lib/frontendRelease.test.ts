import { describe, expect, test } from "vite-plus/test";

import {
  DISMISSED_RELEASE_KEY,
  STALE_ASSET_RELOAD_KEY,
  clearStaleAssetReload,
  dismissReleaseBuildTime,
  dismissedReleaseBuildTime,
  inspectRelease,
  markStaleAssetReload,
  releaseBuildTime,
  releaseManifestAsset,
  type ReleaseStorage,
} from "./frontendRelease";

const LOCAL = "2026-10-28T00:00:00.000Z";
const NEXT = "2026-10-28T03:00:00.000Z";

function memoryStorage(): ReleaseStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

describe("release manifest", () => {
  test("writes version and the same build time", () => {
    expect(releaseManifestAsset("0.0.13", LOCAL)).toEqual({
      type: "asset",
      fileName: "version.json",
      source: `{"version":"0.0.13","buildTime":"${LOCAL}"}\n`,
    });
  });
});

describe("releaseBuildTime", () => {
  test.each([
    null,
    undefined,
    "1.0.0",
    [],
    { version: "1.0.0" },
    { buildTime: "" },
    { buildTime: "   " },
    { buildTime: 1 },
  ])("rejects %j", (payload) => {
    expect(releaseBuildTime(payload)).toBeNull();
  });

  test("keeps a non-empty build time", () => {
    expect(releaseBuildTime({ version: "0.0.13", buildTime: LOCAL })).toBe(LOCAL);
  });
});

describe("inspectRelease", () => {
  test("clears the reload guard when the running build is current", () => {
    expect(inspectRelease(LOCAL, { buildTime: LOCAL }, null)).toEqual({
      noticeBuildTime: null,
      clearReload: true,
    });
  });

  test("notifies when the deployed build time differs", () => {
    expect(inspectRelease(LOCAL, { buildTime: NEXT }, null)).toEqual({
      noticeBuildTime: NEXT,
      clearReload: false,
    });
  });

  test("stays quiet for an invalid payload or a dismissed build", () => {
    expect(inspectRelease(LOCAL, { buildTime: " " }, null)).toEqual({
      noticeBuildTime: null,
      clearReload: false,
    });
    expect(inspectRelease(LOCAL, { buildTime: NEXT }, NEXT)).toEqual({
      noticeBuildTime: null,
      clearReload: false,
    });
  });

  test("notifies again for a build newer than the dismissed one", () => {
    expect(inspectRelease(LOCAL, { buildTime: "2026-10-29T00:00:00.000Z" }, NEXT)).toEqual({
      noticeBuildTime: "2026-10-29T00:00:00.000Z",
      clearReload: false,
    });
  });
});

describe("release storage", () => {
  test("reloads for a stale asset only once", () => {
    const storage = memoryStorage();
    expect(markStaleAssetReload(storage)).toBe(true);
    expect(markStaleAssetReload(storage)).toBe(false);
    expect(storage.data.get(STALE_ASSET_RELOAD_KEY)).toBe("1");
    clearStaleAssetReload(storage);
    expect(markStaleAssetReload(storage)).toBe(true);
  });

  test("remembers the dismissed build time", () => {
    const storage = memoryStorage();
    expect(dismissedReleaseBuildTime(storage)).toBeNull();
    dismissReleaseBuildTime(storage, NEXT);
    expect(dismissedReleaseBuildTime(storage)).toBe(NEXT);
    expect(storage.data.get(DISMISSED_RELEASE_KEY)).toBe(NEXT);
  });
});
