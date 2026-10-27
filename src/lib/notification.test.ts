// @vitest-environment happy-dom
import { expect, test } from "vite-plus/test";
import {
  compareNotifications,
  notificationPresentation,
  notificationTarget,
} from "@/lib/notification";
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

test("review notifications describe the request and open the administrator list", (): void => {
  const joined: NotificationVO = {
    id: "4",
    sourceId: "4",
    createdAt: "2026-10-22 09:00:00",
    readAt: null,
    thumbnailUrl: null,
    kind: "JOIN_APPLICATION",
    source: { applicantName: "新同学" },
  };
  const deletion: NotificationVO = {
    id: "5",
    sourceId: "5",
    createdAt: "2026-10-22 09:00:00",
    readAt: null,
    thumbnailUrl: null,
    kind: "DELETION_REQUEST",
    source: { requesterName: "管理员", targetType: "PROJECT", targetTitle: "作品" },
  };
  expect(notificationPresentation(joined).message).toBe("「新同学」申请加入组织。");
  expect(notificationPresentation(deletion)).toMatchObject({
    message: "「管理员」申请删除企划「作品」。",
    targetPath: "/dashboard/org-admin/deletion-requests",
  });
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
