import { expect, test } from "vite-plus/test";

import { getListReturnTo, getProjectItemsReturnTo } from "./listReturnTo";

test.each([
  "/admin/product-releases?status=DRAFT&page=3",
  "/dashboard/org-admin/workflows?keyword=test&page=2",
  "/dashboard/workshop/tasks?page=4",
  "/dashboard/planning/project-1/items?page=2",
])("preserves allowlisted list destination %s", (value) => {
  expect(getListReturnTo({ listReturnTo: value, other: true })).toBe(value);
});

test.each([
  "https://evil.example/admin/product-releases",
  "//evil.example/admin/product-releases",
  "/\\evil.example/admin/product-releases",
  "/admin/product-releases/create",
  "/admin/product-releases/1",
  "/admin/product-releases/../login",
  "/admin/product-releases%3fpage=2",
  "/admin/product-releases#evil",
  "/admin/product-releases\n",
  "/dashboard/planning/../items",
  "javascript:alert(1)",
  null,
  {},
])("rejects non-list or unsafe destination %s", (value) => {
  expect(getListReturnTo({ listReturnTo: value })).toBeUndefined();
  expect(getListReturnTo({ listReturnTo: value }, "/admin/product-releases")).toBe(
    "/admin/product-releases",
  );
});

test.each([
  "/dashboard/planning/21?status=ALL&page=3",
  "/dashboard/planning/21/items?status=COMPLETED&page=2",
])("accepts both project item list hosts %s", (source) => {
  expect(getProjectItemsReturnTo({ projectItemsReturnTo: source }, "21")).toBe(source);
  expect(getProjectItemsReturnTo({ projectItemsReturnTo: source }, "22")).toBeUndefined();
});

test.each([
  "https://evil.example/dashboard/planning/21",
  "/dashboard/planning/21/edit",
  "/dashboard/planning/21/items/new",
  "/dashboard/planning/21#bad",
  "/dashboard/planning/21\\\\bad",
  "/dashboard/planning/21\n",
])("rejects unsafe project item return %s", (source) => {
  expect(getProjectItemsReturnTo({ projectItemsReturnTo: source }, "21")).toBeUndefined();
});

test("handles missing state and validates fallback too", () => {
  expect(getListReturnTo(null)).toBeUndefined();
  expect(getListReturnTo({}, "https://evil.example")).toBeUndefined();
  expect(getListReturnTo(null, "/dashboard/planning?page=2")).toBe("/dashboard/planning?page=2");
});
