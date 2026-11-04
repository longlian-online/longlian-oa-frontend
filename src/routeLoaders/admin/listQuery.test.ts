import { beforeEach, expect, test, vi } from "vite-plus/test";
import type { LoaderFunctionArgs } from "react-router";

import { loader as adminsLoader } from "./admins";
import { loader as organizationsLoader } from "./organizations";
import { loader as storageLoader } from "./storage-stats";

const { fetchApiQuery, adminListQuery, adminOrganizationsQuery, storageStatsQuery } = vi.hoisted(
  () => ({
    fetchApiQuery: vi.fn(),
    adminListQuery: vi.fn(),
    adminOrganizationsQuery: vi.fn(),
    storageStatsQuery: vi.fn(),
  }),
);
vi.mock("@/lib/routeQuery", () => ({ fetchApiQuery }));
vi.mock("@/queries/admin", () => ({ adminListQuery, adminOrganizationsQuery, storageStatsQuery }));

beforeEach(() => vi.clearAllMocks());

function args(search: string): LoaderFunctionArgs {
  return {
    request: new Request(`https://oa.example/admin/list${search}`),
    unstable_url: new URL(`https://oa.example/admin/list${search}`),
    unstable_pattern: "/admin/list",
    params: {},
    context: {},
  };
}

test("admin list loader reads page from the request", async () => {
  await adminsLoader(args("?page=4"));
  expect(adminListQuery).toHaveBeenCalledWith(4);
});

test.each([
  ["?page=3&keyword=%20team%20", 3, "team"],
  ["?page=-1&keyword=%20", 1, ""],
] as const)("search loaders match list parsing for %s", async (search, page, keyword) => {
  await organizationsLoader(args(search));
  await storageLoader(args(search));
  expect(adminOrganizationsQuery).toHaveBeenCalledWith(page, keyword);
  expect(storageStatsQuery).toHaveBeenCalledWith(page, keyword);
});
