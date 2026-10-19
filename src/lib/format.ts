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
