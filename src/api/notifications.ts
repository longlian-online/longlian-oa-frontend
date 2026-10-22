import { request } from "@/api/request";
import type {
  NotificationCursor,
  NotificationPageVO,
  NotificationReadVO,
  NotificationReadAllVO,
  NotificationStatusVO,
} from "@/types/notifications";

export async function getNotificationStatus(): Promise<NotificationStatusVO> {
  return request("/notifications/status");
}

export async function getNotifications(
  cursor: NotificationCursor | null,
): Promise<NotificationPageVO> {
  const query = cursor
    ? `?${new URLSearchParams({ beforeCreatedAt: cursor.createdAt, beforeId: cursor.id })}`
    : "";
  return request(`/notifications${query}`);
}

export async function markNotificationRead(id: string): Promise<NotificationReadVO> {
  return request(`/notifications/${id}/read`, { method: "PUT" });
}

export async function markAllNotificationsRead(): Promise<NotificationReadAllVO> {
  return request("/notifications/read-all", { method: "PUT" });
}
