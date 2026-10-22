// @vitest-environment happy-dom
import { expect, test } from "vite-plus/test";
import { notificationTarget } from "@/lib/notification";

test.each([
  [
    "/dashboard/planning/1/items/2?taskInstanceId=3#form",
    "/dashboard/planning/1/items/2?taskInstanceId=3#form",
  ],
  ["/dashboard/announcements/7", "/dashboard/announcements/7"],
  ["/dashboard/a/../planning", "/dashboard/planning"],
  ["/dashboard/../../login", null],
  ["/dashboard/%2e%2e/%2e%2e/login", null],
  ["/dashboard/..", null],
  ["//evil.example", null],
  ["https://evil.example/dashboard/", null],
  ["/dashboard/https://evil.example", null],
  ["/dashboard/\\evil", null],
  ["/dashboard/with space", null],
  ["/dashboard/with\nnewline", null],
  ["/admin", null],
  ["/login", null],
  [null, null],
])("navigation boundary %j", (value, expected): void => {
  expect(notificationTarget(value)).toBe(expected);
});
