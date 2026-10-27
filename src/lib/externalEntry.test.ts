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
  expect(entry && externalEntryPath(entry)).toBe(
    "/dashboard/planning/11/items/22?taskInstanceId=202",
  );
});

test("task assignment opens the assigned task", (): void => {
  const entry = parseExternalEntry(
    "type=TASK_ASSIGNED&orgId=8&projectId=11&itemId=22&taskInstanceId=202",
  );
  expect(entry && externalEntryPath(entry)).toBe(
    "/dashboard/planning/11/items/22?taskInstanceId=202",
  );
});

test("item completed opens the item without selecting a task", (): void => {
  const entry = parseExternalEntry("type=ITEM_COMPLETED&orgId=8&projectId=11&itemId=22");
  expect(entry && externalEntryPath(entry)).toBe("/dashboard/planning/11/items/22");
});

test("review notifications open the administrator lists", (): void => {
  const join = parseExternalEntry("type=JOIN_APPLICATION&orgId=8&applicationId=77");
  expect(join && externalEntryPath(join)).toBe("/dashboard/org-admin/applications");
  const deletion = parseExternalEntry("type=DELETION_REQUEST&orgId=8&requestId=56");
  expect(deletion && externalEntryPath(deletion)).toBe("/dashboard/org-admin/deletion-requests");
  expect(loginResumePath("/go?type=JOIN_APPLICATION&orgId=8&applicationId=77")).toBe(
    "/go?type=JOIN_APPLICATION&orgId=8&applicationId=77",
  );
});

test.each([
  "",
  "type=TASK_READY&orgId=8&projectId=11&itemId=22",
  "type=OTHER&orgId=8&projectId=11&itemId=22",
  "type=TASK_READY&orgId=0&projectId=11&itemId=22&taskInstanceId=202",
  "type=TASK_READY&orgId=8&projectId=11a&itemId=22&taskInstanceId=202",
  "type=ITEM_COMPLETED&orgId=8&projectId=11",
  "type=JOIN_APPLICATION&orgId=8",
  "type=DELETION_REQUEST&orgId=8&requestId=0",
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
