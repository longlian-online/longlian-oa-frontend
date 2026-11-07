import { expect, test } from "vite-plus/test";

import { orgFileLocation, orgFileSearch, parentOrgFileLocation } from "./fileLocation";

test("ignores a project file path that has no planning", () => {
  expect(orgFileLocation(new URLSearchParams("itemId=10"))).toEqual({ tree: "planning" });
  expect(orgFileLocation(new URLSearchParams("view=nope&itemId=10"))).toEqual({ tree: "planning" });
});

test("keeps planning and project in the address", () => {
  const location = orgFileLocation(new URLSearchParams("projectId=2&itemId=10"));
  expect(location).toEqual({ tree: "planning", projectId: "2", itemId: "10" });
  expect(orgFileSearch(location)).toBe("projectId=2&itemId=10");
  expect(parentOrgFileLocation(location)).toEqual({ tree: "planning", projectId: "2" });
  expect(parentOrgFileLocation({ tree: "planning", projectId: "2" })).toEqual({ tree: "planning" });
  expect(parentOrgFileLocation({ tree: "planning" })).toBeNull();
});

test("type view drops folders that skip a level and round-trips the path", () => {
  expect(orgFileLocation(new URLSearchParams("view=type&projectId=2"))).toEqual({ tree: "type" });
  const location = orgFileLocation(
    new URLSearchParams("view=type&typeId=4&projectId=2&itemId=10&page=3"),
  );
  expect(location).toEqual({ tree: "type", typeId: "4", projectId: "2", itemId: "10" });
  expect(orgFileSearch(location)).toBe("view=type&typeId=4&projectId=2&itemId=10");
  expect(parentOrgFileLocation(location)).toEqual({ tree: "type", typeId: "4", projectId: "2" });
  expect(parentOrgFileLocation({ tree: "type", typeId: "4", projectId: "2" })).toEqual({
    tree: "type",
    typeId: "4",
  });
  expect(parentOrgFileLocation({ tree: "type", typeId: "4" })).toEqual({ tree: "type" });
  expect(parentOrgFileLocation({ tree: "type" })).toBeNull();
});

test("item view is only project then files", () => {
  expect(orgFileLocation(new URLSearchParams("view=item&projectId=2&typeId=4"))).toEqual({
    tree: "item",
  });
  const location = orgFileLocation(new URLSearchParams("view=item&itemId=10&projectId=2"));
  expect(location).toEqual({ tree: "item", itemId: "10" });
  expect(orgFileSearch(location)).toBe("view=item&itemId=10");
  expect(parentOrgFileLocation(location)).toEqual({ tree: "item" });
  expect(parentOrgFileLocation({ tree: "item" })).toBeNull();
});
