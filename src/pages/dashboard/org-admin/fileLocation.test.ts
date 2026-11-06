import { expect, test } from "vite-plus/test";

import { orgFileLocation, orgFileSearch, parentOrgFileLocation } from "./fileLocation";

test("ignores a project file path that has no planning", () => {
  expect(orgFileLocation(new URLSearchParams("itemId=10"))).toEqual({});
});

test("keeps planning and project in the address", () => {
  const location = orgFileLocation(new URLSearchParams("projectId=2&itemId=10"));
  expect(location).toEqual({ projectId: "2", itemId: "10" });
  expect(orgFileSearch(location)).toBe("projectId=2&itemId=10");
  expect(parentOrgFileLocation(location)).toEqual({ projectId: "2" });
  expect(parentOrgFileLocation({ projectId: "2" })).toEqual({});
  expect(parentOrgFileLocation({})).toBeNull();
});
