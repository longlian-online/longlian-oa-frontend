import { expect, test } from "vite-plus/test";

import { planningListReturnTo, readPage, withPage } from "./pageQuery";

test("page query keeps positive integers and drops the first page", () => {
  expect(readPage(new URLSearchParams("page=4"))).toBe(4);
  expect(withPage(new URLSearchParams("view=about"), 3).toString()).toBe("view=about&page=3");
  expect(withPage(new URLSearchParams("view=about&page=3"), 1).toString()).toBe("view=about");
});

test.each(["0", "-1", "2.5", "9007199254740992", "invalid"])(
  "unusable page %s is read as the first page",
  (page) => {
    expect(readPage(new URLSearchParams({ page }))).toBe(1);
  },
);

test("planning return only accepts this application's planning list address", () => {
  expect(planningListReturnTo({ planningListReturnTo: "/dashboard/planning?page=2" })).toBe(
    "/dashboard/planning?page=2",
  );
  expect(planningListReturnTo({ planningListReturnTo: "/dashboard/planning" })).toBe(
    "/dashboard/planning",
  );
  for (const value of [
    "https://other.example/dashboard/planning",
    "//other.example/dashboard/planning",
    "/dashboard/planning/21",
    "/dashboard/planning/21?page=2",
    {},
    null,
  ]) {
    expect(planningListReturnTo({ planningListReturnTo: value })).toBeUndefined();
  }
});
