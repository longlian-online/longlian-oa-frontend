// @vitest-environment happy-dom
import { expect, test } from "vite-plus/test";
import { compareNotifications, notificationTarget } from "@/lib/notification";
import type { NotificationVO } from "@/types/notifications";

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

test("newer read notification stays behind older unread notification", (): void => {
  const unread = row("1", null, "2026-10-22 09:00:00");
  const newerRead = row("2", "2026-10-22 13:10:00", "2026-10-22 13:00:00");
  expect([newerRead, unread].sort(compareNotifications)).toEqual([unread, newerRead]);
});

function row(id: string, readAt: string | null, createdAt: string): NotificationVO {
  return {
    id,
    sourceId: id,
    createdAt,
    readAt,
    thumbnailUrl: null,
    kind: "ITEM_COMPLETED",
    source: {
      projectId: "11",
      projectTitle: "企划",
      itemId: "22",
      itemTitle: "项目",
      taskSlot: null,
    },
  };
}
