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
