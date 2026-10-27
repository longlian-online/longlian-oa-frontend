export type DateTimeMode = "date" | "datetime";

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATETIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

export function padTime(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatDate(date: Date): string {
  return `${date.getFullYear()}-${padTime(date.getMonth() + 1)}-${padTime(date.getDate())}`;
}

export function formatDateTime(date: Date): string {
  return `${formatDate(date)}T${padTime(date.getHours())}:${padTime(date.getMinutes())}`;
}

export function formatDisplay(value: string, mode: DateTimeMode): string {
  if (!value) return mode === "date" ? "选择日期" : "选择时间";
  return mode === "date" ? value : value.replace("T", " ");
}

function parse(value: string, mode: DateTimeMode): Date | null {
  const matched = (mode === "date" ? DATE_PATTERN : DATETIME_PATTERN).exec(value);
  if (!matched) return null;
  const year = Number(matched[1]);
  const month = Number(matched[2]);
  const day = Number(matched[3]);
  const hour = mode === "datetime" ? Number(matched[4]) : 0;
  const minute = mode === "datetime" ? Number(matched[5]) : 0;
  if (hour > 23 || minute > 59) return null;
  const date = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) {
    return null;
  }
  return date;
}

export function parseDate(value: string): Date | null {
  return parse(value, "date");
}

export function parseDateTime(value: string): Date | null {
  return parse(value, "datetime");
}

function bound(value: string | undefined, mode: DateTimeMode): string | null {
  if (!value || !parse(value, mode)) return null;
  return value;
}

export function isDayDisabled(day: Date, mode: DateTimeMode, min?: string, max?: string): boolean {
  const key = formatDate(day);
  const lower = bound(min, mode);
  const upper = bound(max, mode);
  if (lower && key < lower.slice(0, 10)) return true;
  if (upper && key > upper.slice(0, 10)) return true;
  return false;
}

export function isMinuteDisabled(
  day: Date,
  hour: number,
  minute: number,
  mode: DateTimeMode,
  min?: string,
  max?: string,
): boolean {
  if (mode !== "datetime" || isDayDisabled(day, mode, min, max)) return true;
  const key = `${formatDate(day)}T${padTime(hour)}:${padTime(minute)}`;
  const lower = bound(min, mode);
  const upper = bound(max, mode);
  if (lower && key < lower) return true;
  if (upper && key > upper) return true;
  return false;
}

export function isHourDisabled(
  day: Date,
  hour: number,
  mode: DateTimeMode,
  min?: string,
  max?: string,
): boolean {
  return Array.from({ length: 60 }, (_, minute) => minute).every((minute) =>
    isMinuteDisabled(day, hour, minute, mode, min, max),
  );
}

export function currentValue(
  mode: DateTimeMode,
  min: string | undefined,
  max: string | undefined,
  now: Date,
): string | null {
  const value = mode === "date" ? formatDate(now) : formatDateTime(now);
  if (mode === "date") {
    return isDayDisabled(now, mode, min, max) ? null : value;
  }
  return isMinuteDisabled(now, now.getHours(), now.getMinutes(), mode, min, max) ? null : value;
}
