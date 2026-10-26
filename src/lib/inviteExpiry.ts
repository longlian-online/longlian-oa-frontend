const DATETIME_LOCAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

export function toInviteExpiredAt(value: string, now = new Date()): string | null {
  const matched = DATETIME_LOCAL_PATTERN.exec(value);
  if (!matched) return null;
  const parsed = new Date(
    Number(matched[1]),
    Number(matched[2]) - 1,
    Number(matched[3]),
    Number(matched[4]),
    Number(matched[5]),
    0,
    0,
  );
  if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= now.getTime()) return null;
  return `${matched[1]}-${matched[2]}-${matched[3]} ${matched[4]}:${matched[5]}:00`;
}
