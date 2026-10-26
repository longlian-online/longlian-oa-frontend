import { formatSlotLabel } from "@/lib/slotLabel";
import type { NotificationVO } from "@/types/notifications";

interface NotificationPresentation {
  label: string;
  message: string;
  targetPath: string | null;
}

const NOTIFICATION_LABELS: Record<NotificationVO["kind"], string> = {
  TASK_READY: "可以开始",
  TASK_ASSIGNED: "任务分配",
  ITEM_COMPLETED: "项目完成",
};

export function notificationPresentation(notification: NotificationVO): NotificationPresentation {
  const label = NOTIFICATION_LABELS[notification.kind];
  if (notification.source === null) {
    return { label, message: "通知关联内容已不可访问", targetPath: null };
  }
  const source = notification.source;
  const title = `「${source.projectTitle} · ${source.itemTitle}」`;
  const itemPath = `/dashboard/planning/${source.projectId}/items/${source.itemId}`;
  switch (notification.kind) {
    case "TASK_READY":
      return {
        label,
        message: `${title}的前置步骤已完成，你接取的「${formatSlotLabel(notification.source.taskSlot)}」可以开始了。`,
        targetPath: `${itemPath}?taskInstanceId=${notification.sourceId}`,
      };
    case "TASK_ASSIGNED":
      return {
        label,
        message: `${title}的「${formatSlotLabel(notification.source.taskSlot)}」已分配给你，无需手动领取。`,
        targetPath: `${itemPath}?taskInstanceId=${notification.sourceId}`,
      };
    case "ITEM_COMPLETED":
      return { label, message: `${title}的全部任务已完成。`, targetPath: itemPath };
  }
}

export function notificationTarget(value: string | null): string | null {
  if (!value?.startsWith("/dashboard/") || /[\\\s]|:\/\//.test(value)) return null;
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin || !url.pathname.startsWith("/dashboard/"))
      return null;
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}

export function formatNotificationTime(value: string, now: number = Date.now()): string {
  const date = new Date(value.replace(" ", "T"));
  if (!Number.isFinite(date.getTime())) return value;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.getTime() >= today.getTime()) {
    const minutes = Math.max(0, Math.floor((now - date.getTime()) / 60_000));
    if (minutes < 1) return "刚刚";
    if (minutes < 60) return `${minutes} 分钟前`;
    return `${Math.floor(minutes / 60)} 小时前`;
  }
  if (date.getTime() >= yesterday.getTime()) return "昨天";
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

export function compareNotifications(left: NotificationVO, right: NotificationVO): number {
  const unread = Number(right.readAt === null) - Number(left.readAt === null);
  if (unread !== 0) return unread;
  if (left.createdAt !== right.createdAt) return left.createdAt < right.createdAt ? 1 : -1;
  const leftId = BigInt(left.id);
  const rightId = BigInt(right.id);
  if (leftId === rightId) return 0;
  return leftId < rightId ? 1 : -1;
}
