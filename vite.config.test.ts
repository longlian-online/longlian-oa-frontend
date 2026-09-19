import { describe, expect, test } from "vite-plus/test";

import { isAdminApiPath } from "./vite.config";

describe("admin dev-server proxy matching", () => {
  test("keeps admin page URLs in the SPA", () => {
    expect(isAdminApiPath("/admin/scheduled-tasks")).toBe(false);
    expect(isAdminApiPath("/admin/organizations")).toBe(false);
  });

  test("proxies admin API URLs", () => {
    expect(isAdminApiPath("/admin/scheduled-tasks/")).toBe(true);
    expect(isAdminApiPath("/admin/scheduled-tasks/cleanup/trigger")).toBe(true);
    expect(isAdminApiPath("/admin/session")).toBe(true);
  });
});
