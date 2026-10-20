import { expect, test } from "vite-plus/test";

import { isPathnameNavigation, pendingPathname } from "@/lib/pageNavigation";

const current = "/dashboard/planning";

test("idle navigation keeps the current pathname", (): void => {
  const navigation = { state: "idle" };
  expect(pendingPathname(current, navigation)).toBe(current);
  expect(isPathnameNavigation(current, navigation)).toBe(false);
});

test("loading another pathname switches focus and marks a page change", (): void => {
  const navigation = { state: "loading", location: { pathname: "/dashboard/workshop" } };
  expect(pendingPathname(current, navigation)).toBe("/dashboard/workshop");
  expect(isPathnameNavigation(current, navigation)).toBe(true);
});

test("loading a nested pathname is still a page change", (): void => {
  const navigation = { state: "loading", location: { pathname: "/dashboard/planning/create" } };
  expect(pendingPathname(current, navigation)).toBe("/dashboard/planning/create");
  expect(isPathnameNavigation(current, navigation)).toBe(true);
});

test("loading the same pathname does not replace the page", (): void => {
  const navigation = { state: "loading", location: { pathname: current } };
  expect(pendingPathname(current, navigation)).toBe(current);
  expect(isPathnameNavigation(current, navigation)).toBe(false);
});

test("loading without a target location keeps the current page", (): void => {
  const navigation = { state: "loading", location: null };
  expect(pendingPathname(current, navigation)).toBe(current);
  expect(isPathnameNavigation(current, navigation)).toBe(false);
});

test("a submit does not move focus or replace the page", (): void => {
  const navigation = { state: "submitting", location: { pathname: "/dashboard/workshop" } };
  expect(pendingPathname(current, navigation)).toBe(current);
  expect(isPathnameNavigation(current, navigation)).toBe(false);
});
