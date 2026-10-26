export function formatDate(value?: string, includeTime = true): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return includeTime ? date.toLocaleString("zh-CN") : date.toLocaleDateString("zh-CN");
}

const buildTimeFormatter = new Intl.DateTimeFormat("sv-SE", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function formatBuildTime(value?: string | null): string {
  if (!value?.trim()) return "未知";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未知";
  return buildTimeFormatter.format(date);
}

const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB", "PB"] as const;

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  if (unit === 0) return `${Math.round(value)} B`;
  const rounded = Math.round(value * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text} ${BYTE_UNITS[unit]}`;
}

export function formatStorageUsage(count: number, bytes: number): string {
  const files = Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0;
  if (files === 0 && (!Number.isFinite(bytes) || bytes <= 0)) return "0";
  return `${files} · ${formatBytes(bytes)}`;
}
