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

test("rejected task notification names the slot, keeps the review comment and opens the task", (): void => {
  const rejected: NotificationVO = {
    id: "6",
    sourceId: "61",
    createdAt: "2026-11-03 09:00:00",
    readAt: null,
    thumbnailUrl: null,
    kind: "TASK_REJECTED",
    source: {
      projectId: "11",
      projectTitle: "企划",
      itemId: "22",
      itemTitle: "项目",
      taskSlot: { name: "翻译", slotIndex: 2, slotTotal: 3, serialStep: 2 },
      taskInstanceId: "202",
      reviewComment: "第三页需要修改",
    },
  };
  expect(notificationPresentation(rejected)).toEqual({
    label: "任务打回",
    message: "「企划 · 项目」的「翻译（第 2 步） · 2/3」已被打回，打回意见：第三页需要修改",
    targetPath: "/dashboard/planning/11/items/22?taskInstanceId=202",
  });
});

test("rejected task notification without a review comment asks for a resubmission", (): void => {
  const rejected: NotificationVO = {
    id: "7",
    sourceId: "62",
    createdAt: "2026-11-03 09:00:00",
    readAt: null,
    thumbnailUrl: null,
    kind: "TASK_REJECTED",
    source: {
      projectId: "11",
      projectTitle: "企划",
      itemId: "22",
      itemTitle: "项目",
      taskSlot: { name: "翻译", slotIndex: 1, slotTotal: 1, serialStep: null },
      taskInstanceId: "202",
      reviewComment: "   ",
    },
  };
  expect(notificationPresentation(rejected).message).toBe(
    "「企划 · 项目」的「翻译」已被打回，请修改后重新提交。",
  );
});

test("rejected task notification without a task instance keeps the label only", (): void => {
  const rejected: NotificationVO = {
    id: "8",
    sourceId: "63",
    createdAt: "2026-11-03 09:00:00",
    readAt: null,
    thumbnailUrl: null,
    kind: "TASK_REJECTED",
    source: {
      projectId: "11",
      projectTitle: "企划",
      itemId: "22",
      itemTitle: "项目",
      taskSlot: { name: "翻译", slotIndex: 1, slotTotal: 1, serialStep: null },
      taskInstanceId: null,
    },
  };
  expect(notificationPresentation(rejected)).toMatchObject({
    label: "任务打回",
    targetPath: null,
  });
});

test("long review comments are shortened in the inbox message", (): void => {
  const longComment = "字".repeat(45);
  const rejected: NotificationVO = {
    id: "9",
    sourceId: "64",
    createdAt: "2026-11-03 09:00:00",
    readAt: null,
    thumbnailUrl: null,
    kind: "TASK_REJECTED",
    source: {
      projectId: "11",
      projectTitle: "企划",
      itemId: "22",
      itemTitle: "项目",
      taskSlot: { name: "翻译", slotIndex: 1, slotTotal: 1, serialStep: null },
      taskInstanceId: "202",
      reviewComment: longComment,
    },
  };
  expect(notificationPresentation(rejected).message).toBe(
    `「企划 · 项目」的「翻译」已被打回，打回意见：${"字".repeat(40)}…`,
  );
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
