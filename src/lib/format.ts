export function formatDate(value?: string, includeTime = true): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return includeTime ? date.toLocaleString("zh-CN") : date.toLocaleDateString("zh-CN");
}
