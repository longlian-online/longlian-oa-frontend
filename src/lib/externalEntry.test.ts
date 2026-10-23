import { expect, test } from "vite-plus/test";

import { externalEntryPath, loginResumePath, parseExternalEntry } from "@/lib/externalEntry";

const task = "type=TASK_READY&orgId=8&projectId=11&itemId=22&taskInstanceId=202";

test("task ready opens the item with that task selected", (): void => {
  const entry = parseExternalEntry(task);
  expect(entry).toEqual({
    type: "TASK_READY",
    orgId: "8",
    projectId: "11",
    itemId: "22",
    taskInstanceId: "202",
  });
  expect(entry && externalEntryPath(entry)).toBe("/dashboard/planning/11/items/22?taskInstanceId=202");
});

test("item completed opens the item without selecting a task", (): void => {
  const entry = parseExternalEntry("type=ITEM_COMPLETED&orgId=8&projectId=11&itemId=22");
  expect(entry && externalEntryPath(entry)).toBe("/dashboard/planning/11/items/22");
});

test.each([
  "",
  "type=TASK_READY&orgId=8&projectId=11&itemId=22",
  "type=OTHER&orgId=8&projectId=11&itemId=22",
  "type=TASK_READY&orgId=0&projectId=11&itemId=22&taskInstanceId=202",
  "type=TASK_READY&orgId=8&projectId=11a&itemId=22&taskInstanceId=202",
  "type=ITEM_COMPLETED&orgId=8&projectId=11",
])("rejects %j", (search): void => {
  expect(parseExternalEntry(search)).toBeNull();
});

test("login resumes only a valid go link", (): void => {
  expect(loginResumePath(`/go?${task}`)).toBe(`/go?${task}`);
  expect(loginResumePath("/dashboard/planning/11/items/22?taskInstanceId=202")).toBeNull();
  expect(loginResumePath("//evil.example/go?type=TASK_READY")).toBeNull();
  expect(loginResumePath("/go?type=TASK_READY&orgId=8")).toBeNull();
  expect(loginResumePath(null)).toBeNull();
});
