export const GATEWAY_ERROR_MESSAGE = "服务暂时不可用，请稍后重试";
export const NETWORK_ERROR_MESSAGE = "网络请求失败，请稍后重试";
export const NOTIFICATION_DEDUPE_MS = 2400;

export type NotificationType = "success" | "error" | "warning" | "info";

export interface Notification {
  type: NotificationType;
  message: string;
}

type NotificationListener = (notification: Notification) => void;

interface NotificationService {
  subscribe(listener: NotificationListener): () => void;
  notify(notification: Notification): void;
}

const listeners = new Set<NotificationListener>();
const pending: Notification[] = [];
const recent = new Map<string, number>();

function notificationKey(notification: Notification): string {
  return `${notification.type}\0${notification.message}`;
}

function pruneRecent(now: number): void {
  for (const [key, timestamp] of recent) {
    if (now - timestamp >= NOTIFICATION_DEDUPE_MS) recent.delete(key);
  }
}

function subscribe(listener: NotificationListener): () => void {
  listeners.add(listener);
  const queued = pending.splice(0);
  for (const notification of queued) listener(notification);
  return () => {
    listeners.delete(listener);
  };
}

function notify(notification: Notification): void {
  const now = Date.now();
  pruneRecent(now);
  const key = notificationKey(notification);
  if (recent.has(key)) return;

  recent.set(key, now);
  if (listeners.size === 0) {
    if (!pending.some((item) => notificationKey(item) === key)) pending.push(notification);
    return;
  }

  for (const listener of listeners) listener(notification);
}

export function resetNotificationService(): void {
  listeners.clear();
  pending.length = 0;
  recent.clear();
}

export const notificationService: NotificationService = {
  subscribe,
  notify,
};
