import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import {
  NOTIFICATION_DEDUPE_MS,
  notificationService,
  resetNotificationService,
  type Notification,
} from "@/services/notification";

beforeEach((): void => {
  resetNotificationService();
});

afterEach((): void => {
  vi.useRealTimers();
});

test("delivers one notification and ignores events after unsubscribe", (): void => {
  const received: Notification[] = [];
  const unsubscribe = notificationService.subscribe((notification) => {
    received.push(notification);
  });
  const notification: Notification = { type: "error", message: "一次" };

  notificationService.notify(notification);

  expect(received).toEqual([notification]);
  unsubscribe();
  notificationService.notify({ type: "error", message: "一次" });
  expect(received).toHaveLength(1);
});

test("replays one queued notification to the first subscriber only", (): void => {
  notificationService.notify({ type: "error", message: "一次" });
  notificationService.notify({ type: "error", message: "一次" });

  const first: Notification[] = [];
  notificationService.subscribe((notification) => {
    first.push(notification);
  });
  const second: Notification[] = [];
  notificationService.subscribe((notification) => {
    second.push(notification);
  });

  expect(first).toHaveLength(1);
  expect(first[0]).toEqual({ type: "error", message: "一次" });
  expect(second).toHaveLength(0);
});

test("dedupes the same message inside the window and delivers a different one", (): void => {
  vi.useFakeTimers();
  const start = new Date("2026-04-08T00:00:00.000Z");
  vi.setSystemTime(start);
  const received: Notification[] = [];
  notificationService.subscribe((notification) => {
    received.push(notification);
  });

  notificationService.notify({ type: "error", message: "一次" });
  notificationService.notify({ type: "warning", message: "另一次" });
  expect(received.map((notification) => notification.message)).toEqual(["一次", "另一次"]);

  vi.setSystemTime(start.getTime() + NOTIFICATION_DEDUPE_MS - 1);
  notificationService.notify({ type: "error", message: "一次" });
  expect(received).toHaveLength(2);

  vi.setSystemTime(start.getTime() + NOTIFICATION_DEDUPE_MS);
  notificationService.notify({ type: "error", message: "一次" });
  expect(received).toHaveLength(3);
  expect(received[2]).toEqual({ type: "error", message: "一次" });
});
