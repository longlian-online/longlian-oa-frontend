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
  JOIN_APPLICATION: "入组申请",
  DELETION_REQUEST: "删除申请",
};

export function notificationPresentation(notification: NotificationVO): NotificationPresentation {
  const label = NOTIFICATION_LABELS[notification.kind];
  if (notification.source === null) {
    return { label, message: "通知关联内容已不可访问", targetPath: null };
  }
  switch (notification.kind) {
    case "TASK_READY":
    case "TASK_ASSIGNED": {
      const source = notification.source;
      const title = `「${source.projectTitle} · ${source.itemTitle}」`;
      const itemPath = `/dashboard/planning/${source.projectId}/items/${source.itemId}`;
      const action =
        notification.kind === "TASK_READY"
          ? `的前置步骤已完成，你接取的「${formatSlotLabel(source.taskSlot)}」可以开始了。`
          : `的「${formatSlotLabel(source.taskSlot)}」已分配给你，无需手动领取。`;
      return {
        label,
        message: `${title}${action}`,
        targetPath: `${itemPath}?taskInstanceId=${notification.sourceId}`,
      };
    }
    case "ITEM_COMPLETED": {
      const source = notification.source;
      return {
        label,
        message: `「${source.projectTitle} · ${source.itemTitle}」的全部任务已完成。`,
        targetPath: `/dashboard/planning/${source.projectId}/items/${source.itemId}`,
      };
    }
    case "JOIN_APPLICATION":
      return {
        label,
        message: `「${notification.source.applicantName}」申请加入组织。`,
        targetPath: "/dashboard/org-admin/applications",
      };
    case "DELETION_REQUEST": {
      const target = notification.source.targetType === "PROJECT" ? "企划" : "项目";
      return {
        label,
        message: `「${notification.source.requesterName}」申请删除${target}「${notification.source.targetTitle}」。`,
        targetPath: "/dashboard/org-admin/deletion-requests",
      };
    }
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
