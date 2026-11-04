// @vitest-environment happy-dom
import { expect, test } from "vite-plus/test";

import { routeLoaderModules } from "@/lib/routeLoaderModules";

const colocatedTestModules = import.meta.glob("/src/routeLoaders/**/*.test.ts");

test("startup route loader graph excludes colocated tests", () => {
  const keys = Object.keys(routeLoaderModules);
  const tests = Object.keys(colocatedTestModules);

  expect(keys.length).toBeGreaterThan(0);
  expect(keys).toContain("/src/routeLoaders/admin/admins.ts");
  expect(tests).toEqual(
    expect.arrayContaining([
      "/src/routeLoaders/admin/listQuery.test.ts",
      "/src/routeLoaders/dashboard/org-admin/listLoaders.test.ts",
    ]),
  );
  expect(keys.filter((key) => tests.includes(key) || key.includes(".test."))).toEqual([]);
});
