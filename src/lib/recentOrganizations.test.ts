import { beforeEach, expect, test, vi } from "vite-plus/test";
import {
  prependRecentOrganization,
  readRecentOrganizationIds,
  writeRecentOrganizationIds,
} from "@/lib/recentOrganizations";

const storage = new Map<string, string>();
beforeEach((): void => {
  storage.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key: string): string | null => storage.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      storage.set(key, value);
    },
  });
});

test("successful switches deduplicate and keep the three most recent ids", (): void => {
  let ids: string[] = [];
  for (const id of ["11", "22", "33", "44", "22"]) ids = prependRecentOrganization(ids, id);
  expect(ids).toEqual(["22", "44", "33"]);
});

test("history persists separately for each account", (): void => {
  writeRecentOrganizationIds("1", ["22", "44", "33"]);
  writeRecentOrganizationIds("2", ["11"]);
  expect(readRecentOrganizationIds("1")).toEqual(["22", "44", "33"]);
  expect(readRecentOrganizationIds("2")).toEqual(["11"]);
});

test("missing or malformed history is empty", (): void => {
  expect(readRecentOrganizationIds("1")).toEqual([]);
  for (const value of ["{", "null", "{}", '"11"']) {
    storage.set("recent-organizations:1", value);
    expect(readRecentOrganizationIds("1")).toEqual([]);
  }
});

test("history accepts only positive string ids without wasting slots on duplicates", (): void => {
  storage.set(
    "recent-organizations:1",
    JSON.stringify(["0", 11, null, "-1", "01", "11", "11", "22", "33", "44"]),
  );
  expect(readRecentOrganizationIds("1")).toEqual(["11", "22", "33"]);
});

test("unavailable storage does not interrupt organization operations", (): void => {
  vi.stubGlobal("localStorage", {
    getItem: (): never => {
      throw new Error("denied");
    },
    setItem: (): never => {
      throw new Error("denied");
    },
  });
  expect(readRecentOrganizationIds("1")).toEqual([]);
  writeRecentOrganizationIds("1", ["11"]);
  expect(prependRecentOrganization(["22"], "11")).toEqual(["11", "22"]);
});
