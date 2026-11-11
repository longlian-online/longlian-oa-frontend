import { expect, test } from "vite-plus/test";

import { orgFileLocation, orgFileSearch, parentOrgFileLocation } from "./fileLocation";

test("root is types, and a path that skips the type is dropped", () => {
  expect(orgFileLocation(new URLSearchParams())).toEqual({ view: "item" });
  expect(orgFileLocation(new URLSearchParams("view=nope&itemId=10&projectId=2"))).toEqual({
    view: "item",
  });
  expect(orgFileSearch({ view: "item" })).toBe("");
  expect(parentOrgFileLocation({ view: "item" })).toBeNull();
});

test("type then planning then project files round-trip", () => {
  const plannings = orgFileLocation(new URLSearchParams("typeId=4&view=task&itemId=10"));
  expect(plannings).toEqual({ view: "item", typeId: "4" });
  expect(orgFileSearch(plannings)).toBe("typeId=4");

  const location = orgFileLocation(new URLSearchParams("typeId=4&projectId=2&itemId=10&page=3"));
  expect(location).toEqual({ view: "item", typeId: "4", projectId: "2", itemId: "10" });
  expect(orgFileSearch(location)).toBe("typeId=4&projectId=2&itemId=10");
  expect(parentOrgFileLocation(location)).toEqual({ view: "item", typeId: "4", projectId: "2" });
  expect(parentOrgFileLocation({ view: "item", typeId: "4", projectId: "2" })).toEqual({
    view: "item",
    typeId: "4",
  });
});

test("task view keeps the task and ignores a project id", () => {
  const folders = orgFileLocation(new URLSearchParams("typeId=4&projectId=2&view=task&itemId=10"));
  expect(folders).toEqual({ view: "task", typeId: "4", projectId: "2" });
  expect(orgFileSearch(folders)).toBe("typeId=4&projectId=2&view=task");

  const files = orgFileLocation(
    new URLSearchParams("typeId=4&projectId=2&view=task&taskId=5&itemId=10"),
  );
  expect(files).toEqual({ view: "task", typeId: "4", projectId: "2", taskId: "5" });
  expect(orgFileSearch(files)).toBe("typeId=4&projectId=2&view=task&taskId=5");
  expect(parentOrgFileLocation(files)).toEqual({ view: "task", typeId: "4", projectId: "2" });
});
